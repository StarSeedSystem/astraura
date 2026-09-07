"""Agentes de aprendizaje 1.58 vivos en el backend (Ola 270, 2026-09-07).

Cinco roles sobre el corpus vivo y el BitNet local: Curador (deduplica turnos
del mes), Evaluador (sonda al BitNet SOLO si no está dormido ni cedido: jamás
despierta el motor desde el fondo), Cronista (crónica horaria en español),
Entrenador y Desplegador (en espera de la fábrica QVAC). El PlanificadorAgentes
los ejecuta como tareas asyncio con excepciones contadas, y expone `estado()`
y `procesos()` para las rutas solo-locales `/api/aprendizaje/agentes*`.

Solo stdlib + asyncio. Cada agente NUNCA lanza: sus errores se cuentan y se
guardan en `ultimo_resultado`, porque un fallo de fondo jamás puede tumbar el
backend ni la respuesta en curso del usuario.
"""

import asyncio
import hashlib
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, List, Optional

from .corpus import corpus_vivo

log = logging.getLogger("aprendizaje.agentes")


def _raiz_datos() -> Path:
    """`<repo>/data/aprendizaje` (carpeta madre del corpus)."""
    return Path(__file__).resolve().parents[4] / "data" / "aprendizaje"


def _ahora_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S")


class AgenteAprendizaje:
    """Un agente de fondo con intervalo, contadores y su última ejecución."""

    def __init__(self, id: str, nombre: str, rol: str, intervalo_s: float,
                 funcion: Callable[[], Awaitable[Dict[str, Any]]],
                 retraso_inicial_s: float = 0.0):
        self.id = id
        self.nombre = nombre
        self.rol = rol
        self.intervalo_s = float(intervalo_s)
        self.funcion = funcion
        self.retraso_inicial_s = float(retraso_inicial_s)
        self.activo = True
        self.ultimo_inicio: Optional[str] = None
        self.ultimo_fin: Optional[str] = None
        self.ultimo_resultado: Dict[str, Any] = {}
        self.ejecuciones = 0
        self.errores = 0
        self.proximo: Optional[str] = None

    async def ejecutar(self) -> Dict[str, Any]:
        """Ejecuta la función del agente y contabiliza el resultado."""
        self.ultimo_inicio = _ahora_iso()
        try:
            self.ultimo_resultado = await self.funcion()
        except Exception as e:  # Contado, registrado; jamás propagado.
            self.errores += 1
            self.ultimo_resultado = {"error": str(e)}
            log.warning("agente %s: error: %s", self.id, e)
        self.ultimo_fin = _ahora_iso()
        self.ejecuciones += 1
        self.proximo = time.strftime("%Y-%m-%dT%H:%M:%S",
                                     time.localtime(time.time() + self.intervalo_s))
        return self.ultimo_resultado

    def ficha(self) -> Dict[str, Any]:
        return {
            "id": self.id, "nombre": self.nombre, "rol": self.rol,
            "intervalo_s": self.intervalo_s, "activo": self.activo,
            "ultimo_inicio": self.ultimo_inicio, "ultimo_fin": self.ultimo_fin,
            "ultimo_resultado": self.ultimo_resultado,
            "ejecuciones": self.ejecuciones, "errores": self.errores,
            "proximo": self.proximo,
        }


