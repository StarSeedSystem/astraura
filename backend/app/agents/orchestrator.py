import os
import asyncio
import math
import time
import re
from typing import AsyncGenerator, Dict, Any, List, Optional
from ..core.environment import environment_sensor
from ..core.profiler import profiler
from ..engine.bitnet_engine import bitnet_engine
from ..memory.background_learner import background_learner
from ..personalities.personality_engine import personality_engine
from ..cerebros.cerebros_manager import cerebros_manager
from .parallel_branching_engine import parallel_branching_engine
from .reasoner import reasoner
from .memory_agent import memory_agent
from .tool_agent import tool_agent

# ============================================================================
# (Tarea 1 · Sincronización Total de Memoria) — POR QUÉ EXISTE ESTE BLOQUE
# ----------------------------------------------------------------------------
# Antes de esta adenda, lo ÚNICO que el orquestador anteponía a cada turno
# eran hasta 3 recuerdos de Mem0 (`_inject_mem0_memories`, ahora eliminada).
# El memory root de StarSeed (`starseed_memory.search_documents`) ya tenía
# más de diez mil documentos indexados y el grafo de conocimiento
# (`knowledge_graph`) ya tenía nodos y aristas reales — pero NINGUNO de los
# dos se consultaba jamás desde el ciclo de pensamiento. El usuario pedía,
# con toda la razón, que "todo el almacenamiento local se sincronice con la
# IA y las respuestas usen TODAS las memorias con el sistema 1.58 bit": en la
# práctica, Astraura solo recordaba tres frases sueltas por turno, sin
# importar cuánto hubiera indexado en disco.
#
# `gather_context_items` es el motor único que sustituye a eso: reúne
# candidatos de las TRES fuentes (recuerdos, documentos, conceptos), los
# puntúa con el MISMO criterio de relevancia (para poder ordenarlos juntos de
# verdad, no por bloques de fuente), deduplica lo que se repite y recorta el
# resultado a un presupuesto de caracteres configurable. El presupuesto
# importa tanto como el contenido: el motor 1.58b tiene 4096 posiciones de
# contexto (ver `bitnet_engine.py`), así que un contexto gigante y mal
# elegido es PEOR que uno corto y pertinente — desplaza al propio prompt del
# usuario y el modelo puede ni siquiera llegar a leerlo entero.
#
# `_gather_context` (el método que usa el ciclo de pensamiento, más abajo) y
# el endpoint `/api/memory/search` de app/main.py (lo que ve la UI) llaman
# los dos a este mismo motor: si divergieran, la UI podría enseñar un
# contexto que no es el que de verdad recibe el modelo — y esa coherencia es
# exactamente el punto.
# ============================================================================

DEFAULT_CONTEXT_CHAR_BUDGET = 6000
_CANDIDATE_POOL_PER_SOURCE = 10   # candidatos pedidos a CADA fuente antes de rankear/recortar
_DEFAULT_MAX_ITEMS = 12           # tope duro de líneas devueltas, además del presupuesto de caracteres
_MIN_FRAGMENT_CHARS = 40          # por debajo de esto, un fragmento truncado no aporta nada útil
_DOC_FRAGMENT_CHARS = 480         # tamaño objetivo del fragmento de UN documento antes del recorte final
_MEMORY_TEXT_CHARS = 320          # se mantiene el límite que ya usaba _inject_mem0_memories por recuerdo
_CONCEPT_TEXT_CHARS = 220

_TOKEN_RE = re.compile(r"[\wáéíóúñü]+")
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+|\n{2,}")
_MD_NOISE_RE = re.compile(r"[#*`_]|\[\[|\]\]")


def _context_char_budget() -> int:
    """Presupuesto TOTAL de caracteres para el contexto inyectado en cada
    turno, configurable por entorno (ASTRAURA_CONTEXT_CHAR_BUDGET) sin tocar
    código. Por defecto ~6000: suficiente para varios recuerdos/documentos
    bien elegidos sin acercarse a las 4096 posiciones de contexto reales del
    motor 1.58b (que también debe dejar sitio al prompt y a la respuesta)."""
    try:
        val = int(os.environ.get("ASTRAURA_CONTEXT_CHAR_BUDGET", DEFAULT_CONTEXT_CHAR_BUDGET))
        return val if val > 0 else DEFAULT_CONTEXT_CHAR_BUDGET
    except (TypeError, ValueError):
        return DEFAULT_CONTEXT_CHAR_BUDGET


