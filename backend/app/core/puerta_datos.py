"""
puerta_datos.py — La puerta de datos del A1 para el backend de Astraura (PDA1011, 2026-10-10)
=============================================================================================

La malla (`astraura_mesh_nodes`) y el ESTADO de los cerebros (cuándo cambió el registro, no su
contenido) van por la puerta de datos del A1 de Oracle, con Supabase de respaldo automático.
Contrato: starseed-os-main/architecture/puerta-datos-a1.md (§4.2 rutas `/v1/malla/nodos` y
`/v1/astraura/estado/*`, §7 fase 1).

Interruptor: `ASTRAURA_PUERTA_DATOS` = `auto` (por defecto) | `apagada` (todo a Supabase como
antes). Sin `PUERTA_DATOS_URL` o sin `PUERTA_DATOS_FICHA_ASTRAURA` (entorno o `~/.starseed/env`)
equivale a apagada. Si la puerta no responde, da 5xx o tarda más de 6 s, quien llama recibe
None/False y va por Supabase; la salud se reintenta con espera creciente (1, 2, 5, 10 min).
Nunca imprime ni registra la URL ni la ficha. Solo biblioteca estándar.
"""
import json
import logging
import os
import threading
import time
import urllib.error
import urllib.request
from typing import Any, Callable, Dict, List, Optional, Tuple

logger = logging.getLogger("astraura.puerta")

ENV_STARSEED = os.path.expanduser("~/.starseed/env")
SALUD_OK_S = 30
ESPERAS_S = (60, 120, 300, 600)
RELEER_ENV_S = 300
AGENTE = "starseed-astraura-puerta/1"
Http = Callable[[str, str, Dict[str, str], Optional[bytes], float], Tuple[int, Any]]


def _http(metodo: str, url: str, cabeceras: Dict[str, str], cuerpo: Optional[bytes], tope: float) -> Tuple[int, Any]:
    req = urllib.request.Request(url, data=cuerpo, method=metodo, headers=dict(cabeceras, **{"User-Agent": AGENTE}))
    try:
        with urllib.request.urlopen(req, timeout=tope) as r:
            texto = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8", "replace") or "null")
        except ValueError:
            return e.code, None


def leer_env(ruta: str = ENV_STARSEED) -> Dict[str, str]:
    datos: Dict[str, str] = {}
    try:
        with open(ruta, encoding="utf-8") as f:
            for linea in f:
                linea = linea.strip()
                if not linea or linea.startswith("#") or "=" not in linea:
                    continue
                if linea.startswith("export "):
                    linea = linea[7:]
                k, v = linea.split("=", 1)
                datos[k.strip()] = v.strip().strip('"').strip("'")
    except OSError:
        pass
    return datos


def url_valida(url: str) -> str:
    """Solo https (o local). Cualquier otra cosa → sin puerta."""
    u = (url or "").strip().rstrip("/")
    if u.startswith("https://") or u.startswith("http://127.0.0.1") or u.startswith("http://localhost"):
        return u
    return ""