class PlanificadorAgentes:
    """Planificador asíncrono de los cinco agentes de aprendizaje 1.58."""

    def __init__(self, raiz: Optional[Path] = None, corpus: Any = None):
        # Los artefactos viven junto al corpus (data/aprendizaje).
        self.raiz = Path(raiz) if raiz is not None else _raiz_datos()
        # Inyectable en tests; en producción es el corpus vivo del backend.
        self.corpus = corpus if corpus is not None else corpus_vivo
        self._tareas: Dict[str, asyncio.Task] = {}
        self.agentes: List[AgenteAprendizaje] = [
            AgenteAprendizaje("curador", "Curador", "curación del corpus",
                              30 * 60, self._curador, retraso_inicial_s=60),
            AgenteAprendizaje("evaluador", "Evaluador", "sondas al BitNet local",
                              60 * 60, self._evaluador, retraso_inicial_s=120),
            AgenteAprendizaje("cronista", "Cronista", "crónica horaria",
                              60 * 60, self._cronista, retraso_inicial_s=180),
            AgenteAprendizaje("entrenador", "Entrenador", "entrenamiento LoRA",
                              60 * 60, self._en_espera),
            AgenteAprendizaje("desplegador", "Desplegador", "despliegue de modelos",
                              60 * 60, self._en_espera),
        ]

    def _agente(self, id: str) -> Optional[AgenteAprendizaje]:
        for a in self.agentes:
            if a.id == id:
                return a
        return None

    # --------------------------------------------------------- Ciclo de vida

    async def iniciar(self) -> None:
        """Crea una tarea asyncio por agente activo (arranque escalonado)."""
        # ASTRAURA_AGENTES_158=0 desactiva TODO el enjambre de agentes.
        if os.environ.get("ASTRAURA_AGENTES_158", "1") != "1":
            log.info("agentes 1.58 desactivados por ASTRAURA_AGENTES_158=0")
            return
        for agente in self.agentes:
            if agente.id in self._tareas:
                continue
            self._tareas[agente.id] = asyncio.create_task(self._bucle(agente))
        log.info("planificador de agentes 1.58: %d tareas en marcha", len(self._tareas))

    async def _bucle(self, agente: AgenteAprendizaje) -> None:
        # Retraso inicial escalonado: no coincidir con el arranque del servidor.
        if agente.retraso_inicial_s:
            await asyncio.sleep(agente.retraso_inicial_s)
        while True:
            if agente.activo:
                await agente.ejecutar()
            await asyncio.sleep(agente.intervalo_s)

    def pausar(self, id: str) -> bool:
        a = self._agente(id)
        if a is None:
            return False
        a.activo = False
        return True

    def reanudar(self, id: str) -> bool:
        a = self._agente(id)
        if a is None:
            return False
        a.activo = True
        return True

    async def ejecutar_ahora(self, id: str) -> Optional[Dict[str, Any]]:
        a = self._agente(id)
        if a is None:
            return None
        return await a.ejecutar()

    def estado(self) -> Dict[str, Any]:
        return {
            "agentes": [a.ficha() for a in self.agentes],
            "bitnet": _estado_turno_seguro(),
            "corpus": self.corpus.estado(),
        }

    # ------------------------------------------------------- Rol: Curador

    async def _curador(self) -> Dict[str, Any]:
        """Deduplica turnos idénticos del MES actual (misma personalidad y
        hash de mensajes: conserva el primero) y cuenta los listos para LoRA."""
        raiz_corpus = Path(self.corpus.raiz)
        mes = time.strftime("%Y-%m")
        valoraciones = self.corpus._cargar_valoraciones()
        personalidades: Dict[str, int] = {}
        duplicados = 0
        sin_valorar = 0
        listos: Dict[str, int] = {}
        if raiz_corpus.exists():
            for carpeta in sorted(raiz_corpus.iterdir()):
                if not carpeta.is_dir():
                    continue
                archivo = carpeta / f"{mes}.jsonl"
                if not archivo.exists():
                    continue
                # Solo el mes en curso: reescribir meses pasados es riesgo gratis.
                vistos = set()
                conservados: List[str] = []
                n_mes = 0
                n_train = 0
                with open(archivo, "r", encoding="utf-8") as f:
                    for linea in f:
                        linea = linea.rstrip("\n")
                        if not linea.strip():
                            continue
                        try:
                            r = json.loads(linea)
                        except Exception:
                            conservados.append(linea)  # línea ilegible: se conserva
                            continue
                        huella = self._huella(r)
                        if huella in vistos:
                            duplicados += 1
                            continue  # copia exacta posterior: fuera
                        vistos.add(huella)
                        conservados.append(linea)
                        n_mes += 1
                        val = valoraciones.get(str(r.get("id")))
                        if val is None:
                            val = r.get("meta", {}).get("valoracion")
                        if val is None:
                            sin_valorar += 1
                        if r.get("split") == "train" and not (isinstance(val, int) and val < 0):
                            n_train += 1
                if n_mes:
                    personalidades[carpeta.name] = n_mes
                    listos[carpeta.name] = n_train
                    with open(archivo, "w", encoding="utf-8") as f:
                        for linea in conservados:
                            f.write(linea + "\n")
        informe = {
            "t": _ahora_iso(),
            "personalidades": personalidades,
            "duplicados": duplicados,
            "sin_valorar": sin_valorar,
            "listos_para_entrenar": listos,
        }
        self._escribir_json("curacion.json", informe)
        return informe

    @staticmethod
    def _huella(registro: Dict[str, Any]) -> str:
        """Hash estable de los mensajes (rol+contenido) del turno."""
        mensajes = registro.get("mensajes") or []
        texto = "|".join(f"{m.get('role', '')}:{m.get('content', '')}" for m in mensajes)
        return hashlib.sha256(texto.encode("utf-8")).hexdigest()

    # ------------------------------------------------------ Rol: Evaluador

    # Tres sondas fijas en español: saludo, pregunta sobre StarSeed y orden JSON.
    _SONDAS = [
        "Saluda brevemente al usuario.",
        "¿Qué es StarSeed OS? Respóndelo en una frase.",
        'Responde SOLO con un JSON válido: {"ok": true}',
    ]

    async def _evaluador(self) -> Dict[str, Any]:
        """Sonda el BitNet local SOLO si está despierto y no cedido: el turno
        de memoria manda (Olas 256/262) y el fondo jamás despierta al motor."""
        turno = _estado_turno_seguro()
        if turno.get("dormido") or (turno.get("cedido_hasta_s") or 0) > 0:
            # Omitir sin llamar a cognition: despertarlo es exactamente lo
            # que el turno de memoria existe para evitar.
            resultado = {"t": _ahora_iso(), "omitido": "turno de memoria", "turno": turno}
            self._anexar_jsonl("evaluaciones.jsonl", resultado)
            return resultado
        from .. import cognition  # import perezoso: cognition es pesado
        try:
            from ...personalities import personality_engine
            personalidad = personality_engine.active_personality_id()
        except Exception:
            personalidad = "default"
        latencias: List[float] = []
        json_ok = False
        repeticion = False
        longitudes: List[int] = []
        for prompt in self._SONDAS:
            t0 = time.time()
            r = await cognition.generate(prompt, max_tokens=96)
            latencias.append((time.time() - t0) * 1000.0)
            texto = str((r or {}).get("text") or "")
            longitudes.append(len(texto))
            if "ok" in prompt:
                try:
                    json.loads(texto.strip().strip("`"))
                    json_ok = True
                except Exception:
                    json_ok = False
            frases = [f.strip() for f in texto.split(".") if f.strip()]
            if len(frases) - len(set(frases)) >= 2:  # misma frase 3+ veces
                repeticion = True
        latencia = round(sum(latencias) / max(1, len(latencias)), 1)
        puntuacion = self._puntuar(json_ok, repeticion, latencia, longitudes)
        registro = {
            "t": _ahora_iso(), "personalidad": personalidad,
            "latencia_ms": latencia, "json_ok": json_ok,
            "repeticion": repeticion, "puntuacion": puntuacion,
        }
        self._anexar_jsonl("evaluaciones.jsonl", registro)
        return registro

    @staticmethod
    def _puntuar(json_ok: bool, repeticion: bool, latencia: float,
                 longitudes: List[int]) -> int:
        """0-100: bonifica JSON válido y respuestas no vacías; penaliza
        repetición y latencia alta. Heurística honesta, no métrica exacta."""
        p = 50
        p += 20 if json_ok else -15
        p -= 25 if repeticion else 0
        if latencia <= 2000:
            p += 15
        elif latencia >= 10000:
            p -= 15
        if any(n > 0 for n in longitudes):
            p += 10
        return max(0, min(100, p))

    # ------------------------------------------------------- Rol: Cronista

    async def _cronista(self) -> Dict[str, Any]:
        """Crónica horaria en español: turnos nuevos, evaluación media y
        procesos de fondo activos. Append en cronica.md y en logs.md."""
        estado_corpus = self.corpus.estado()
        personalidades = estado_corpus.get("personalidades", {})
        n_eval, media = self._evaluacion_media_ultima_hora()
        activos = [p["nombre"] for p in self.procesos() if p.get("activo")]
        hora = time.strftime("%Y-%m-%d %H:00")
        lineas = [f"## {hora} — Crónica del enjambre 1.58"]
        for pid, datos in personalidades.items():
            lineas.append(f"- Turnos de «{pid}»: {datos.get('turnos', 0)} "
                          f"(train {datos.get('train', 0)}, val {datos.get('val', 0)})")
        if n_eval:
            lineas.append(f"- Evaluación media de la última hora: {media:.1f}/100 "
                          f"en {n_eval} sondas")
        else:
            lineas.append("- Sin evaluaciones en la última hora")
        lineas.append("- Procesos de fondo activos: "
                      + (", ".join(activos) if activos else "ninguno detectado"))
        bloque = "\n".join(lineas) + "\n\n"
        self.raiz.mkdir(parents=True, exist_ok=True)
        with open(self.raiz / "cronica.md", "a", encoding="utf-8") as f:
            f.write(bloque)
        # Espejo en la memoria raíz del StarSeed si existe (memoria compartida).
        logs = Path(__file__).resolve().parents[4] / "data" / "starseed_memory_root" / "logs.md"
        if logs.exists():
            try:
                with open(logs, "a", encoding="utf-8") as f:
                    f.write(bloque)
            except Exception as e:
                log.warning("cronista: no se pudo anexar a logs.md: %s", e)
        return {"t": _ahora_iso(), "lineas": len(lineas)}

    def _evaluacion_media_ultima_hora(self) -> Any:
        """Media de `puntuacion` de las evaluaciones de la última hora."""
        ruta = self.raiz / "evaluaciones.jsonl"
        if not ruta.exists():
            return 0, 0.0
        corte = time.time() - 3600
        suma = 0.0
        n = 0
        try:
            with open(ruta, "r", encoding="utf-8") as f:
                for linea in f:
                    linea = linea.strip()
                    if not linea:
                        continue
                    try:
                        r = json.loads(linea)
                    except Exception:
                        continue
                    ts = time.mktime(time.strptime(str(r.get("t", "")), "%Y-%m-%dT%H:%M:%S"))
                    if ts >= corte and "puntuacion" in r:
                        suma += float(r["puntuacion"])
                        n += 1
        except Exception:
            pass
        return n, (suma / n if n else 0.0)

    # ----------------------------------- Entrenador y Desplegador (espera)

    async def _en_espera(self) -> Dict[str, Any]:
        """Entrenador y Desplegador esperan la fábrica QVAC: hasta que
        `fabrica.json` declare `{"instalada": true}` no hay nada que hacer."""
        fabrica = self.raiz / "fabrica.json"
        if not fabrica.exists():
            return {"motivo": "fábrica QVAC no instalada"}
        try:
            datos = json.loads(fabrica.read_text(encoding="utf-8"))
        except Exception:
            datos = {}
        if datos.get("instalada"):
            return {"motivo": "pendiente de Ola 271"}
        return {"motivo": "fábrica QVAC no instalada"}

    # ----------------------------------------------------- Utilidades de E/S

    def _escribir_json(self, nombre: str, datos: Dict[str, Any]) -> None:
        try:
            self.raiz.mkdir(parents=True, exist_ok=True)
            with open(self.raiz / nombre, "w", encoding="utf-8") as f:
                json.dump(datos, f, ensure_ascii=False, indent=2)
        except Exception as e:
            log.warning("agentes: no se pudo escribir %s: %s", nombre, e)

    def _anexar_jsonl(self, nombre: str, registro: Dict[str, Any]) -> None:
        try:
            self.raiz.mkdir(parents=True, exist_ok=True)
            with open(self.raiz / nombre, "a", encoding="utf-8") as f:
                f.write(json.dumps(registro, ensure_ascii=False) + "\n")
        except Exception as e:
            log.warning("agentes: no se pudo anexar %s: %s", nombre, e)

    # ----------------------------------------------------- Procesos de fondo

    def procesos(self) -> List[Dict[str, Any]]:
        """Foto de los procesos de fondo del backend (cada uno en try: si un
        motor no expone estado, se informa `activo: None` en vez de fallar)."""
        fichas: List[Dict[str, Any]] = []

        def _ficha(id: str, nombre: str, estado: Any) -> Dict[str, Any]:
            activo: Optional[bool] = None
            ultimo: Optional[str] = None
            detalle: Dict[str, Any] = {}
            if isinstance(estado, dict):
                for clave in ("activo", "running", "en_curso", "ciclo_activo"):
                    if isinstance(estado.get(clave), bool):
                        activo = estado[clave]
                        break
                for clave in ("ultimo", "ultimo_ciclo", "last", "ultimo_evento"):
                    if estado.get(clave):
                        ultimo = str(estado[clave])
                        break
                detalle = estado
            return {"id": id, "nombre": nombre, "activo": activo,
                    "ultimo": ultimo, "detalle": detalle}

        motores = [
            ("imaginacion", "Imaginación intuitiva",
             lambda: __import__("app.core.intuitive_imagination_engine", fromlist=["intuitive_imagination_engine"]).intuitive_imagination_engine.get_status()),
            ("suenos", "Motor de sueños",
             lambda: __import__("app.core.dream_engine", fromlist=["dream_engine"]).dream_engine.get_status()),
            ("enjambre", "Enjambre de agentes",
             lambda: __import__("app.agents.swarm_manager", fromlist=["swarm_manager"]).swarm_manager.get_status()),
            ("director", "Director orquestador",
             lambda: __import__("app.agents.director_orchestrator", fromlist=["director_orchestrator"]).director_orchestrator.get_status()),
            ("learner", "Learner de fondo", _learner_estado),
            ("cognition", "Cognición (BitNet)", lambda: _cognition_stats()),
        ]
        for id, nombre, consulta in motores:
            try:
                fichas.append(_ficha(id, nombre, consulta()))
            except Exception as e:
                # El motor no expone estado comprensible: honestidad ante todo.
                fichas.append({"id": id, "nombre": nombre, "activo": None,
                               "ultimo": None, "detalle": {"error": str(e)}})
        return fichas


def _estado_turno_seguro() -> Dict[str, Any]:
    """`bitnet_cpp_manager.estado_turno()` o {} si el manager falta:
    nunca lanza porque el Estado del Puente depende de esta foto."""
    try:
        from ...engine.bitnet_cpp_manager import bitnet_cpp_manager
        return bitnet_cpp_manager.estado_turno()
    except Exception as e:
        return {"error": str(e)}


def _cognition_stats() -> Dict[str, Any]:
    from .. import cognition
    return cognition.stats()


def _learner_estado() -> Dict[str, Any]:
    """El BackgroundLearner no expone get_status: su estado real son sus
    atributos públicos (is_running + cola). Se traduce, no se inventa."""
    from ...memory.background_learner import background_learner as learner
    for nombre in ("get_status", "stats"):
        fn = getattr(learner, nombre, None)
        if callable(fn):
            return fn()
    return {
        "activo": bool(getattr(learner, "is_running", False)),
        "cola": len(getattr(learner, "message_queue", []) or []),
        "aprendidos": len(getattr(learner, "learned_events_log", []) or []),
    }


# Singleton del backend: compartido por main.py (arranque y rutas /api).
planificador_agentes = PlanificadorAgentes()