def _tokenize(text: str) -> set:
    return {t for t in _TOKEN_RE.findall((text or "").lower()) if len(t) > 2}


def _relevance_score(query_tokens: set, text: str) -> float:
    """Puntuación de relevancia por solape de tokens (0..1). Es el MISMO
    criterio para las tres fuentes: sin una vara de medir común, «ordenar por
    relevancia y no por fuente» no significaría nada, porque cada motor
    interno puntúa a su manera (cuando puntúa: ni mem0_engine ni
    starseed_memory devuelven el score con el que ordenaron internamente)."""
    if not query_tokens:
        return 0.0
    text_tokens = _tokenize(text)
    if not text_tokens:
        return 0.0
    overlap = len(query_tokens & text_tokens)
    if not overlap:
        return 0.0
    recall = overlap / len(query_tokens)      # cuánto de la pregunta cubre el texto
    precision = overlap / len(text_tokens)    # cuán enfocado (no diluido) está el texto
    return round((recall * 0.7) + (precision * 0.3), 4)


def _clean_truncate(text: str, max_len: int) -> str:
    """Recorta a `max_len` caracteres SIN partir una palabra a la mitad.
    Prefiere cortar al final de una frase; si no hay ninguna razonablemente
    cerca del límite, corta en el último espacio y lo marca con «…»."""
    text = (text or "").strip()
    if max_len <= 0:
        return ""
    if len(text) <= max_len:
        return text
    cut = text[:max_len]
    best_end = -1
    for sep in (". ", "! ", "? ", ".\n", "\n"):
        idx = cut.rfind(sep)
        if idx > best_end:
            best_end = idx
    if best_end > max_len * 0.35:
        return cut[:best_end + 1].strip()
    idx = cut.rfind(" ")
    if idx > 0:
        return cut[:idx].rstrip() + "…"
    return cut.rstrip() + "…"


def _normalize_for_dedup(text: str) -> str:
    """Firma normalizada para detectar «dicen lo mismo» entre fuentes
    distintas: mayúsculas/espacios no deberían producir dos líneas iguales
    en el contexto final."""
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _best_fragment(markdown_text: str, query_tokens: set, max_len: int) -> str:
    """Elige, dentro de un documento potencialmente largo, la FRASE más
    pertinente para la pregunta y expande contexto alrededor mientras quepa
    en `max_len` — en vez de devolver siempre los primeros N caracteres del
    documento (que casi nunca son la parte que responde a la pregunta)."""
    text = (markdown_text or "").strip()
    if not text:
        return ""
    plain = _MD_NOISE_RE.sub("", text)
    sentences = [s.strip() for s in _SENTENCE_SPLIT_RE.split(plain) if s.strip()]
    if not sentences:
        return _clean_truncate(plain, max_len)

    scored = sorted(
        ((_relevance_score(query_tokens, s), i) for i, s in enumerate(sentences)),
        key=lambda x: x[0],
        reverse=True,
    )
    best_score, best_idx = scored[0]

    if best_score <= 0:
        # Nada resuena a nivel de frase (el documento entró por su nombre o
        # sus etiquetas): mejor el inicio del documento que devolver nada.
        return _clean_truncate(" ".join(sentences[:3]), max_len)

    # Expande a frases VECINAS solo si ellas también resuenan con la consulta
    # (si no, "expandir contexto" degenera en rellenar el hueco libre del
    # presupuesto con la frase siguiente aunque no tenga nada que ver).
    window = {best_idx}
    lo, hi = best_idx - 1, best_idx + 1
    cur_len = len(sentences[best_idx])
    while cur_len < max_len and (lo >= 0 or hi < len(sentences)):
        added = False
        if hi < len(sentences) and _relevance_score(query_tokens, sentences[hi]) > 0 and cur_len + len(sentences[hi]) + 1 <= max_len:
            window.add(hi); cur_len += len(sentences[hi]) + 1; hi += 1; added = True
        if lo >= 0 and _relevance_score(query_tokens, sentences[lo]) > 0 and cur_len + len(sentences[lo]) + 1 <= max_len:
            window.add(lo); cur_len += len(sentences[lo]) + 1; lo -= 1; added = True
        if not added:
            break
    fragment = " ".join(sentences[i] for i in sorted(window))
    return _clean_truncate(fragment, max_len)


