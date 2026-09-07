"""Corpus vivo del aprendizaje continuo de Astraura 1.58 (Ola 268, 2026-09-07).

Captura turnos de chat y generaciones de cognition por personalidad en JSONL
mensual (`<raiz>/<personalidad>/AAAA-MM.jsonl`), con limpieza al estilo Falcon
(sin razonamiento, sin vacíos, rutas de casa a `~/`, corta trazas largas),
filtro de privacidad (correos, teléfonos, tarjetas, tokens, URLs con token),
valoraciones en archivo aparte y exportación de un train.jsonl listo para LoRA.

Solo stdlib. Nunca lanza: los errores se registran en el log y se devuelve
None, porque el corpus es un efecto secundario y JAMÁS debe romper una
respuesta en curso.
"""

import hashlib
import json
import logging
import os
import re
import shutil
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from zlib import crc32

log = logging.getLogger("aprendizaje.corpus")

# Orígenes válidos: de dónde puede nacer un turno del corpus.
ORIGENES = {"chat", "cognition", "subagente", "voz", "mando"}

# Identificador de personalidad seguro para nombre de carpeta.
_RE_PERSONALIDAD = re.compile(r"^[a-z0-9_-]{1,40}$")

# Límite de limpieza Falcon adoptado (2026-09-07): un turno más largo que esto
# se descarta entero, no se recorta: las trazas enormes ruido puro para LoRA.
MAX_CARACTERES = 8000

# Proporción train/val: ~10 % a validación por hash del origen (estable).
_MODULO_VAL = 10

# --- Patrones de privacidad -------------------------------------------------
_RE_CORREO = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
# Tarjeta ANTES que teléfono: una tarjeta también parece un teléfono largo.
_RE_TARJETA = re.compile(r"\b(?:\d[ -]?){13,19}\b")
_RE_TELEFONO = re.compile(r"(?<![\w])\+?\d[\d .-]{7,13}\d(?![\w])")
_RE_TOKEN = re.compile(
    r"(sk-[A-Za-z0-9_\-]{6,}|Bearer\s+[A-Za-z0-9._\-]{6,}|"
    r"nvapi-[A-Za-z0-9_\-]{6,}|AIza[A-Za-z0-9_\-]{6,})"
)
_RE_URL_TOKEN = re.compile(r"(https?://\S*?[?&]token=)[^\s&\"']+")

# Razonamiento incrustado que no debe llegar al entrenamiento.
_RE_THINK = re.compile(r"<think>.*?</think>", re.S | re.I)
_RE_PENSANDO = re.compile(r"^\s*Pensando:.*$", re.M)


def _raiz_por_defecto() -> Path:
    """`<repo>/data/aprendizaje/corpus` (este archivo vive en backend/app/core/...)."""
    return Path(__file__).resolve().parents[4] / "data" / "aprendizaje" / "corpus"


