import asyncio
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
        if prefs.get("selected_personalities") and isinstance(prefs["selected_personalities"], list):
            for pid in prefs["selected_personalities"]:
                if pid in persona_map:
                    selected_ids.add(pid)

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

        # 3. Emit Final Synchronized Agent Thought traces to UI
        yield {
            "type": "agent_traces",
            "traces": cycle["agent_traces"],
            "tool_executions": cycle["tool_executions"],
            "related_nodes": cycle["related_nodes"],
            "participating_personalities": active_personas
        }

        # 3.5 Check if high-precision deterministic reasoning response applies (identity, system architecture & voice demo)
        from .reasoner import reasoner
        p_lower = user_prompt.lower()
        if any(w in p_lower for w in [
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
                    max_tokens=600
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
            max_tokens=max_tokens
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