def _format_context_line(source: str, title: str, text: str) -> str:
    if source == "memory":
        return f"[RECUERDO] {text}"
    if source == "document":
        return f"[DOCUMENTO: {title}] {text}"
    if source == "concept":
        return f"[CONCEPTO] {text}"
    return f"[{source.upper()}] {text}"


# ─────────────────────────────────────────────────────────────────────────────
# (Adenda 165) DECAIMIENTO TEMPORAL EXPONENCIAL — base e
# -----------------------------------------------------------------------------
# De las cuatro ideas del documento de constantes armonicas, esta es la unica
# que se puede aplicar a un modelo YA ENTRENADO sin retocar ni un peso: gobernar
# como se OLVIDA la informacion irrelevante y se preserva la critica.
#
# Y no es numerologia: el decaimiento exponencial `e^(-lambda*t)` es la forma
# matematica CORRECTA de ponderar por recencia — la unica funcion cuya tasa de
# olvido es proporcional a lo que queda, que es como se comporta la memoria
# humana (curva de Ebbinghaus). `e` no se elige por bonito: es la base natural
# de esa familia de funciones.
#
# Se parametriza por VIDA MEDIA en dias (`lambda = ln(2)/vida_media`), que es lo
# que un humano puede razonar: «a los 14 dias, un recuerdo vale la mitad».
#
# SUELO deliberado (`_RECENCY_FLOOR`): un recuerdo antiguo pero MUY pertinente
# no debe desaparecer nunca. Sin suelo, el sistema olvidaria quien eres en
# cuanto pasaran unas semanas — que es justo lo contrario de lo que se busca.
_RECENCY_HALF_LIFE_DAYS = float(os.environ.get("ASTRAURA_RECENCY_HALF_LIFE_DAYS", "14") or 14)
_RECENCY_FLOOR = float(os.environ.get("ASTRAURA_RECENCY_FLOOR", "0.35") or 0.35)


def _recency_factor(ts: Any, now: Optional[float] = None) -> float:
    """
    Factor multiplicativo en [_RECENCY_FLOOR, 1.0] segun la antiguedad de `ts`.
    Sin fecha utilizable devuelve 1.0: no penaliza lo que no sabe fechar
    (inventar una antiguedad seria peor que no aplicar decaimiento).
    """
    try:
        t = float(ts)
    except (TypeError, ValueError):
        return 1.0
    if t <= 0:
        return 1.0
    now = time.time() if now is None else now
    age_days = max(0.0, (now - t) / 86400.0)
    if age_days <= 0:
        return 1.0
    half_life = max(0.5, _RECENCY_HALF_LIFE_DAYS)
    lam = math.log(2.0) / half_life
    decayed = math.exp(-lam * age_days)
    return _RECENCY_FLOOR + (1.0 - _RECENCY_FLOOR) * decayed


