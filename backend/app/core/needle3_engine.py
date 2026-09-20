"""
Needle 3 · motor oficial de Cactus (paquete `cactus-needle`) para StarSeed OS / Astraura.

(2026-09-20) Needle 2 sigue vivo en `needle_engine.py` con su implementación C99 (`nd_dump`),
que es la que corre en el ESP32-S3. Needle 3 (121M parámetros, CQ2 a 2,125 bits/peso,
`needle3.cact` de 35 MB) cambia de arquitectura (Laddered SAN) y NO lo entiende ese motor:
aquí se usa el motor oficial, que trae un engine por plataforma (macos-arm64, linux-x64,
wasm, android, ios). Medido en la Mac de Alex: carga 3,9 s, 0,12 s por turno, prefill
1.759 tok/s, decode 637 tok/s, 127 MB de RAM pico, tool calling en español, confianza
calibrada (0,59–0,72). En el contenedor de nube (2 CPU): 0,2–0,3 s por turno, 22 MB RSS.

Regla de la casa: el motor DECIDE (qué herramienta, con qué argumentos, con qué
confianza); no ejecuta nada del OS. Las herramientas llegan como esquemas JSON y vuelven
como llamadas propuestas; quien ejecuta es el OS, con su propio guardián.
"""
import inspect
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

os.environ.setdefault("NEEDLE_TELEMETRY", "0")
os.environ.setdefault("DO_NOT_TRACK", "1")

_TIPOS = {"string": str, "integer": int, "number": float, "boolean": bool, "array": list, "object": dict}


def _funcion_desde_esquema(esquema: Dict[str, Any]):
    """Convierte un esquema JSON de herramienta en una función que Needle sabe leer.

    La función NO hace nada: devuelve la llamada propuesta (nombre + argumentos) para que
    el OS decida si la ejecuta. `needle.build_schema` lee la firma y el docstring."""
    nombre = str(esquema.get("name") or "herramienta")
    params = (esquema.get("parameters") or {}).get("properties") or {}
    obligatorios = set((esquema.get("parameters") or {}).get("required") or [])
    parametros = []
    anotaciones = {}
    for pnombre, pdef in params.items():
        tipo = _TIPOS.get(str((pdef or {}).get("type") or "string"), str)
        anotaciones[pnombre] = tipo
        parametros.append(inspect.Parameter(
            pnombre, inspect.Parameter.KEYWORD_ONLY, annotation=tipo,
            default=inspect.Parameter.empty if pnombre in obligatorios else None))

    def propuesta(**kw):
        return {"_llamada": nombre, "argumentos": kw}

    propuesta.__name__ = nombre
    propuesta.__qualname__ = nombre
    propuesta.__doc__ = str(esquema.get("description") or nombre)
    propuesta.__signature__ = inspect.Signature(parametros)
    propuesta.__annotations__ = anotaciones
    return propuesta


class Needle3Engine:
    """Motor Needle 3 con carga perezosa y caché de agentes por catálogo de herramientas."""

    def __init__(self, workspace_path: Optional[str] = None):
        raiz = Path(workspace_path) if workspace_path else Path(__file__).resolve().parents[3]
        self.data_dir = raiz / "data" / "needle"
        self.pesos = self.data_dir / "needle3.cact"
        self._needle = None
        self._agentes: Dict[str, Any] = {}
        self.error: Optional[str] = None
        self.cargado_en: Optional[float] = None

    # ── estado ────────────────────────────────────────────────────────────
    def disponible(self) -> bool:
        try:
            import needle  # noqa: F401
            return True
        except Exception as e:  # paquete ausente
            self.error = "cactus-needle no instalado: %s" % e
            return False

    def version(self) -> Dict[str, Any]:
        fuera = {"paquete": None, "pesos": str(self.pesos) if self.pesos.exists() else None,
                 "pesos_mb": round(self.pesos.stat().st_size / 1e6, 1) if self.pesos.exists() else None,
                 "pesos_fecha": time.strftime("%Y-%m-%d %H:%M", time.localtime(self.pesos.stat().st_mtime)) if self.pesos.exists() else None}
        try:
            from importlib.metadata import version as _v
            fuera["paquete"] = _v("cactus-needle")
        except Exception:
            pass
        return fuera

    def status(self) -> Dict[str, Any]:
        return {"motor": "needle3", "disponible": self.disponible(), "cargado": self._needle is not None,
                "agentes_en_cache": len(self._agentes), "error": self.error, **self.version()}

    # ── decisión ──────────────────────────────────────────────────────────
    def _agente(self, esquemas: List[Dict[str, Any]], sistema: Optional[str]):
        import needle
        clave = "|".join(sorted(str(e.get("name")) for e in esquemas)) + "||" + (sistema or "")
        if clave not in self._agentes:
            herramientas = [needle.tool(_funcion_desde_esquema(e)) for e in esquemas]
            kw = {"tools": herramientas}
            if sistema:
                kw["system"] = sistema
            # OJO: pasar `weights=` explícito hace que el paquete los trate como pesos
            # AJUSTADOS y devuelva confianza None (medido). Los pesos oficiales viven en
            # ~/.cache/cactus-needle/v3/<versión>/ y el paquete los encuentra solo; la copia
            # de data/needle/needle3.cact es para desplegar a otros medios. NEEDLE3_WEIGHTS
            # fuerza unos pesos concretos (un ajuste fino propio, por ejemplo).
            if os.environ.get("NEEDLE3_WEIGHTS"):
                kw["weights"] = os.environ["NEEDLE3_WEIGHTS"]
            t0 = time.time()
            self._agentes[clave] = needle.Needle(**kw)
            self.cargado_en = time.time() - t0
            if len(self._agentes) > 32:          # catálogos distintos: no crecer sin fin
                self._agentes.pop(next(iter(self._agentes)))
        return self._agentes[clave]

    def decidir(self, consulta: str, esquemas: List[Dict[str, Any]], sistema: Optional[str] = None,
                max_pasos: int = 4) -> Dict[str, Any]:
        """{llamadas: [{nombre, argumentos}], confianza, razonamiento, tipo, ms, …} sin ejecutar nada."""
        if not self.disponible():
            return {"ok": False, "error": self.error, "motor": "needle3"}
        try:
            agente = self._agente(esquemas or [], sistema)
            # Cada decisión empieza limpia: el agente guarda historial entre `run` y el
            # contexto se colaba («busca … permacultura» heredaba «Café» del turno anterior).
            try:
                agente.reset()
            except Exception:
                pass
            t0 = time.time()
            r = agente.run(consulta, max_steps=max_pasos)
            llamadas = [x for x in (r.get("results") or []) if isinstance(x, dict) and x.get("_llamada")]
            return {
                "ok": bool(r.get("success", True)), "motor": "needle3", "tipo": r.get("type"),
                "llamadas": [{"nombre": x["_llamada"], "argumentos": x.get("argumentos") or {}} for x in llamadas],
                "confianza": r.get("confidence"), "razonamiento": r.get("reasoning"),
                "ms": int((time.time() - t0) * 1000), "prefill_tps": r.get("prefill_tps"),
                "decode_tps": r.get("decode_tps"), "ram_pico_mb": r.get("peak_ram_mb"),
                "error": r.get("error"),
            }
        except Exception as e:
            self.error = str(e)
            return {"ok": False, "error": str(e), "motor": "needle3"}


needle3_engine = Needle3Engine()