class PuertaAstraura:
    def __init__(self, http: Http = _http, ahora: Callable[[], float] = time.time,
                 env: Optional[Callable[[], Dict[str, str]]] = None):
        self.http = http
        self.ahora = ahora
        self._env = env or leer_env
        self._cfg: Tuple[str, str] = ("", "")
        self._cfg_t = -1e18
        self._salud: Optional[Tuple[bool, float]] = None
        self._fallos = 0
        self._espera_hasta = 0.0
        self._cerrojo = threading.Lock()
        self.cuentas = {"puerta": 0, "respaldo": 0, "errores": 0}
        self.ultimo_ok: Optional[float] = None

    # ── configuración ──
    def _config(self) -> Tuple[str, str]:
        t = self.ahora()
        if t - self._cfg_t >= RELEER_ENV_S:
            env = dict(self._env())
            env.update({k: v for k, v in os.environ.items() if k.startswith("PUERTA_DATOS_")})
            self._cfg = (url_valida(env.get("PUERTA_DATOS_URL", "")),
                         env.get("PUERTA_DATOS_FICHA_ASTRAURA", "") or env.get("PUERTA_DATOS_FICHA", ""))
            self._cfg_t = t
        return self._cfg

    def activa(self) -> bool:
        if (os.environ.get("ASTRAURA_PUERTA_DATOS", "auto") or "auto").strip().lower() in ("apagada", "off", "0", "no"):
            return False
        url, ficha = self._config()
        return bool(url and ficha)

    # ── salud con espera creciente ──
    def _anotar(self, ok: bool) -> None:
        t = self.ahora()
        with self._cerrojo:
            self._salud = (ok, t)
            if ok:
                self._fallos = 0
                self._espera_hasta = 0.0
            else:
                self._fallos += 1
                self._espera_hasta = t + ESPERAS_S[min(len(ESPERAS_S) - 1, self._fallos - 1)]

    def disponible(self) -> bool:
        if not self.activa():
            return False
        t = self.ahora()
        if t < self._espera_hasta:
            return False
        if self._salud and self._salud[0] and t - self._salud[1] < SALUD_OK_S:
            return True
        url, _ = self._config()
        try:
            estado, j = self.http("GET", url + "/salud", {}, None, 4.0)
            ok = estado == 200 and isinstance(j, dict) and j.get("ok") is True
        except Exception:  # noqa: BLE001
            ok = False
        self._anotar(ok)
        return ok

    def _pedir(self, metodo: str, ruta: str, cuerpo: Any = None, tope: float = 6.0) -> Tuple[int, Any]:
        url, ficha = self._config()
        cab = {"Accept": "application/json", "Authorization": "Bearer " + ficha}
        datos = None
        if cuerpo is not None:
            cab["Content-Type"] = "application/json"
            datos = json.dumps(cuerpo, ensure_ascii=False).encode("utf-8")
        try:
            estado, j = self.http(metodo, url + ruta, cab, datos, tope)
        except Exception as e:  # noqa: BLE001  (sin la URL: solo el tipo de error)
            self._anotar(False)
            self.cuentas["errores"] += 1
            logger.debug("puerta de datos: %s", type(e).__name__)
            return 0, None
        if estado == 0 or estado >= 500:
            self._anotar(False)
            self.cuentas["errores"] += 1
        return estado, j

    def _hecho(self, ok: bool) -> None:
        if ok:
            self.cuentas["puerta"] += 1
            self.ultimo_ok = self.ahora()

    def respaldo(self) -> None:
        """Quien llama anota que fue por Supabase (para el resumen)."""
        self.cuentas["respaldo"] += 1

    # ── operaciones ──
    def malla_registrar(self, nodo: Dict[str, Any]) -> bool:
        if not self.disponible():
            return False
        estado, _ = self._pedir("POST", "/v1/malla/nodos", {"nodo": nodo})
        ok = 200 <= estado < 300
        self._hecho(ok)
        return ok

    def malla_nodos(self, vivos_s: int) -> Optional[List[Dict[str, Any]]]:
        if not self.disponible():
            return None
        estado, j = self._pedir("GET", "/v1/malla/nodos?vivos_s=%d" % int(vivos_s))
        if estado == 200 and isinstance(j, dict) and isinstance(j.get("nodos"), list):
            self._hecho(True)
            return [n for n in j["nodos"] if isinstance(n, dict)]
        return None

    def estado_poner(self, clave: str, data: Any) -> bool:
        if not self.disponible():
            return False
        estado, _ = self._pedir("PUT", "/v1/astraura/estado/%s" % clave, {"data": data})
        ok = 200 <= estado < 300
        self._hecho(ok)
        return ok

    def estado_leer(self, clave: str) -> Optional[Dict[str, Any]]:
        """{clave, data, updated_at} · {} si la puerta no tiene nada aún · None si no está."""
        if not self.disponible():
            return None
        estado, j = self._pedir("GET", "/v1/astraura/estado/%s" % clave)
        if estado == 200 and isinstance(j, dict):
            self._hecho(True)
            return j
        if estado == 404:
            self._hecho(True)
            return {}
        return None

    def resumen(self) -> Dict[str, Any]:
        return {"activa": self.activa(), "sana": bool(self._salud and self._salud[0]),
                "ultimo_ok": self.ultimo_ok, "fallos_seguidos": self._fallos, **self.cuentas}


puerta = PuertaAstraura()