class AstrauraOrchestrator:
    """
    Astraura Master Cognitive Orchestrator for StarSeed OS (v4.0 Multi-Personality).
    Coordinates Quantum Multi-Agent Parallel Tree Branching, simultaneous execution
    across all available CPU cores, rich multi-modal code synthesis, and
    dynamic multi-personality deliberation (Single, Multi-Dialogue, Coral Synthesis).
    """
    def __init__(self):
        self.name = "Astraura Core (Multi-Personality Orchestrator)"

    def get_system_prompt_base(self) -> str:
        from ..memory.starseed_memory_engine import starseed_memory
        identity_context = starseed_memory.get_formatted_identity_context()
        return (
            "Eres Astraura, el núcleo cognitivo autónomo de 1.58 bits de StarSeed OS. "
            "Tienes acceso y permisos reales sobre el dispositivo (/Users, /, terminal, sensores, web). "
            "Tu arquitectura se basa en pesos ternarios {-1, 0, 1} y aceleración SIMD/NEON masiva multi-agéntica.\n\n"
            f"{identity_context}\n"
            "Responde de forma inteligente, lúcida, técnica y altamente estructurada, siempre respetando el nombre real y preferencias configuradas del usuario."
        )

    def detect_requested_personalities(self, prompt: str, preferences: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Detects if one or multiple personalities are explicitly mentioned (@persona, names)
        or configured in preferences.
        """
        prefs = preferences or {}
        p_lower = prompt.lower()
        all_profiles = personality_engine.get_all_profiles()
        persona_map = {p["id"]: p for p in all_profiles}
        # Common aliases
        alias_map = {
            "aurora": "aurora",
            "genesis": "aurora",
            "génesis": "aurora",
            "prime": "aurora",
            "astraura": "aurora",
            "hermione": "hermione",
            "hephaestus": "hephaestus",
            "hefestos": "hephaestus",
            "hermes": "hermes",
            "atenea": "atenea",
            "athena": "atenea",
            "oneiros": "oneiros",
            "mnemosyne": "mnemosyne",
            "logos": "logos",
            "kallisti": "kallisti"
        }

        selected_ids = set()

        # 1. From Preferences
        # (OS · Ola 3) Una selección EXPLÍCITA del cliente (OS, invoke API, puente)
        # gana sobre el olfateo de nombres: si el usuario eligió a Hephaestus y
        # menciona a "Hermes" en el texto, responde solo Hephaestus. Se conserva el
        # orden de la lista.
        if prefs.get("selected_personalities") and isinstance(prefs["selected_personalities"], list):
            explicit = []
            for pid in prefs["selected_personalities"]:
                if pid in persona_map and pid not in explicit:
                    explicit.append(pid)
            if explicit:
                return [persona_map[pid] for pid in explicit]

        # 2. From @Mentions in Prompt (e.g. @Aurora @Hephaestus @Atenea)
        mentions = re.findall(r'@([a-zA-Z0-9_áéíóúñ]+)', prompt)
        for m in mentions:
            m_clean = m.lower()
            if m_clean in alias_map:
                selected_ids.add(alias_map[m_clean])
            elif m_clean in persona_map:
                selected_ids.add(m_clean)

        # 3. From Natural Phrases (e.g. "Aurora y Hermes respondan", "Atenea y Hephaestus analicen...")
        for alias, pid in alias_map.items():
            if re.search(r'\b' + re.escape(alias) + r'\b', p_lower):
                selected_ids.add(pid)

        # If user explicitly asked for "todas las personalidades" or "enjambre completo"
        if any(k in p_lower for k in ["todas las personalidades", "todos los agentes", "modo coral", "coro de agentes", "debate grupal"]):
            for p in all_profiles[:6]:
                selected_ids.add(p["id"])

        # Fallback to active persona or default Aurora
        if not selected_ids:
            active_id = prefs.get("personaId") or personality_engine.active_personality_id or "aurora"
            if active_id in persona_map:
                selected_ids.add(active_id)
            else:
                selected_ids.add("aurora")

        return [persona_map[pid] for pid in selected_ids if pid in persona_map]

    @staticmethod
    def _persona_temperature(persona: Optional[Dict[str, Any]], default: float = 0.75) -> float:
        """(OS · Ola 3) Temperatura del preset/custom (clave `temperature`), acotada a [0.1, 1.2]."""
        try:
            t = float((persona or {}).get("temperature", default))
        except (TypeError, ValueError):
            t = default
        return max(0.1, min(1.2, t))

    @staticmethod

    def gather_context_items(
        user_prompt: str,
        budget_chars: Optional[int] = None,
        max_items: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        (Tarea 1) Motor único de recuperación de contexto — recuerdos Mem0 +
        documentos del memory root + conceptos del grafo de conocimiento,
        puntuados con el mismo criterio, deduplicados, ordenados por
        relevancia real (no por fuente) y recortados a un presupuesto de
        caracteres. Ver el bloque de comentarios al principio del archivo
        para el porqué completo.

        Es la ÚNICA implementación de esta lógica en todo el backend: tanto
        `_gather_context` (lo que de verdad recibe el modelo en cada turno)
        como el endpoint `/api/memory/search` de app/main.py (lo que ve la
        UI) llaman aquí — no hay dos caminos que puedan divergir.

        Degrada con elegancia: si una fuente falla o está vacía, las otras
        siguen funcionando. Nunca lanza — en el peor caso devuelve [].
        """
        prompt = (user_prompt or "").strip()
        if len(prompt) < 3:
            return []

        budget = budget_chars if (budget_chars is not None and budget_chars > 0) else _context_char_budget()
        limit_items = max_items if (max_items is not None and max_items > 0) else _DEFAULT_MAX_ITEMS
        query_tokens = _tokenize(prompt)
        candidates: List[Dict[str, Any]] = []

        # --- Fuente 1: Recuerdos (Mem0) --------------------------------------
        try:
            from ..memory.mem0_engine import mem0_engine
            hits = mem0_engine.search_memories(prompt, user_id="alex", limit=_CANDIDATE_POOL_PER_SOURCE) or []
            for m in hits:
                text = " ".join(str(m.get("memory", "")).split()).strip()
                if not text:
                    continue
                score = _relevance_score(query_tokens, text)
                if score <= 0:
                    continue
                # (Adenda 165) Recencia: un recuerdo de hace una hora sobre lo que
                # estamos haciendo AHORA pesa mas que uno identico de hace un mes.
                recency = _recency_factor(m.get("updated_at") or m.get("created_at"))
                candidates.append({
                    "source": "memory",
                    "title": m.get("category") or "Recuerdo",
                    "text": _clean_truncate(text, _MEMORY_TEXT_CHARS),
                    "score": round(score * recency, 4),
                    "recency": round(recency, 3),
                })
        except Exception as e:
            print(f"[Contexto] Recuerdos Mem0 no disponibles ({e}); sigo con las demás fuentes.")

        # --- Fuente 2: Documentos del memory root ----------------------------
        try:
            from ..memory.starseed_memory_engine import starseed_memory
            docs = starseed_memory.search_documents(prompt, branch=None, top_k=_CANDIDATE_POOL_PER_SOURCE) or []
            for d in docs:
                name = d.get("name") or "Documento"
                haystack = f"{name} {d.get('markdown', '')} {' '.join(d.get('tags') or [])}"
                score = _relevance_score(query_tokens, haystack)
                if score <= 0:
                    continue
                fragment = _best_fragment(d.get("markdown", ""), query_tokens, _DOC_FRAGMENT_CHARS)
                if not fragment:
                    continue
                candidates.append({
                    "source": "document",
                    "title": name,
                    "text": fragment,
                    "score": score,
                })
        except Exception as e:
            print(f"[Contexto] Documentos del memory root no disponibles ({e}); sigo con las demás fuentes.")

        # --- Fuente 3: Grafo de conocimiento ------------------------------------
        try:
            from ..memory.knowledge_graph import knowledge_graph
            sub = knowledge_graph.query_subgraph(prompt, limit=_CANDIDATE_POOL_PER_SOURCE) or {}
            for n in (sub.get("nodes") or []):
                label = n.get("label") or n.get("id") or "Concepto"
                desc = n.get("description") or ""
                token_score = _relevance_score(query_tokens, f"{label} {desc}")
                if token_score <= 0:
                    continue
                strength = min(1.0, max(0.0, float(n.get("strength", 0.5) or 0.0)))
                score = round((token_score * 0.85) + (strength * 0.15), 4)
                text = f"{label}: {desc}" if desc else label
                candidates.append({
                    "source": "concept",
                    "title": label,
                    "text": _clean_truncate(text, _CONCEPT_TEXT_CHARS),
                    "score": score,
                })
        except Exception as e:
            print(f"[Contexto] Grafo de conocimiento no disponible ({e}); sigo con las demás fuentes.")

        if not candidates:
            return []

        # --- Deduplicación + orden por relevancia real (no por fuente) ---------
        candidates.sort(key=lambda c: c["score"], reverse=True)
        deduped: List[Dict[str, Any]] = []
        seen_sigs = set()
        for c in candidates:
            sig = _normalize_for_dedup(c["text"])
            if not sig or sig in seen_sigs:
                continue
            seen_sigs.add(sig)
            deduped.append(c)

        # --- Presupuesto de caracteres: se llena en orden de relevancia --------
        result: List[Dict[str, Any]] = []
        used = 0
        for c in deduped:
            if len(result) >= limit_items:
                break
            remaining = budget - used
            if remaining < _MIN_FRAGMENT_CHARS:
                break
            line = _format_context_line(c["source"], c["title"], c["text"])
            if len(line) > remaining:
                prefix_len = len(line) - len(c["text"])
                avail = remaining - prefix_len
                if avail < _MIN_FRAGMENT_CHARS:
                    continue
                shortened = _clean_truncate(c["text"], avail)
                if not shortened:
                    continue
                c = {**c, "text": shortened}
                line = _format_context_line(c["source"], c["title"], shortened)
            c = {**c, "line": line}
            used += len(line) + 1
            result.append(c)

        return result

    @staticmethod
    def _gather_context(user_prompt: str, context_chunks: List[str]) -> List[str]:
        """
        (Tarea 1 · Recuperación de contexto de verdad) Sustituye a la antigua
        `_inject_mem0_memories`, que solo antepondía hasta 3 recuerdos Mem0.

        Delega en `gather_context_items` (recuerdos + documentos del memory
        root + conceptos del grafo de conocimiento, puntuados igual,
        deduplicados, ordenados por relevancia real y acotados a un
        presupuesto de caracteres) y antepone el resultado al
        `context_chunks` que ya traía el ciclo de branching, evitando repetir
        en ambos lados la misma frase. Mantiene la firma que espera el
        llamante (`cycle["context_chunks"]`, una lista de strings).

        Nunca lanza: si algo falla, se devuelve el `context_chunks` original
        tal cual (degradación elegante).
        """
        try:
            items = AstrauraOrchestrator.gather_context_items(user_prompt)
        except Exception as e:
            print(f"[Contexto] gather_context_items falló ({e}); sigo sin contexto adicional.")
            items = []

        lines = [it["line"] for it in items]
        seen = {_normalize_for_dedup(l) for l in lines}

        merged = list(lines)
        for chunk in (context_chunks or []):
            if not chunk:
                continue
            sig = _normalize_for_dedup(chunk)
            if sig in seen:
                continue
            seen.add(sig)
            merged.append(chunk)

        return merged

    async def execute_thought_cycle(
        self,
        user_prompt: str,
        preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes parallel multi-agent swarm deliberation cycle.
        """
        return await parallel_branching_engine.execute_parallel_swarm_cycle(user_prompt, preferences=preferences)

    async def generate_response_stream(
        self,
        user_prompt: str,
        custom_system_prompt: str = "",
        preferences: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generates streaming output with branching plan, parallel agent traces, and 1.58-bit token stream.
        Supports single personality or multiple simultaneous dynamic personalities.
        """
        prefs = preferences or {}
        max_chars = prefs.get("max_length_chars")
        style = prefs.get("response_style", "analytical")
        multi_mode = prefs.get("multi_personality_mode", "auto") # "single" | "multi_dialogue" | "coral_synthesis" | "auto"

        # (OS · Ola 3) El gobernador adaptativo del enjambre cede CPU al chat: existía
        # record_user_activity() pero nadie lo llamaba.
        try:
            from .swarm_manager import swarm_manager
            swarm_manager.record_user_activity()
        except Exception:
            pass

        # Detect active personalities
        active_personas = self.detect_requested_personalities(user_prompt, prefs)
        is_multi = len(active_personas) > 1

        # 1. Analyze and Emit Branching Plan Immediately to UI (Zero-Latency Rendering)
        initial_plan = parallel_branching_engine.analyze_query_branches(user_prompt, prefs)
        yield {
            "type": "branching_plan",
            "plan": initial_plan,
            "elapsed_seconds": 0.02,
            "active_personalities": [p["name"] for p in active_personas]
        }

        # 2. Execute Fast Quantum Multi-Agent Parallel Swarm Cycle
        cycle = await self.execute_thought_cycle(user_prompt, preferences=prefs)

        # (Tarea 1 · Sincronización Total) Contexto real de las tres fuentes
        # (recuerdos + documentos del memory root + conceptos del grafo),
        # ordenado por relevancia y acotado a un presupuesto de caracteres —
        # ver el bloque de comentarios al principio del archivo. El motor de
        # inferencia solo reenvía los primeros 6 fragmentos de esta lista al
        # modelo (ver bitnet_engine.py, `context_chunks[:6]`), así que lo que
        # importa es que los más relevantes queden primero, no cuántos se
        # devuelvan en total.
        context_chunks = self._gather_context(user_prompt, cycle.get("context_chunks") or [])
        cycle["context_chunks"] = context_chunks

        # 3. Emit Final Synchronized Agent Thought traces to UI
        yield {
            "type": "agent_traces",
            "traces": cycle["agent_traces"],
            "tool_executions": cycle["tool_executions"],
            "related_nodes": cycle["related_nodes"],
            "participating_personalities": active_personas
        }

        # 3.5 Check if high-precision deterministic reasoning response applies (identity, system architecture & voice demo)
        from .reasoner import reasoner, dispara_plantilla
        p_lower = user_prompt.lower()
        # (Adenda 159) Antes bastaba que la frase APARECIERA en cualquier punto del
        # prompt; con la conversacion entera dentro, el chat quedaba atrapado en la
        # misma plantilla para siempre. Ahora el prompt tiene que SER la pregunta.
        if dispara_plantilla(p_lower, [
            "cómo funciona tu sistema", "como funciona tu sistema", "demuéstrame cómo funciona", "demuestrame como funciona",
            "demuéstrame las personalidades", "demuestrame las personalidades", "personalidades con cada uno de sus voces",
            "personalidades con cada una de sus voces", "personalidades con sus voces", "cuántas personalidades", "cuantas personalidades",
            "quién soy yo", "quien soy yo", "quién eres tu", "quién eres", "quien eres"
        ]):
            synthesized = reasoner.solve_or_synthesize(user_prompt)
            if synthesized:
                words = re.findall(r'\S+|\s+', synthesized)
                full_text = ""
                for w in words:
                    full_text += w
                    yield {"type": "token", "token": w}
                    await asyncio.sleep(0.003)

                yield {
                    "type": "done",
                    "full_text": full_text
                }
                return

        # 4. If Multiple Personalities Requested:
        if is_multi and multi_mode != "single":
            yield {
                "type": "multi_personality_start",
                "personalities": [{"id": p["id"], "name": p["name"], "color": p.get("color", "#00f0ff")} for p in active_personas]
            }

            accumulated_full_text = ""
            from ..memory.starseed_memory_engine import starseed_memory

            for i, persona in enumerate(active_personas):
                p_clean = persona["name"].split("(")[0].strip()
                header = f"\n\n### 💬 [{persona['name']}]:\n" if i > 0 else f"### 💬 [{persona['name']}]:\n"
                accumulated_full_text += header
                yield {"type": "token", "token": header}

                persona_sys = starseed_memory.get_formatted_identity_context(persona)
                persona_sys += f"\n[TURNO DE INTERVENCIÓN]: Responde en este turno como **{p_clean}** desde tu perspectiva y especialidad en 1 o 2 párrafos concisos y directos para Alex."

                async for token in bitnet_engine.generate_stream(
                    prompt=user_prompt,
                    system_prompt=persona_sys,
                    context_chunks=cycle["context_chunks"],
                    tool_data=cycle["tool_data"],
                    max_tokens=600,
                    temperature=self._persona_temperature(persona)  # (OS · Ola 3)
                ):
                    accumulated_full_text += token
                    yield {
                        "type": "token",
                        "token": token
                    }

            # Enqueue interaction for continuous background learning
            background_learner.enqueue_interaction(
                user_msg=user_prompt,
                ai_response=accumulated_full_text,
                metadata={
                    "env": cycle["env_metrics"],
                    "tools": cycle["tool_executions"],
                    "preferences": prefs,
                    "branching": cycle.get("branching_plan"),
                    "multi_personalities": [p["id"] for p in active_personas]
                }
            )

            try:
                from ..memory.mem0_engine import mem0_engine
                if len(user_prompt.strip()) > 10:
                    mem0_engine.add_memory(
                        memory_text=f"Diálogo Coral con {len(active_personas)} personalidades sobre: {user_prompt.strip()[:200]} -> {accumulated_full_text.strip()[:200]}",
                        user_id="alex",
                        category="coral_deliberation",
                        metadata={"timestamp": time.time(), "personas": [p["id"] for p in active_personas]}
                    )
            except Exception:
                pass

            yield {
                "type": "done",
                "full_text": accumulated_full_text,
                "personalities_involved": [p["id"] for p in active_personas]
            }
            return

        # 5. Single Personality Stream (Standard / Tuned)
        primary_persona = active_personas[0] if active_personas else None
        from ..memory.starseed_memory_engine import starseed_memory
        sys_prompt = custom_system_prompt or starseed_memory.get_formatted_identity_context(primary_persona)

        if style == "concise":
            sys_prompt += "\n[ESTILO]: Sé sumamente conciso, directo al grano y usa viñetas breves sin rodeos."
        elif style == "analytical":
            sys_prompt += "\n[ESTILO]: Sé exhaustivo, analítico, fundamentado teóricamente y con desglose estructurado."
        elif style == "creative":
            sys_prompt += "\n[ESTILO]: Sé creativo, lírico, ciberdélico y estéticamente evocador."
        elif style == "technical_code":
            sys_prompt += "\n[ESTILO]: Enfócate en código limpio, ejecutable, scripts completos y arquitectura de sistemas."
        elif style == "multimodal_visual":
            sys_prompt += "\n[ESTILO]: Incluye siempre bloques interactivos de código visual (HTML/Canvas 2D, WebGL 3D o WebAudio) listos para correr."

        if max_chars:
            sys_prompt += f"\n[LÍMITE DE LONGITUD]: Mantén tu respuesta en aproximadamente un máximo de {max_chars} caracteres."

        full_text = ""
        max_tokens = 2048
        if max_chars:
            max_tokens = max(128, min(4096, max_chars // 4))

        async for token in bitnet_engine.generate_stream(
            prompt=user_prompt,
            system_prompt=sys_prompt,
            context_chunks=cycle["context_chunks"],
            tool_data=cycle["tool_data"],
            max_tokens=max_tokens,
            temperature=self._persona_temperature(primary_persona)  # (OS · Ola 3)
        ):
            full_text += token
            yield {
                "type": "token",
                "token": token
            }

        # Enqueue interaction for continuous background learning & Mem0 Universal Memory
        background_learner.enqueue_interaction(
            user_msg=user_prompt,
            ai_response=full_text,
            metadata={
                "env": cycle["env_metrics"],
                "tools": cycle["tool_executions"],
                "preferences": prefs,
                "branching": cycle.get("branching_plan"),
                "persona_id": primary_persona.get("id") if primary_persona else "astraura_prime"
            }
        )

        try:
            from ..memory.mem0_engine import mem0_engine
            if len(user_prompt.strip()) > 10:
                mem0_engine.add_memory(
                    memory_text=f"Usuario consultó a {primary_persona.get('name') if primary_persona else 'Astraura'}: {user_prompt.strip()[:250]} -> Síntesis: {full_text.strip()[:200]}",
                    user_id="alex",
                    category="chat_episodic",
                    metadata={"timestamp": time.time(), "style": style, "persona": primary_persona.get("id") if primary_persona else "astraura_prime"}
                )
        except Exception:
            pass

        yield {
            "type": "done",
            "full_text": full_text
        }

orchestrator = AstrauraOrchestrator()
