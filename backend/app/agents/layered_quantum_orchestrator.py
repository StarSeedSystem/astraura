"""
Chat en capas de Astraura (`POST /api/chat/layered`) — versión real (2026-10-09).

QUÉ HACE: responde a la pregunta en cuatro capas que se ejecutan de verdad y
emite, capa a capa, lo que cada una hizo y cuánto tardó:

  1. Reflejo   · Needle 3 decide qué fuentes hacen falta (memoria, web).
  2. Fuentes   · búsqueda real en la memoria de StarSeed (recuerdos, documentos,
                 conceptos) y, si el reflejo la pidió, en la web.
  3. Palabra   · BitNet b1.58 escribe la respuesta con ese contexto. Si la
                 pregunta está en español pasa por el puente de idioma
                 (español → inglés → respuesta → español): medido en la Mac,
                 el 2B acierta 3/6 preguntas factuales en español y 5–6/6 con
                 el puente.
  4. Juicio    · Jev (logits de BitNet, ambos órdenes de opciones) estima la
                 probabilidad de que la respuesta conteste bien. Si sale «no»,
                 se reescribe UNA vez con temperatura más baja y se queda la
                 mejor de las dos según el propio Jev.

POR QUÉ: la versión anterior dormía 0,4 s / 0,5 s / 0,3 s en las capas 1, 3 y
4, devolvía «100% Validada» y «Soberano» sin validar nada, inventaba un
`trust_score` de 98/92 para las fuentes, publicaba la ciudad del usuario y…
nunca devolvía una respuesta.

Tipos de evento compatibles: layered_phase_start · layered_phase_progress ·
layered_pipeline_complete (ahora con `answer`), más `error` si el turnero no
admite el turno.
"""

import asyncio
import re
import time
from typing import Dict, Any, List, Optional, AsyncGenerator, Tuple

from ..tools.browser_tool import browser_agent

#: Herramientas que el reflejo (Needle 3) puede elegir. No se ejecuta nada que
#: no esté aquí.
HERRAMIENTAS_REFLEJO: List[Dict[str, Any]] = [
    {
        "name": "buscar_memoria",
        "description": "Buscar en la memoria y los documentos de StarSeed lo que el usuario o el sistema guardaron.",
        "parameters": {"type": "object", "properties": {
            "consulta": {"type": "string", "description": "qué buscar"}}, "required": ["consulta"]},
    },
    {
        "name": "buscar_web",
        "description": "Buscar en internet información actual o externa: noticias, datos recientes, documentación.",
        "parameters": {"type": "object", "properties": {
            "consulta": {"type": "string", "description": "qué buscar"}}, "required": ["consulta"]},
    },
]

_PALABRAS_ES = {
    "el", "la", "los", "las", "de", "del", "que", "qué", "y", "en", "por", "para", "con",
    "una", "un", "es", "son", "cuál", "cual", "cómo", "como", "dónde", "donde", "cuántos",
    "cuántas", "cuanto", "quién", "quien", "porque", "también", "pero", "más", "mi", "tu",
    "hola", "dime", "explica", "capital", "año", "qué", "está", "hay",
}
_PALABRAS_EN = {
    "the", "of", "and", "what", "which", "how", "where", "who", "is", "are", "does", "do",
    "in", "to", "for", "with", "an", "why", "when", "explain", "tell", "capital", "year",
}

SISTEMA_ES = ("Eres Astraura, la inteligencia de la sociedad StarSeed. Responde en español, "
              "de forma breve, exacta y directa. Si no lo sabes, dilo.")
SISTEMA_EN = ("You are Astraura, the intelligence of the StarSeed society. Answer in English, "
              "briefly, accurately and directly. If you do not know, say so.")