class CorpusVivo:
    """Corpus vivo: un JSONL mensual por personalidad, valoraciones aparte."""

    def __init__(self, raiz: Optional[Path] = None, activo: Optional[bool] = None):
        self.raiz = Path(raiz) if raiz is not None else _raiz_por_defecto()
        # Interruptor general: ASTRAURA_CORPUS=0 desactiva TODA captura.
        if activo is None:
            activo = os.environ.get("ASTRAURA_CORPUS", "1") == "1"
        self.activo = bool(activo)
        self._lock = threading.Lock()
        # Caché de estado(30 s): recorrer todo el corpus en cada consulta no escala.
        self._cache_estado: Optional[Dict[str, Any]] = None
        self._cache_ts = 0.0
        # Carpeta de casa del usuario, para normalizar rutas absolutas a `~/`.
        self._home = os.path.expanduser("~")

    # ------------------------------------------------------------------ API

    def registrar(
        self,
        personalidad: str,
        origen: str,
        mensajes: List[Dict[str, Any]],
        meta: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Añade UN turno limpio al JSONL del mes. Devuelve el id o None."""
        try:
            if not self.activo:
                return None
            if origen not in ORIGENES:
                log.warning("corpus: origen no válido %r", origen)
                return None
            personalidad = self._valida_personalidad(personalidad)
            limpios = self.limpiar_mensajes(mensajes)
            if not limpios:
                return None
            limpios = self.filtrar_privado(limpios)
            hoy = time.strftime("%Y-%m-%d")
            dia = time.strftime("%Y-%m-%d")
            registro = {
                "id": uuid.uuid4().hex[:16],
                "t": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "personalidad": personalidad,
                "origen": origen,
                "split": self._split(origen, personalidad, dia),
                "mensajes": limpios,
                "meta": dict(meta or {}),
            }
            registro["meta"]["valoracion"] = None
            carpeta = self.raiz / personalidad
            with self._lock:
                carpeta.mkdir(parents=True, exist_ok=True)
                with open(carpeta / f"{hoy[:7]}.jsonl", "a", encoding="utf-8") as f:
                    f.write(json.dumps(registro, ensure_ascii=False) + "\n")
            self._cache_estado = None  # invalida el caché de estado
            return registro["id"]
        except Exception as e:  # Nunca rompe la respuesta del usuario.
            log.warning("corpus: error al registrar: %s", e)
            return None

    def _valida_personalidad(self, personalidad: str) -> str:
        p = str(personalidad or "").strip().lower()
        return p if _RE_PERSONALIDAD.match(p) else "default"

    def _split(self, origen: str, personalidad: str, dia: str) -> str:
        """Val estable por origen+personalidad+día (mismo turno, mismo split)."""
        semilla = f"{origen}|{personalidad}|{dia}"
        return "val" if crc32(semilla.encode("utf-8")) % _MODULO_VAL == 0 else "train"

    # ------------------------------------------------------------- Limpieza

    def limpiar_mensajes(self, mensajes: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Limpieza estilo Falcon: sin vacíos, sin razonamiento, rutas → `~/`.

        Un turno con más de MAX_CARACTERES se descarta ENTERO (None signal):
        las trazas gigantes son ruido para LoRA, no contenido.
        """
        limpios: List[Dict[str, str]] = []
        for m in mensajes or []:
            try:
                role = str(m.get("role", "")).strip()
                content = str(m.get("content", "") or "")
                if role not in ("system", "user", "assistant"):
                    continue
                content = _RE_THINK.sub("", content)
                content = _RE_PENSANDO.sub("", content)
                # Normaliza rutas absolutas de la casa del usuario a `~/`.
                if self._home and self._home != "/":
                    content = content.replace(self._home, "~")
                content = content.strip()
                if not content:
                    continue  # mensaje vacío tras limpieza: fuera
                if len(content) > MAX_CARACTERES:
                    # Descarta el TURNO completo, no solo el mensaje: una traza
                    # desbordada deja el turno incoherente para entrenar.
                    log.info("corpus: turno descartado (%d caracteres)", len(content))
                    return []
                limpios.append({"role": role, "content": content})
            except Exception:
                continue
        return limpios

    def filtrar_privado(self, mensajes: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Enmascara correos, teléfonos, tarjetas, tokens y URLs con token."""
        out: List[Dict[str, str]] = []
        redactor_extra = self._redactor_privacy_manager()
        for m in mensajes:
            c = m["content"]
            c = _RE_URL_TOKEN.sub(r"\1<token>", c)
            c = _RE_CORREO.sub("<correo>", c)
            c = _RE_TARJETA.sub("<tarjeta>", c)
            c = _RE_TELEFONO.sub("<telefono>", c)
            c = _RE_TOKEN.sub("<token>", c)
            if redactor_extra is not None:
                try:
                    c = redactor_extra(c)
                except Exception:
                    pass  # el filtro regex de arriba ya aplicó
            out.append({"role": m["role"], "content": c})
        return out

    @staticmethod
    def _redactor_privacy_manager():
        """Si PrivacyManager ofrece un método de redacción, se usa además."""
        try:
            from ..privacy_manager import privacy_manager
            for nombre in ("redact_text", "redactar_texto", "sanitize_text"):
                fn = getattr(privacy_manager, nombre, None)
                if callable(fn):
                    return fn
        except Exception:
            pass
        return None

    # ---------------------------------------------------------- Valoraciones

    def valorar(self, id: str, valoracion: int, nota: str = "") -> bool:
        """Anota la valoración en `valoraciones.jsonl` (append-only).

        No reescribe los JSONL del corpus: los archivos grandes se tocan solo
        al registrar y al exportar. La última valoración de un id gana.
        """
        try:
            if valoracion not in (-1, 0, 1):
                return False
            self.raiz.mkdir(parents=True, exist_ok=True)
            registro = {
                "id": str(id),
                "valoracion": int(valoracion),
                "nota": str(nota or "")[:500],
                "t": time.strftime("%Y-%m-%dT%H:%M:%S"),
            }
            with self._lock:
                with open(self.raiz / "valoraciones.jsonl", "a", encoding="utf-8") as f:
                    f.write(json.dumps(registro, ensure_ascii=False) + "\n")
            self._cache_estado = None
            return True
        except Exception as e:
            log.warning("corpus: error al valorar: %s", e)
            return False

    def _cargar_valoraciones(self) -> Dict[str, int]:
        """Última valoración por id (el archivo es append-only)."""
        vals: Dict[str, int] = {}
        ruta = self.raiz / "valoraciones.jsonl"
        try:
            if ruta.exists():
                with open(ruta, "r", encoding="utf-8") as f:
                    for linea in f:
                        linea = linea.strip()
                        if not linea:
                            continue
                        try:
                            v = json.loads(linea)
                            vals[str(v.get("id"))] = int(v.get("valoracion", 0))
                        except Exception:
                            continue
        except Exception:
            pass
        return vals

    # --------------------------------------- Reescritura segura de un mes

    def leer_mes(self, personalidad: str, mes: str) -> "tuple[List[str], str]":
        """Lee el JSONL del mes bajo el cerrojo y devuelve (líneas, huella).

        La huella es el sha256 del contenido leído: sirve a `reescribir_mes`
        para detectar si el archivo cambió entre la lectura y la escritura
        (Ola 270 · AP5, 2026-09-07: el Curador curaba sin cerrojo y cualquier
        `registrar` concurrente perdía el turno).
        """
        personalidad = self._valida_personalidad(personalidad)
        archivo = self.raiz / personalidad / f"{mes}.jsonl"
        with self._lock:
            try:
                datos = archivo.read_bytes()
            except FileNotFoundError:
                return [], ""
            return (datos.decode("utf-8", errors="replace").splitlines(),
                    hashlib.sha256(datos).hexdigest())

    def reescribir_mes(self, personalidad: str, mes: str, lineas: List[str],
                       huella_previa: str) -> bool:
        """Reescribe el mes de forma ATÓMICA, bajo el cerrojo y sin pérdidas.

        (2026-09-07, Ola 270 · AP5) Si la huella del contenido actual no
        coincide con `huella_previa` (alguien añadió turnos desde la lectura),
        devuelve False SIN tocar nada: el llamador reintenta en otra pasada.
        Si coincide: copia el archivo a `<archivo>.bak` (sobrescribe la copia
        anterior), escribe en `<archivo>.tmp` y hace `os.replace`, de modo que
        un corte a media escritura nunca deja el mes truncado.
        """
        try:
            personalidad = self._valida_personalidad(personalidad)
            archivo = self.raiz / personalidad / f"{mes}.jsonl"
            with self._lock:
                actual = archivo.read_bytes()
                if hashlib.sha256(actual).hexdigest() != huella_previa:
                    log.info("corpus: %s/%s cambió desde la lectura; no se reescribe",
                             personalidad, mes)
                    return False
                shutil.copy2(archivo, archivo.with_suffix(archivo.suffix + ".bak"))
                tmp = archivo.with_suffix(archivo.suffix + ".tmp")
                with open(tmp, "w", encoding="utf-8") as f:
                    for linea in lineas:
                        f.write(linea.rstrip("\n") + "\n")
                os.replace(tmp, archivo)  # atómico en el mismo sistema de ficheros
            self._cache_estado = None  # el mes cambió: invalida la caché
            return True
        except Exception as e:
            log.warning("corpus: error reescribiendo %s/%s: %s", personalidad, mes, e)
            return False

    # ---------------------------------------------------------------- Estado

    def estado(self) -> Dict[str, Any]:
        """Recuento por personalidad. Cachea 30 s: recorrer todo el corpus es caro."""
        try:
            ahora = time.time()
            if self._cache_estado is not None and ahora - self._cache_ts < 30.0:
                return self._cache_estado
            personalidades: Dict[str, Dict[str, Any]] = {}
            total = 0
            bytes_tot = 0
            if self.raiz.exists():
                for carpeta in sorted(self.raiz.iterdir()):
                    if not carpeta.is_dir():
                        continue
                    datos = personalidades.setdefault(
                        carpeta.name,
                        {"turnos": 0, "train": 0, "val": 0, "ultimo": ""},
                    )
                    for archivo in sorted(carpeta.glob("*.jsonl")):
                        bytes_tot += archivo.stat().st_size
                        n_archivo = 0
                        with open(archivo, "r", encoding="utf-8") as f:
                            for linea in f:
                                linea = linea.strip()
                                if not linea:
                                    continue
                                try:
                                    r = json.loads(linea)
                                except Exception:
                                    continue
                                n_archivo += 1
                                datos["turnos"] += 1
                                datos[r.get("split", "train")] = datos.get(r.get("split", "train"), 0) + 1
                                t = str(r.get("t") or "")
                                if t > datos.get("ultimo", ""):
                                    datos["ultimo"] = t
                        total += n_archivo
            ruta_val = self.raiz / "valoraciones.jsonl"
            n_val = 0
            if ruta_val.exists():
                bytes_tot += ruta_val.stat().st_size
                with open(ruta_val, "r", encoding="utf-8") as f:
                    n_val = sum(1 for linea in f if linea.strip())
            estado = {
                "activo": self.activo,
                "personalidades": personalidades,
                "total": total,
                "valoraciones": n_val,
                "bytes": bytes_tot,
            }
            self._cache_estado = estado
            self._cache_ts = ahora
            return estado
        except Exception as e:
            log.warning("corpus: error en estado: %s", e)
            return {"activo": self.activo, "personalidades": {}, "total": 0,
                    "valoraciones": 0, "bytes": 0, "error": str(e)}

    # ------------------------------------------------------------ Exportación

    def exportar_train(self, personalidad: str, salida: Path, formato: str = "chatml") -> Dict[str, Any]:
        """Escribe un `train.jsonl` con {"messages": [...]} por línea.

        Solo turnos con split == "train" y valoración >= 0 (sin valorar cuenta
        como neutra). La valoración se fusiona desde `valoraciones.jsonl`.
        """
        try:
            personalidad = self._valida_personalidad(personalidad)
            if formato != "chatml":
                log.info("corpus: formato %r no reconocido, se usa chatml", formato)
            valoraciones = self._cargar_valoraciones()
            salida = Path(salida)
            salida.parent.mkdir(parents=True, exist_ok=True)
            turnos = 0
            carpeta = self.raiz / personalidad
            with self._lock, open(salida, "w", encoding="utf-8") as out:
                if carpeta.is_dir():
                    for archivo in sorted(carpeta.glob("*.jsonl")):
                        with open(archivo, "r", encoding="utf-8") as f:
                            for linea in f:
                                linea = linea.strip()
                                if not linea:
                                    continue
                                try:
                                    r = json.loads(linea)
                                except Exception:
                                    continue
                                if r.get("split") != "train":
                                    continue
                                # -1 (u otra negativa) excluye el turno del train.
                                valor = valoraciones.get(str(r.get("id")))
                                if valor is None:
                                    valor = r.get("meta", {}).get("valoracion")
                                if isinstance(valor, int) and valor < 0:
                                    continue
                                out.write(json.dumps(
                                    {"messages": r.get("mensajes", [])},
                                    ensure_ascii=False) + "\n")
                                turnos += 1
            return {"turnos": turnos, "ruta": str(salida)}
        except Exception as e:
            log.warning("corpus: error al exportar train: %s", e)
            return {"turnos": 0, "ruta": str(salida), "error": str(e)}


# Singleton del backend: `<repo>/data/aprendizaje/corpus`.
corpus_vivo = CorpusVivo()
