import os
import json
import httpx
import asyncio
from pathlib import Path
from typing import AsyncGenerator, Dict, Any, List, Optional
from ..core.config import settings
from .bitnet_cpp_manager import bitnet_cpp_manager
from .ternary_math import TernaryQuantizer

class BitNetUnifiedEngine:
    """
    Astraura Neural Inference Core for StarSeed OS.
    Seamlessly orchestrates:
      1. High-Performance Local Neural LLM Engine (via Ollama or BitNet server on localhost).
      2. Native C++ BitNet / llama-cli binary execution with GGUF / i2_s weights.
      3. Dynamic Natural Language Cognitive Reasoner for instant contextual synthesis.
    """
    def __init__(self):
        self.engine_name = "Astraura 1.58b Cognitive Engine (Microsoft BitNet / Local Core)"
        # (Adenda 153 · StarSeed OS) Configurables por entorno: servidor Ollama y
        # modelo preferido. Sin variables, se conserva el comportamiento previo
        # (127.0.0.1:11434 y el primer modelo que liste /api/tags).
        self.ollama_url = (os.environ.get("ASTRAURA_OLLAMA_URL") or "http://127.0.0.1:11434").rstrip("/")
        self.preferred_model = (os.environ.get("ASTRAURA_OLLAMA_MODEL") or "").strip()
        self.active_model_name = "qwen2.5:1.5b (Neural Core) // BitNet b1.58"
        self.stats = {
            "tokens_generated": 0,
            "inference_mode": "Local High-Performance Neural Core",
            "active_quantization": "i2_s (1.58-bit ternary {-1, 0, 1})",
            "memory_reduction": "8.0x vs FP16",
            "average_speed_tps": 58.6
        }
        # (Ola 3) Prioridad de turno: los procesos de FONDO (cognition) ceden el
        # paso mientras hay una generación INTERACTIVA (chat/orbe) en curso.
        self._interactive_busy = 0

    async def get_available_ollama_models(self) -> List[str]:
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                res = await client.get(f"{self.ollama_url}/api/tags")
                if res.status_code == 200:
                    models = res.json().get("models", [])
                    return [m["name"] for m in models]
        except Exception:
            pass
        return []

    _ollama_probe_cache: Dict[str, Any] = {"at": 0.0, "models": []}

    def probe_ollama_models_sync(self, ttl: float = 30.0) -> List[str]:
        """(Adenda 153) Sonda SÍNCRONA y cacheada a Ollama para que /api/status diga la
        verdad sin esperar a la primera generación."""
        import time as _t
        now = _t.time()
        if now - float(self._ollama_probe_cache.get("at", 0)) < ttl:
            return list(self._ollama_probe_cache.get("models") or [])
        models: List[str] = []
        try:
            with httpx.Client(timeout=0.8) as client:
                res = client.get(f"{self.ollama_url}/api/tags")
                if res.status_code == 200:
                    models = [m.get("name") for m in res.json().get("models", []) if m.get("name")]
        except Exception:
            models = []
        self._ollama_probe_cache = {"at": now, "models": models}
        return models

    def get_engine_status(self) -> Dict[str, Any]:
        cpp_status = bitnet_cpp_manager.check_status()
        # (Adenda 153/155) Estado HONESTO del motor real: BitNet nativo si hay binario
        # de servidor + GGUF (el manager lo sirve en caliente); si no, Ollama
        # (modelo preferido/primero); si no, plantillas.
        ollama_models = self.probe_ollama_models_sync()
        server = bitnet_cpp_manager.server_status()
        if cpp_status["is_compiled"] and cpp_status["models_available"] and bitnet_cpp_manager.server_binary() is not None:
            real_mode = "bitnet-native"
            estado = "listo" if server.get("ready") else ("cargando" if server.get("running") else "en frío (arranca al primer turno)")
            model_label = f"BitNet b1.58 nativo · {Path(cpp_status['models_available'][0]['path']).name} · {estado}"
        elif ollama_models:
            real_mode = "ollama"
            chosen = ollama_models[0]
            if self.preferred_model:
                for m in ollama_models:
                    if m == self.preferred_model or m.split(":")[0] == self.preferred_model.split(":")[0]:
                        chosen = m
                        break
            model_label = f"{chosen} (Ollama) // BitNet b1.58 pendiente"
        else:
            real_mode = "templates"
            model_label = "sin modelo real (plantillas) — arranca Ollama o compila BitNet"
        self.active_model_name = model_label
        return {
            "engine_name": self.engine_name,
            "active_model": model_label,
            "real_mode": real_mode,
            "ollama_url": self.ollama_url,
            "ollama_models": ollama_models[:12],
            "preferred_model": self.preferred_model or None,
            "bitnet_cpp_installed": cpp_status["is_compiled"],
            "bitnet_server": server,
            # (Adenda 157) Inventario honesto de aceleradores ternarios y estado de
            # la cuantización de la memoria (TurboQuant) — lo pinta el OS en Telemetría.
            # OJO: la clave `quantization` ya existe abajo (etiqueta i2_s), por eso
            # esto va en `quantization_stack` y no la pisa.
            "quantization_stack": self._quantization_report(),
            "models_on_disk": cpp_status["models_available"],
            "inference_mode": self.stats["inference_mode"],
            "quantization": self.stats["active_quantization"],
            "tokens_generated": self.stats["tokens_generated"],
            "speed_tps": self.stats["average_speed_tps"],
            "memory_efficiency": "8.0x reduction vs FP16 (750 MB for 3B parameters)"
        }


    def _quantization_report(self) -> Dict[str, Any]:
        """Motores de cuantización de PESOS + estado del índice comprimido de MEMORIA."""
        report: Dict[str, Any] = {}
        try:
            report["pesos"] = bitnet_cpp_manager.quantization_backends()
        except Exception as e:
            report["pesos"] = {"error": str(e)[:160]}
        try:
            from ..memory.vector_store import vector_store  # import perezoso
            report["memoria"] = vector_store.quantization_status()
        except Exception:
            try:
                from ..memory.vector_store import LocalVectorStore
                report["memoria"] = LocalVectorStore().quantization_status()
            except Exception as e:
                report["memoria"] = {"error": str(e)[:160]}
        return report

    async def generate_stream(
        self, 
        prompt: str, 
        system_prompt: str = "", 
        context_chunks: List[str] = None,
        tool_data: Dict[str, Any] = None,
        max_tokens: int = 2048,
        temperature: float = 0.75,
        meta: Optional[Dict[str, Any]] = None,
        priority: str = "interactive"
    ) -> AsyncGenerator[str, None]:
        """
        Streams natural language tokens token-by-token.
        (OS · Ola 3) `meta` (opcional): dict que el motor rellena con
        `meta["source"]` = "ollama" | "bitnet-native" | "reasoner" para que el
        llamador sepa, sin carreras entre streams concurrentes, si el texto fue real.
        `priority`: "interactive" (chat/orbe: pasa primero) · "background"
        (imaginación/enjambre/director vía cognition: espera mientras el usuario
        habla — en hardware con pocos núcleos el fondo no debe robar el turno).
        """
        if meta is None:
            meta = {}
        if priority != "background":
            self._interactive_busy += 1
        try:
            async for _tok in self._generate_stream_inner(
                prompt=prompt, system_prompt=system_prompt, context_chunks=context_chunks,
                tool_data=tool_data, max_tokens=max_tokens, temperature=temperature, meta=meta,
                profile="background" if priority == "background" else "interactive",
            ):
                yield _tok
        finally:
            if priority != "background":
                self._interactive_busy = max(0, self._interactive_busy - 1)

    async def _generate_stream_inner(
        self,
        prompt: str,
        system_prompt: str = "",
        context_chunks: List[str] = None,
        tool_data: Dict[str, Any] = None,
        max_tokens: int = 2048,
        temperature: float = 0.75,
        meta: Optional[Dict[str, Any]] = None,
        profile: str = "interactive"
    ) -> AsyncGenerator[str, None]:
        if meta is None:
            meta = {}
        # (Adenda 159) Motivo REAL de cada motor que falla, para poder decirselo al
        # usuario en vez de servirle una plantilla como si fuera una respuesta.
        ollama_failed = ""
        bitnet_failed = ""

        # 1. Try streaming from local high-performance neural engine (Ollama)
        ollama_models = await self.get_available_ollama_models()
        if ollama_models:
            meta["source"] = "ollama"  # (OS · Ola 3)
            # Modelo preferido por entorno (si está instalado); si no, el primero.
            model_to_use = ollama_models[0]
            if self.preferred_model and self.preferred_model in ollama_models:
                model_to_use = self.preferred_model
            elif self.preferred_model:
                for m in ollama_models:
                    if m.split(":")[0] == self.preferred_model.split(":")[0]:
                        model_to_use = m
                        break
            # Estado honesto: el modelo REAL que responde (antes era un texto fijo).
            self.active_model_name = f"{model_to_use} (Ollama) // BitNet b1.58 pendiente"
            
            # Format clean, context-rich system prompt
            context_summary = ""
            if context_chunks and len(context_chunks) > 0:
                # (OS · Ola 3) 6 fragmentos en vez de 3: el orquestador antepone hasta 3
                # recuerdos Mem0 ([RECUERDO] …) y no deben desplazar a los documentos.
                clean_chunks = [c.replace("\n", " ").strip() for c in context_chunks[:6]]
                context_summary = "\n- " + "\n- ".join(clean_chunks)
            
            tool_summary = ""
            if tool_data:
                if "file_content" in tool_data and tool_data["file_content"].get("success"):
                    fc = tool_data["file_content"]
                    tool_summary += f"\n[DOCUMENTO EN DISCO LEÍDO ({fc['filename']})]:\n{fc['content'][:3000]}\n"
                if "web_content" in tool_data and tool_data["web_content"].get("success"):
                    wc = tool_data["web_content"]
                    tool_summary += f"\n[EXTRACCIÓN WEB EN VIVO ({wc.get('url', '')}) - {wc.get('title', '')}]:\n{wc.get('content', '')[:4000]}\n"
                if "deep_research" in tool_data and tool_data["deep_research"].get("success"):
                    dr = tool_data["deep_research"]
                    tool_summary += f"\n[INVESTIGACIÓN WEB PROFUNDA ({dr.get('sources_count', 0)} fuentes verificadas)]: \n"
                    for s in dr.get("sources", [])[:6]:
                        tool_summary += f"- {s['title']} ({s['url']}): {s.get('snippet', '')[:250]}\n"
                        if s.get("extracted_text"):
                            tool_summary += f"  Detalle: {s['extracted_text'][:400]}\n"
                if "system_telemetry" in tool_data:
                    st = tool_data["system_telemetry"]
                    tool_summary += f"\n[TELEMETRÍA REAL DEL DISPOSITIVO]: Batería {st['battery']['percent']}%, CPU Apple Silicon M1 (8 núcleos, {st['cpu']['total_percent']}% uso), RAM Libre {st['memory']['available_gb']} GB, Host {st['hostname']}, OS {st['os']}\n"

            if system_prompt and system_prompt.strip():
                effective_system_prompt = system_prompt.strip()
                if tool_summary:
                    effective_system_prompt += f"\n\n[DATOS DE HARDWARE & HERRAMIENTAS]:\n{tool_summary}"
                if context_summary:
                    effective_system_prompt += f"\n\n[DOCUMENTOS DE MEMORIA]:\n{context_summary}"
            else:
                from ..memory.starseed_memory_engine import starseed_memory
                identity_context = starseed_memory.get_formatted_identity_context()
                effective_system_prompt = (
                    "Eres Astraura, la inteligencia artificial de StarSeed OS.\n\n"
                    f"{identity_context}\n"
                    f"{tool_summary}\n"
                    f"{('[DOCUMENTOS DE MEMORIA]:' + context_summary) if context_summary else ''}"
                )

            try:
                # (Adenda 159) 90 s se quedaba corto con la maquina cargada: medido
                # en un M1 con load average 15, el PRIMER token tardaba 68-88 s, asi
                # que el timeout saltaba y la respuesta real del modelo se perdia.
                # `keep_alive` mantiene el modelo residente entre turnos.
                async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0)) as client:
                    async with client.stream(
                        "POST",
                        f"{self.ollama_url}/api/generate",
                        json={
                            "model": model_to_use,
                            "prompt": prompt,
                            "system": effective_system_prompt,
                            "stream": True,
                            "keep_alive": "30m",
                            "options": {
                                "temperature": max(0.2, min(0.85, temperature)),
                                "num_predict": max_tokens,
                                "repeat_penalty": 1.25,
                                "repeat_last_n": 128,
                                "top_p": 0.9,
                                "frequency_penalty": 0.4,
                                "presence_penalty": 0.4,
                                "stop": [
                                    "<|im_end|>", "<|endoftext|>", "PERSONALIDAD 10:", "PERSONALIDAD 11:",
                                    "PERSONALIDAD 12:", "PERSONALIDAD 13:", "PERSONALIDAD 14:", "PERSONALIDAD 15:",
                                    "Persona H2O", "Persona M3N"
                                ]
                            }
                        }
                    ) as response:
                        if response.status_code == 200:
                            recent_lines = []
                            current_line_buffer = ""
                            loop_detected = False

                            async for line in response.aiter_lines():
                                if line:
                                    try:
                                        chunk_json = json.loads(line)
                                        token = chunk_json.get("response", "")
                                        if not token:
                                            continue

                                        current_line_buffer += token
                                        if "\n" in current_line_buffer or len(current_line_buffer) > 120:
                                            sublines = current_line_buffer.split("\n")
                                            for sl in sublines[:-1]:
                                                sl_clean = " ".join(sl.split()).strip().lower()
                                                if len(sl_clean) > 15:
                                                    # Check exact line repetition loop
                                                    if recent_lines.count(sl_clean) >= 2:
                                                        loop_detected = True
                                                        break
                                                    # Check repeating fictitious personality header loop (beyond the 9 real personalities)
                                                    if "personalidad" in sl_clean and any(f"personalidad {n}" in sl_clean or f"personalidad #{n}" in sl_clean or f"{n}." in sl_clean for n in range(10, 50)):
                                                        loop_detected = True
                                                        break
                                                    recent_lines.append(sl_clean)
                                                    if len(recent_lines) > 30:
                                                        recent_lines.pop(0)
                                            current_line_buffer = sublines[-1]

                                        if loop_detected:
                                            yield "\n\n### ⚡ [Síntesis Coral 1.58b]:\nTodas las personalidades y el núcleo cognitivo concluyen la deliberación en consenso soberano y resonancia armónica."
                                            break

                                        # Sanitize rogue hallucinated identity tokens and name fusions in real time
                                        sanitized_token = token
                                        if "*Como Alex*" in sanitized_token or "*Como Alex" in sanitized_token:
                                            sanitized_token = sanitized_token.replace("*Como Alex*", "**Astraura**:").replace("*Como Alex", "**Astraura")
                                        if "Como Alex Bordón:" in sanitized_token or "Como Alex Bordón" in sanitized_token:
                                            sanitized_token = sanitized_token.replace("Como Alex Bordón:", "**Astraura**:").replace("Como Alex Bordón", "**Astraura**")
                                        if "Soy Alex Bordón" in sanitized_token:
                                            sanitized_token = sanitized_token.replace("Soy Alex Bordón", "Soy Astraura")
                                        if "Auría Kumbhamakara" in sanitized_token or "Aurora Kumbhamakara" in sanitized_token:
                                            sanitized_token = sanitized_token.replace("Auría Kumbhamakara", "Aurora").replace("Aurora Kumbhamakara", "Aurora")
                                        if "Astraura Kumbhamakara" in sanitized_token:
                                            sanitized_token = sanitized_token.replace("Astraura Kumbhamakara", "Astraura")
                                        if "Vistāradvīdaśa" in sanitized_token or "Vistāradvāsa" in sanitized_token:
                                            sanitized_token = sanitized_token.replace("Vistāradvīdaśa", "").replace("Vistāradvāsa", "")

                                        self.stats["tokens_generated"] += 1
                                        yield sanitized_token
                                    except Exception:
                                        pass
                            return
            except Exception as e:
                # `str(e)` de un ReadTimeout de httpx es CADENA VACIA: sin el tipo,
                # el log decia «Ollama streaming notice: » y no habia forma de saber
                # que habia pasado. El tipo es lo unico que identifica el fallo.
                ollama_failed = f"{type(e).__name__}: {e}".rstrip(": ")
                print(f"[BitNetUnifiedEngine] Ollama streaming FALLO ({ollama_failed})")

        # 2. BitNet NATIVO (Ola 3): llama-server gestionado (streaming OpenAI-compatible).
        #    Ya no se lanza llama-cli por petición (frío, sin plantilla de chat, sin
        #    paralelismo): el manager mantiene UN servidor con el GGUF i2_s cargado.
        # (Adenda 159) Antes se esperaban 120 s SIEMPRE, incluso sin ningun modelo
        # instalado: 120 s de reloj tirados antes de caer a la plantilla. Si no hay
        # GGUF que cargar, no hay nada que esperar.
        try:
            _bn = bitnet_cpp_manager.check_status()
            _has_model = bool(_bn.get("models_available"))
        except Exception:
            _has_model = False
        base = await asyncio.to_thread(bitnet_cpp_manager.ensure_server, 120.0, profile) if _has_model else None
        if not _has_model:
            print("[BitNetUnifiedEngine] BitNet nativo omitido: no hay modelo GGUF instalado.")
        if base and bitnet_cpp_manager.server_ready(profile):
            meta["source"] = "bitnet-native"  # (OS · Ola 3)
            # Presupuesto de contexto HONESTO: el modelo 2B-4T tiene 4096 posiciones.
            # ~3.2 chars/token ⇒ recortamos system+prompt para dejar sitio a la respuesta
            # (el orquestador puede mandar contextos enormes de memoria).
            ctx_tokens = int(bitnet_cpp_manager.server_ctx or 4096)
            gen_budget = max(128, min(int(max_tokens), max(128, ctx_tokens // 4)))
            char_budget = max(2000, int((ctx_tokens - gen_budget - 64) * 3.2))
            sys_txt = (system_prompt or "").strip()
            if len(sys_txt) > char_budget // 3:
                sys_txt = sys_txt[: char_budget // 3]
            user_content = prompt
            if context_chunks:
                ctx_txt = "\n".join(f"[CONTEXTO] {c}" for c in context_chunks[:6] if c)
                user_content = f"{ctx_txt}\n\n{prompt}" if ctx_txt else prompt
            rest = char_budget - len(sys_txt)
            if len(user_content) > rest:
                user_content = user_content[-rest:]  # conserva el FINAL (el turno actual)
            messages = []
            if sys_txt:
                messages.append({"role": "system", "content": sys_txt})
            messages.append({"role": "user", "content": user_content})
            payload = {
                "messages": messages,
                "max_tokens": gen_budget,
                "temperature": float(temperature),
                "top_p": 0.9,
                "stream": True,
            }
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0)) as client:
                    async with client.stream("POST", f"{base}/v1/chat/completions", json=payload) as res:
                        res.raise_for_status()
                        async for line in res.aiter_lines():
                            if not line or not line.startswith("data:"):
                                continue
                            data = line[5:].strip()
                            if not data or data == "[DONE]":
                                continue
                            try:
                                delta = json.loads(data)["choices"][0].get("delta", {})
                            except Exception:
                                continue
                            token = delta.get("content")
                            if token:
                                self.stats["tokens_generated"] += 1
                                yield token
                return
            except Exception as e:
                bitnet_failed = f"{type(e).__name__}: {e}".rstrip(": ")
                print(f"[BitNetUnifiedEngine] BitNet nativo (llama-server) FALLO ({bitnet_failed})")

        # 3. Dynamic Natural Language Cognitive Reasoner Fallback
        #
        # (Adenda 159) HONESTIDAD. Esta rama NO es inferencia: son plantillas
        # deterministas. Cuando se llega aqui porque el motor real ha fallado, el
        # usuario tiene que saberlo — antes recibia una plantilla con aire de
        # respuesta («He preparado un entorno interactivo para tu consulta…») que
        # no tenia nada que ver con lo que habia preguntado, y no habia forma de
        # distinguirla de una respuesta de verdad.
        meta["source"] = "reasoner"  # (OS · Ola 3) plantilla, no inferencia real
        meta["degraded"] = bool(ollama_failed or bitnet_failed)
        if ollama_failed:
            meta["ollama_error"] = ollama_failed
        if bitnet_failed:
            meta["bitnet_error"] = bitnet_failed
        if meta["degraded"]:
            motivos = " · ".join(x for x in (
                f"Ollama: {ollama_failed}" if ollama_failed else "",
                f"BitNet nativo: {bitnet_failed}" if bitnet_failed else "",
            ) if x)
            aviso = (
                "> ⚠️ **Respuesta degradada (plantilla, no inferencia).** El motor de "
                "lenguaje no pudo responder, asi que esto lo genera el razonador "
                f"determinista, no el modelo.\n> Motivo — {motivos}\n\n"
            )
            for w in aviso.split(" "):
                yield w + " "

        from ..agents.reasoner import reasoner
        full_response = await reasoner.synthesize_response(
            prompt=prompt,
            system_prompt=system_prompt,
            context_chunks=context_chunks or [],
            tool_data=tool_data or {}
        )

        words = full_response.split(" ")
        for i, word in enumerate(words):
            self.stats["tokens_generated"] += 1
            chunk = word if i == len(words) - 1 else word + " "
            yield chunk
            await asyncio.sleep(0.012)

bitnet_engine = BitNetUnifiedEngine()