# Traducción por POCOS EJEMPLOS sobre `/completion`, no por chat con
# instrucción de sistema. Medido en la Mac (2026-10-09, 6 preguntas): con
# «Translate the user's text…» el 2B CONTESTA la pregunta en vez de traducirla
# en 5 de 6 («The capital of France is Paris.», «Kenia está en … América»);
# con dos ejemplos y corte en el salto de línea traduce bien 6 de 6.
POCOS_A_INGLES = ("Spanish: ¿Dónde está la estación de tren?\nEnglish: Where is the train station?\n\n"
                  "Spanish: ¿Cuánto cuesta este libro?\nEnglish: How much does this book cost?\n\n"
                  "Spanish: {t}\nEnglish:")
POCOS_A_ESPANOL = ("English: The train station is next to the river.\nSpanish: La estación de tren está junto al río.\n\n"
                   "English: This book costs ten euros.\nSpanish: Este libro cuesta diez euros.\n\n"
                   "English: {t}\nSpanish:")


def es_espanol(texto: str) -> bool:
    """PURA. ¿El texto está (probablemente) en español? Signos ¿¡ñ o más
    palabras frecuentes del español que del inglés."""
    t = (texto or "").lower()
    if not t.strip():
        return False
    if any(c in t for c in "¿¡ñ"):
        return True
    palabras = re.findall(r"[a-záéíóúüñ]+", t)
    es = sum(1 for p in palabras if p in _PALABRAS_ES)
    en = sum(1 for p in palabras if p in _PALABRAS_EN)
    if any(c in t for c in "áéíóú"):
        es += 1
    return es > en


def fuentes_elegidas(decision: Optional[Dict[str, Any]], prompt: str,
                     prefs: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """PURA. Traduce la decisión de Needle 3 (o su ausencia) a qué buscar.

    La memoria local se consulta SIEMPRE (es barata y es de Alex); la web solo
    si el reflejo la pidió o las preferencias la fuerzan (`web: true` o
    profundidad «exhaustive»/«academic»). Nunca inventa una decisión: si Needle
    no está, `motivo` lo dice.
    """
    prefs = prefs or {}
    out = {"memoria": prompt, "web": None, "motivo": ""}
    llamadas = []
    if isinstance(decision, dict) and decision.get("ok"):
        llamadas = [l for l in (decision.get("llamadas") or []) if isinstance(l, dict)]
        out["motivo"] = "decidido por Needle 3" if llamadas else "Needle 3: no hace falta buscar fuera"
    else:
        err = (decision or {}).get("error") if isinstance(decision, dict) else None
        out["motivo"] = f"Needle 3 no disponible ({err})" if err else "Needle 3 no disponible"
    for l in llamadas:
        consulta = str((l.get("argumentos") or {}).get("consulta") or "").strip() or prompt
        if l.get("nombre") == "buscar_memoria":
            out["memoria"] = consulta
        elif l.get("nombre") == "buscar_web":
            out["web"] = consulta
    forzar = prefs.get("web") is True or prefs.get("research_depth") in ("exhaustive", "academic")
    if out["web"] is None and forzar:
        out["web"] = prompt
        out["motivo"] += " · web forzada por preferencias"
    if prefs.get("web") is False:
        out["web"] = None
    return out


def veredicto(p_si: Optional[float]) -> str:
    """PURA. Lectura honesta de la probabilidad del juez."""
    if p_si is None:
        return "sin juicio"
    return "aprobada" if p_si >= 0.5 else "dudosa"


async def _generar(prompt: str, sistema: str, contexto: Optional[List[str]] = None,
                   max_tokens: int = 256, temperatura: float = 0.3) -> Tuple[str, str]:
    """Texto completo de una generación real + el motor que la sirvió
    (`bitnet-native` | `ollama` | `reasoner` = plantilla)."""
    from ..engine.bitnet_engine import bitnet_engine
    meta: Dict[str, Any] = {}
    partes: List[str] = []
    async for tok in bitnet_engine.generate_stream(
        prompt=prompt, system_prompt=sistema, context_chunks=list(contexto or []),
        max_tokens=max_tokens, temperature=temperatura, meta=meta, priority="interactive",
    ):
        partes.append(tok)
    return "".join(partes).strip(), str(meta.get("source") or "desconocido")


def _post_completion(base: str, cuerpo: Dict[str, Any], timeout: float) -> Dict[str, Any]:
    import json
    import urllib.request
    req = urllib.request.Request(f"{base}/completion", data=json.dumps(cuerpo).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


async def _traducir(texto: str, a_ingles: bool) -> Tuple[str, str]:
    """Traducción real con BitNet (pocos ejemplos, temperatura 0). Devuelve
    ("", motivo) si BitNet no está listo: entonces no hay puente, y se dice."""
    from ..engine.bitnet_cpp_manager import bitnet_cpp_manager
    try:
        base = await asyncio.to_thread(bitnet_cpp_manager.ensure_server, 0.0, "interactive")
    except Exception as exc:
        return "", f"sin-bitnet ({type(exc).__name__})"
    if not base or not bitnet_cpp_manager.server_ready("interactive"):
        return "", "sin-bitnet"
    limpio = " ".join((texto or "").split())[:600]
    cuerpo = {"prompt": (POCOS_A_INGLES if a_ingles else POCOS_A_ESPANOL).format(t=limpio),
              "n_predict": min(320, 48 + len(limpio) // 2), "temperature": 0,
              "stop": ["\n"], "cache_prompt": True}
    try:
        r = await asyncio.to_thread(_post_completion, base, cuerpo, 90.0)
    except Exception as exc:
        return "", f"fallo ({type(exc).__name__})"
    return _limpiar_traduccion(str(r.get("content") or "")), "bitnet-native"


def _limpiar_traduccion(texto: str) -> str:
    """Quita comillas y prefijos tipo «Translation:» que el 2B a veces añade."""
    t = (texto or "").strip().strip('"“”«»').strip()
    t = re.sub(r"^(translation|traducción|traduccion)\s*:\s*", "", t, flags=re.I)
    return t.strip()


async def _juzgar(pregunta: str, respuesta: str, en_ingles: bool) -> Dict[str, Any]:
    """Jev: P(«sí, contesta bien») con los logits de BitNet en los dos órdenes.

    Devuelve {p_si, ms, motor} o {p_si: None, motivo} si BitNet no está listo.
    Se llama DENTRO del turno del chat (no pasa por /api/jev/decidir, que
    pediría otro turno al turnero).
    """
    from ..api import jev as J
    from ..engine.bitnet_cpp_manager import bitnet_cpp_manager
    try:
        base = await asyncio.to_thread(bitnet_cpp_manager.ensure_server, 0.0, "interactive")
    except Exception as exc:
        return {"p_si": None, "motivo": f"BitNet no listo ({type(exc).__name__})"}
    if not base:
        return {"p_si": None, "motivo": "BitNet no listo para juzgar"}
    if en_ingles:
        q = "Does the answer correctly and directly answer the question?"
        opciones = ["yes", "no"]
        ctx = f"Question: {pregunta.strip()[:500]}\nAnswer: {respuesta.strip()[:700]}"
    else:
        q = "¿La respuesta contesta correctamente y de forma directa a la pregunta?"
        opciones = ["sí", "no"]
        ctx = f"Pregunta: {pregunta.strip()[:500]}\nRespuesta: {respuesta.strip()[:700]}"
    letras = J._letras(len(opciones))
    t0 = time.monotonic()
    por_orden = []
    for orden in ([opciones, list(reversed(opciones))] if J.SIMETRICO else [opciones]):
        try:
            cruda = await asyncio.to_thread(J._completar, base, J._prompt(q, orden, ctx), J.TIMEOUT_S)
        except Exception as exc:
            return {"p_si": None, "motivo": f"juez sin respuesta ({type(exc).__name__})"}
        probs = J._probabilidades(cruda, letras)
        if not probs:
            return {"p_si": None, "motivo": "juez sin logits utilizables"}
        por_orden.append((orden, probs))
    media = J.probabilidades_simetricas(por_orden)
    if not media:
        return {"p_si": None, "motivo": "juez sin logits utilizables"}
    return {"p_si": round(float(media.get(opciones[0], 0.0)), 3),
            "ms": int((time.monotonic() - t0) * 1000), "motor": "bitnet-nprobs",
            "simetrico": bool(J.SIMETRICO)}


def _bitnet_congelado() -> bool:
    """¿El guardia de memoria tiene el llama-server en pausa (SIGSTOP)?"""
    try:
        from ..engine.bitnet_cpp_manager import congelado_por_guardia
        return bool(congelado_por_guardia())
    except Exception:
        return False


def _seg(t0: float) -> float:
    return round(time.perf_counter() - t0, 2)


def _inicio(fase: int, nombre: str, agente: str, descripcion: str) -> Dict[str, Any]:
    return {"type": "layered_phase_start", "phase": fase, "name": nombre, "agent": agente,
            "description": descripcion, "timestamp": time.time()}


class LayeredQuantumOrchestrator:
    """Reflejo → Fuentes → Palabra → Juicio, todo medido."""

    def __init__(self):
        self.name = "Chat en capas (reflejo · fuentes · palabra · juicio)"

    async def _responder(self, prompt: str, contexto: List[str], puente: bool,
                         temperatura: float, aviso: str = "") -> Dict[str, Any]:
        """Una respuesta completa (con o sin puente de idioma) y sus pasos medidos."""
        pasos: List[Dict[str, Any]] = []
        pregunta_en = None
        if puente:
            t = time.perf_counter()
            pregunta_en, motor_t = await _traducir(prompt, a_ingles=True)
            pasos.append({"paso": "traducir la pregunta al inglés", "motor": motor_t, "s": _seg(t)})
            if not pregunta_en:
                puente, pregunta_en = False, None  # sin traducción real no hay puente
        t = time.perf_counter()
        if puente:
            respuesta_en, motor = await _generar(pregunta_en, (SISTEMA_EN + " " + aviso).strip(), contexto, 256, temperatura)
            pasos.append({"paso": "responder en inglés", "motor": motor, "s": _seg(t)})
            t = time.perf_counter()
            traducida, motor_t = await _traducir(respuesta_en, a_ingles=False)
            respuesta = traducida or respuesta_en
            pasos.append({"paso": "traducir la respuesta al español" + ("" if traducida else " (falló: queda en inglés)"),
                          "motor": motor_t, "s": _seg(t)})
        else:
            respuesta_en = None
            respuesta, motor = await _generar(prompt, (SISTEMA_ES + " " + aviso).strip(), contexto, 256, temperatura)
            pasos.append({"paso": "responder", "motor": motor, "s": _seg(t)})
        return {"respuesta": respuesta, "respuesta_en": respuesta_en, "pregunta_en": pregunta_en,
                "motor": motor, "puente": puente, "pasos": pasos, "temperatura": temperatura}

    async def execute_phased_layered_pipeline(
        self,
        prompt: str,
        preferences: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        from ..core import turnero
        from ..core.turnero import Ocupado

        prefs = preferences or {}
        try:
            max_phases = max(1, min(4, int(prefs.get("layered_phases", 4) or 4)))
        except (TypeError, ValueError):
            max_phases = 4
        prompt = (prompt or "").strip()
        t_total = time.perf_counter()
        tiempos: Dict[str, float] = {}

        # ── Capa 1 · Reflejo ─────────────────────────────────────────────────
        t1 = time.perf_counter()
        yield _inicio(1, "Capa 1: Reflejo (Needle 3)", "Needle 3",
                      "Decide si hace falta buscar en la memoria o en la web antes de responder.")
        try:
            from ..core.needle3_engine import needle3_engine
            decision = await asyncio.wait_for(
                asyncio.to_thread(needle3_engine.decidir, prompt, HERRAMIENTAS_REFLEJO, None, 2), timeout=30)
        except asyncio.TimeoutError:
            decision = {"ok": False, "error": "sin respuesta en 30 s"}
        except Exception as exc:
            decision = {"ok": False, "error": type(exc).__name__}
        plan = fuentes_elegidas(decision, prompt, prefs)
        tiempos["reflejo"] = _seg(t1)
        yield {"type": "layered_phase_progress", "phase": 1, "data": {
            "status": "completed" if decision.get("ok") else "degraded",
            "decision": plan["motivo"], "web": plan["web"] is not None,
            "needle_ms": decision.get("ms"), "confidence": decision.get("confianza"),
            "duration_s": tiempos["reflejo"]}}

        # ── Capa 2 · Fuentes ─────────────────────────────────────────────────
        contexto: List[str] = []
        verifiable_sources: List[Dict[str, Any]] = []
        memoria_por_fuente: Dict[str, int] = {}
        n_memoria = 0
        if max_phases >= 2:
            t2 = time.perf_counter()
            yield _inicio(2, "Capa 2: Fuentes (memoria + web)", "Mnemosyne & Hermes",
                          "Busca en la memoria de StarSeed y, si el reflejo lo pidió, en la web.")
            estado_mem = "ok"
            try:
                from .orchestrator import AstrauraOrchestrator
                items = await asyncio.to_thread(
                    lambda: AstrauraOrchestrator.gather_context_items(plan["memoria"], solo_verificadas=True))
            except Exception as exc:
                items, estado_mem = [], f"fallo ({type(exc).__name__})"
            for it in items or []:
                linea = it.get("line") if isinstance(it, dict) else None
                if not linea:
                    continue
                n_memoria += 1
                fuente = str(it.get("source") or "otro")
                memoria_por_fuente[fuente] = memoria_por_fuente.get(fuente, 0) + 1
                if len(contexto) < 6:
                    contexto.append(linea)

            estado_web = "no pedida"
            if plan["web"]:
                profundidad = prefs.get("research_depth", "standard")
                n = 2 if profundidad == "rapid" else (4 if profundidad == "standard" else 8)
                try:
                    res = await asyncio.wait_for(browser_agent.search_web(plan["web"], num_results=n), timeout=15)
                    for r in (res or {}).get("results", [])[:n]:
                        url = str(r.get("url") or "")
                        if not url:
                            continue
                        verifiable_sources.append({
                            "title": r.get("title"), "url": url,
                            "snippet": str(r.get("snippet") or "")[:180],
                        })
                    estado_web = f"{len(verifiable_sources)} resultados"
                    if (res or {}).get("air_gap") or (res or {}).get("blocked"):
                        estado_web = "bloqueada (modo sin red)"
                except asyncio.TimeoutError:
                    estado_web = "tiempo agotado (15 s)"
                except Exception as exc:
                    estado_web = f"fallo ({type(exc).__name__})"
                for s in verifiable_sources[:3]:
                    if s.get("snippet"):
                        contexto.append(f"{s.get('title') or s['url']}: {s['snippet']}")
            tiempos["fuentes"] = _seg(t2)
            yield {"type": "layered_phase_progress", "phase": 2, "data": {
                "status": "completed" if estado_mem == "ok" else "degraded",
                "memory": estado_mem, "memory_items": n_memoria, "memory_by_source": memoria_por_fuente,
                "web": estado_web, "sources_found": len(verifiable_sources),
                "verifiable_sources": verifiable_sources, "duration_s": tiempos["fuentes"]}}

        # ── Capas 3 y 4 · Palabra y Juicio (un solo turno del BitNet) ───────
        mejor: Optional[Dict[str, Any]] = None
        juicio: Dict[str, Any] = {"p_si": None, "motivo": "capa 4 no ejecutada"}
        reescrita = False
        congelado = _bitnet_congelado()
        if max_phases >= 3:
            puente = es_espanol(prompt) and prefs.get("puente_idioma", True) is not False
            try:
                async with turnero.turno(tipo="chat"):
                    t3 = time.perf_counter()
                    yield _inicio(3, "Capa 3: Palabra (BitNet b1.58)", "Logos (BitNet 1.58)",
                                  "Escribe la respuesta con el contexto reunido"
                                  + (" pasando por el puente de idioma español → inglés → español." if puente else "."))
                    mejor = await self._responder(prompt, contexto, puente, 0.2)
                    tiempos["palabra"] = _seg(t3)
                    yield {"type": "layered_phase_progress", "phase": 3, "data": {
                        "status": "completed" if mejor["respuesta"] else "empty",
                        "engine": mejor["motor"],
                        "engine_is_template": mejor["motor"] == "reasoner",
                        "bitnet_frozen_by_guard": congelado,
                        "language_bridge": mejor["puente"], "question_en": mejor["pregunta_en"],
                        "answer": mejor["respuesta"], "answer_en": mejor["respuesta_en"],
                        "steps": mejor["pasos"], "duration_s": tiempos["palabra"]}}

                    if max_phases >= 4 and mejor["respuesta"]:
                        t4 = time.perf_counter()
                        yield _inicio(4, "Capa 4: Juicio (Jev sobre BitNet)", "Jev",
                                      "Estima con los logits de BitNet si la respuesta contesta bien; "
                                      "si sale dudosa, la reescribe una vez y se queda la mejor.")
                        q_j = mejor["pregunta_en"] if mejor["puente"] else prompt
                        a_j = mejor["respuesta_en"] if mejor["puente"] else mejor["respuesta"]
                        juicio = await _juzgar(q_j, a_j, en_ingles=mejor["puente"])
                        intentos = int(prefs.get("max_reintentos", 1) or 0)
                        if juicio.get("p_si") is not None and juicio["p_si"] < 0.5 and intentos > 0:
                            otra = await self._responder(
                                prompt, contexto, puente, 0.7,
                                aviso="Think carefully: a previous answer may have been wrong." if puente
                                else "Piensa con cuidado: una respuesta anterior podía ser incorrecta.")
                            if otra["respuesta"]:
                                q2 = otra["pregunta_en"] if otra["puente"] else prompt
                                a2 = otra["respuesta_en"] if otra["puente"] else otra["respuesta"]
                                juicio2 = await _juzgar(q2, a2, en_ingles=otra["puente"])
                                reescrita = True
                                if (juicio2.get("p_si") or 0.0) > juicio["p_si"]:
                                    juicio_previo = juicio
                                    mejor, juicio = otra, juicio2
                                    juicio["previo_p_si"] = juicio_previo.get("p_si")
                                else:
                                    juicio["reescritura_p_si"] = juicio2.get("p_si")
                        tiempos["juicio"] = _seg(t4)
                        yield {"type": "layered_phase_progress", "phase": 4, "data": {
                            "status": "completed" if juicio.get("p_si") is not None else "degraded",
                            "p_correct": juicio.get("p_si"), "verdict": veredicto(juicio.get("p_si")),
                            "reason": juicio.get("motivo"), "rewritten": reescrita,
                            "kept": "reescrita" if reescrita and "previo_p_si" in juicio else "original",
                            "judge_ms": juicio.get("ms"), "duration_s": tiempos["juicio"]}}
            except Ocupado as oc:
                yield {"type": "error", "ocupado": True, "motivo": oc.motivo,
                       "reintentar_en_s": oc.reintentar_en_s, "en_cola": oc.en_cola}
                return

        tiempos["total"] = _seg(t_total)
        yield {
            "type": "layered_pipeline_complete",
            "total_phases_executed": max_phases,
            "answer": (mejor or {}).get("respuesta"),
            "answer_en": (mejor or {}).get("respuesta_en"),
            "engine": (mejor or {}).get("motor"),
            "language_bridge": bool((mejor or {}).get("puente")),
            "judge": {"p_correct": juicio.get("p_si"), "verdict": veredicto(juicio.get("p_si")),
                      "reason": juicio.get("motivo"), "rewritten": reescrita},
            "memory_items": n_memoria,
            "verifiable_sources": verifiable_sources,
            "bitnet_frozen_by_guard": congelado,
            "timings_s": tiempos,
        }


layered_quantum_orchestrator = LayeredQuantumOrchestrator()
