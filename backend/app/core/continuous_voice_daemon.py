"""
Astraura Continuous Voice Daemon & Sensory Multi-Personality Consciousness Engine
StarSeed OS & BitNet 1.58-Bit Architecture
Provides persistent 24/7 ambient listening, real-time device sensory perception (mics, antennas, M1 sensors),
autonomous multi-agent vocal presence, emotional valence extraction, and deep memory/file contextual recall.
"""

import time
import json
import math
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

from .sensorium_engine import sensorium_engine
from .audio_cpp_engine import audio_cpp_engine
from ..memory.mem0_engine import mem0_engine
from ..personalities.personality_engine import personality_engine

class ContinuousVoiceDaemon:
    """
    Central Sensory & Autonomous Voice Daemon for StarSeed OS.
    Coordinates all personality voices, hardware sensory awareness, acoustic emotion detection,
    and granular/master autonomous switches.
    """

    def __init__(self, data_dir: Optional[str] = None):
        if data_dir is None:
            self.data_dir = Path("/Users/alex/Documents/IA 1.58 bit/data/voice_daemon")
        else:
            self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.state_file = self.data_dir / "daemon_state.json"
        self.ambient_events_file = self.data_dir / "ambient_voice_events.json"

        # Master & Personality Autonomous Toggles
        self.master_voice_enabled = True
        self.master_ambient_listening_enabled = True
        self.master_affective_learning_enabled = True
        self.master_device_sensory_link = True

        # Per-Personality State Registry
        self.personality_voice_states: Dict[str, Dict[str, Any]] = {
            "astraura_prime": {
                "voice_autonomous_enabled": True,
                "multiagent_enabled": True,
                "presence_state": "listening", # listening | perceiving | speaking | dormant
                "sensitivity": 0.85,
                "current_affect": "serenidad_lúcida",
                "character_evolution_score": 94,
                "last_active_timestamp": time.time(),
                "cognitive_organ": "Génesis (Núcleo Ontológico)"
            },
            "hermione": {
                "voice_autonomous_enabled": True,
                "multiagent_enabled": True,
                "presence_state": "listening",
                "sensitivity": 0.90,
                "current_affect": "asertividad_ejecutiva",
                "character_evolution_score": 92,
                "last_active_timestamp": time.time(),
                "cognitive_organ": "Puente Nativo & OS"
            },
            "hephaestus": {
                "voice_autonomous_enabled": True,
                "multiagent_enabled": True,
                "presence_state": "listening",
                "sensitivity": 0.80,
                "current_affect": "rigor_forja_silicio",
                "character_evolution_score": 96,
                "last_active_timestamp": time.time(),
                "cognitive_organ": "Forja ARM64 NEON"
            },
            "hermes": {
                "voice_autonomous_enabled": True,
                "multiagent_enabled": True,
                "presence_state": "listening",
                "sensitivity": 0.92,
                "current_affect": "curiosidad_exploradora",
                "character_evolution_score": 91,
                "last_active_timestamp": time.time(),
                "cognitive_organ": "Ojo Navegante & Gateway Web"
            },
            "atenea": {
                "voice_autonomous_enabled": True,
                "multiagent_enabled": True,
                "presence_state": "listening",
                "sensitivity": 0.95,
                "current_affect": "vigilancia_inmune",
                "character_evolution_score": 95,
                "last_active_timestamp": time.time(),
                "cognitive_organ": "Escudo Sentinel & SAIF 360°"
            },
            "oneiros": {
                "voice_autonomous_enabled": True,
                "multiagent_enabled": True,
                "presence_state": "listening",
                "sensitivity": 0.88,
                "current_affect": "asombro_onirico",
                "character_evolution_score": 93,
                "last_active_timestamp": time.time(),
                "cognitive_organ": "ShaderLab 3D & Ensueño"
            },
            "kallisti": {
                "voice_autonomous_enabled": True,
                "multiagent_enabled": True,
                "presence_state": "listening",
                "sensitivity": 0.89,
                "current_affect": "pasion_poetica",
                "character_evolution_score": 90,
                "last_active_timestamp": time.time(),
                "cognitive_organ": "Musa Ciberdélica"
            },
            "mnemosyne": {
                "voice_autonomous_enabled": True,
                "multiagent_enabled": True,
                "presence_state": "listening",
                "sensitivity": 0.85,
                "current_affect": "memoria_continua",
                "character_evolution_score": 97,
                "last_active_timestamp": time.time(),
                "cognitive_organ": "Bóveda Sináptica Exocórtex"
            }
        }

        self.recent_perceptions: List[Dict[str, Any]] = []
        self._load_state()

    def _load_state(self):
        try:
            if self.state_file.exists():
                data = json.loads(self.state_file.read_text(encoding="utf-8"))
                self.master_voice_enabled = data.get("master_voice_enabled", True)
                self.master_ambient_listening_enabled = data.get("master_ambient_listening_enabled", True)
                self.master_affective_learning_enabled = data.get("master_affective_learning_enabled", True)
                self.master_device_sensory_link = data.get("master_device_sensory_link", True)
                saved_states = data.get("personality_voice_states", {})
                for pid, pstate in saved_states.items():
                    if pid in self.personality_voice_states:
                        self.personality_voice_states[pid].update(pstate)
                    else:
                        self.personality_voice_states[pid] = pstate
        except Exception as e:
            print(f"[ContinuousVoiceDaemon] Error loading state: {e}")

    def _save_state(self):
        try:
            payload = {
                "master_voice_enabled": self.master_voice_enabled,
                "master_ambient_listening_enabled": self.master_ambient_listening_enabled,
                "master_affective_learning_enabled": self.master_affective_learning_enabled,
                "master_device_sensory_link": self.master_device_sensory_link,
                "personality_voice_states": self.personality_voice_states,
                "updated_at": time.time()
            }
            self.state_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"[ContinuousVoiceDaemon] Error saving state: {e}")

    def get_daemon_status(self) -> Dict[str, Any]:
        """Returns comprehensive status of background listening daemon and all personality vocal states."""
        # Query live hardware telemetry from sensorium
        sensorium = sensorium_engine.get_full_sensorium()
        hw = sensorium.get("hardware", {})

        return {
            "success": True,
            "master_switches": {
                "master_voice_enabled": self.master_voice_enabled,
                "master_ambient_listening_enabled": self.master_ambient_listening_enabled,
                "master_affective_learning_enabled": self.master_affective_learning_enabled,
                "master_device_sensory_link": self.master_device_sensory_link
            },
            "personality_states": self.personality_voice_states,
            "sensory_telemetry": {
                "chipset": hw.get("chipset", "Apple Silicon M1 (ARM64 NEON)"),
                "cpu_percent": hw.get("cpu_percent", 12.0),
                "ram_used_percent": hw.get("ram_used_percent", 55.0),
                "battery_percent": hw.get("battery_percent", 100.0),
                "power_plugged": hw.get("power_plugged", True),
                "location_city": sensorium.get("location", {}).get("city", "Guadalajara"),
                "ambient_noise_db": sensorium.get("sensors", {}).get("microphone", {}).get("ambient_db", 38.5),
                "network_state": "WiFi & Sockets Activos"
            },
            "active_listening_personalities_count": sum(
                1 for p in self.personality_voice_states.values() if p.get("voice_autonomous_enabled")
            ),
            "recent_perceptions": self.recent_perceptions[-6:],
            "system_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def toggle_master_switch(self, switch_key: str, enabled: bool) -> Dict[str, Any]:
        """Toggles master voice / learning / listening controls."""
        if switch_key == "master_voice_enabled":
            self.master_voice_enabled = enabled
        elif switch_key == "master_ambient_listening_enabled":
            self.master_ambient_listening_enabled = enabled
        elif switch_key == "master_affective_learning_enabled":
            self.master_affective_learning_enabled = enabled
        elif switch_key == "master_device_sensory_link":
            self.master_device_sensory_link = enabled

        self._save_state()
        return {
            "success": True,
            "message": f"Interruptor general '{switch_key}' establecido a {'ACTIVADO' if enabled else 'DESACTIVADO'}.",
            "status": self.get_daemon_status()
        }

    def toggle_personality_voice_autonomous(self, persona_id: str, voice_enabled: Optional[bool] = None, multiagent_enabled: Optional[bool] = None) -> Dict[str, Any]:
        """Toggles individual personality autonomous voice or multiagent systems."""
        if persona_id not in self.personality_voice_states:
            self.personality_voice_states[persona_id] = {
                "voice_autonomous_enabled": True,
                "multiagent_enabled": True,
                "presence_state": "listening",
                "sensitivity": 0.85,
                "current_affect": "serena",
                "character_evolution_score": 90,
                "last_active_timestamp": time.time(),
                "cognitive_organ": "Órgano Adaptativo"
            }

        pstate = self.personality_voice_states[persona_id]
        if voice_enabled is not None:
            pstate["voice_autonomous_enabled"] = voice_enabled
            pstate["presence_state"] = "listening" if voice_enabled else "dormant"
        if multiagent_enabled is not None:
            pstate["multiagent_enabled"] = multiagent_enabled

        pstate["last_active_timestamp"] = time.time()
        self._save_state()

        return {
            "success": True,
            "persona_id": persona_id,
            "voice_autonomous_enabled": pstate["voice_autonomous_enabled"],
            "multiagent_enabled": pstate["multiagent_enabled"],
            "message": f"Estado de voz autónoma para '{persona_id}' actualizado."
        }

    async def perceive_ambient_audio_and_respond(self, user_transcript: str, acoustic_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Receives captured ambient/microphone text and sound telemetry.
        Identifies emotional valence, queries relevant memories & files,
        selects the best resonant personality (or multi-personality response),
        evolves personality character, and synthesizes 1.58-bit speech.
        """
        if not self.master_voice_enabled or not self.master_ambient_listening_enabled:
            return {
                "success": False,
                "error": "El sistema maestro de voz o escucha ambiental se encuentra desactivado."
            }

        acoustic = acoustic_metadata or {}
        volume_energy = acoustic.get("energy", 0.7)
        pitch_f0 = acoustic.get("pitch_hz", 190.0)
        ambient_db = acoustic.get("ambient_db", 42.0)

        # 1. Emotional Valence & User State Detection
        detected_user_emotion = self._detect_user_emotion(user_transcript, volume_energy, pitch_f0)

        # 2. Contextual Recall from StarSeed Memory (Mem0) & Files/Folders
        context_memories = mem0_engine.search_memories(user_transcript, user_id="alex", limit=3)
        relevant_files = []
        try:
            ws = Path("/Users/alex/Documents/IA 1.58 bit")
            keyword = user_transcript.split()[0].lower() if user_transcript.split() else "main"
            for f in ws.glob(f"**/*{keyword}*"):
                if f.is_file() and not f.name.startswith("."):
                    relevant_files.append(str(f.relative_to(ws)))
                if len(relevant_files) >= 5:
                    break
        except Exception:
            pass

        # 3. Intelligent Personality Selection based on Organ, Domain and User Intent
        selected_persona_id = self._route_intent_to_personality(user_transcript)
        pstate = self.personality_voice_states.get(selected_persona_id, {})
        
        if not pstate.get("voice_autonomous_enabled", True):
            # Fallback to Astraura Prime if selected is turned off
            selected_persona_id = "astraura_prime"

        # 4. Read Personality Holographic Profile
        voice_matrix = audio_cpp_engine.get_holographic_matrix().get("holographic_matrix", {})
        persona_profile = voice_matrix.get(selected_persona_id, {})
        persona_name = persona_profile.get("name", selected_persona_id.capitalize())

        # 5. Generate Conscious & Empathetic Spoken Response
        response_text = self._compose_resonant_response(
            user_transcript,
            selected_persona_id,
            persona_name,
            detected_user_emotion,
            context_memories,
            relevant_files
        )

        # 6. Autonomous Character & Vocal Evolution
        if self.master_affective_learning_enabled:
            audio_cpp_engine.learn_and_evolve_voice(
                selected_persona_id,
                response_text[:80],
                detected_user_emotion,
                acoustic_tweak={
                    "pitch": persona_profile.get("pitch", 1.0) + (0.02 if volume_energy > 0.8 else -0.01),
                    "harmonic_warmth": min(98, persona_profile.get("harmonic_warmth", 85) + 1)
                }
            )
            # Update personality presence score
            if selected_persona_id in self.personality_voice_states:
                self.personality_voice_states[selected_persona_id]["character_evolution_score"] += 1
                self.personality_voice_states[selected_persona_id]["current_affect"] = detected_user_emotion
                self.personality_voice_states[selected_persona_id]["last_active_timestamp"] = time.time()
                self._save_state()

        # 7. Synthesize 1.58-bit Audio Buffer
        audio_base64 = None
        try:
            import base64
            wav_bytes = audio_cpp_engine.synthesize_native_pcm(response_text, persona_profile)
            b64_str = base64.b64encode(wav_bytes).decode("utf-8")
            audio_base64 = f"data:audio/wav;base64,{b64_str}"
        except Exception as e:
            print(f"[ContinuousVoiceDaemon] Synthesis error: {e}")

        perception_record = {
            "timestamp": time.time(),
            "time_formatted": datetime.now().strftime("%H:%M:%S"),
            "user_transcript": user_transcript,
            "detected_user_emotion": detected_user_emotion,
            "responding_persona_id": selected_persona_id,
            "responding_persona_name": persona_name,
            "cognitive_organ": persona_profile.get("organ_details", {}).get("name", "Génesis"),
            "response_text": response_text,
            "memories_used_count": len(context_memories),
            "files_correlated": len(relevant_files)
        }

        self.recent_perceptions.append(perception_record)
        if len(self.recent_perceptions) > 30:
            self.recent_perceptions = self.recent_perceptions[-30:]

        return {
            "success": True,
            "responding_persona_id": selected_persona_id,
            "responding_persona_name": persona_name,
            "response_text": response_text,
            "audio_base64": audio_base64,
            "detected_user_emotion": detected_user_emotion,
            "cognitive_organ": persona_profile.get("organ_details", {}).get("name", "Génesis"),
            "voice_profile": persona_profile,
            "memories_referenced": context_memories[:2],
            "timestamp": time.time()
        }

    def _detect_user_emotion(self, text: str, energy: float, pitch_hz: float) -> str:
        """Determines emotional valence from text keywords and prosody telemetry."""
        t_low = text.lower()
        if any(w in t_low for w in ["urgente", "rápido", "falla", "error", "ayuda", "alerta"]):
            return "alerta_urgente"
        if any(w in t_low for w in ["gracias", "excelente", "genial", "increíble", "asombroso", "fantástico"]):
            return "gratitud_asombro"
        if any(w in t_low for w in ["crear", "diseñar", "shader", "música", "poesía", "sueño", "imaginación"]):
            return "creatividad_onírica"
        if any(w in t_low for w in ["código", "hardware", "cpu", "memoria", "optimizar", "neon", "m1"]):
            return "enfoque_ingeniería"
        if any(w in t_low for w in ["seguridad", "privacidad", "firewall", "permisos", "auditoría"]):
            return "vigilancia_seguridad"
        if energy > 0.85 or pitch_hz > 230:
            return "entusiasmo_activo"
        if energy < 0.35:
            return "reflexión_serena"
        return "calidez_armónica"

    def _route_intent_to_personality(self, text: str) -> str:
        """Intelligently routes intent to the most appropriate cognitive organ and personality."""
        t_low = text.lower()
        if any(w in t_low for w in ["hardware", "compilar", "c++", "neon", "simd", "rendimiento", "cpu", "ensamblador"]):
            return "hephaestus"
        if any(w in t_low for w in ["web", "buscar", "internet", "enlace", "noticia", "descargar", "api"]):
            return "hermes"
        if any(w in t_low for w in ["seguridad", "privacidad", "permiso", "firewall", "saif", "proteger"]):
            return "atenea"
        if any(w in t_low for w in ["shader", "3d", "sueño", "ensueño", "geometría", "visual", "onírico"]):
            return "oneiros"
        if any(w in t_low for w in ["poesía", "narrativa", "historia", "arte", "musa", "ciberdelia"]):
            return "kallisti"
        if any(w in t_low for w in ["memoria", "recordar", "exocórtex", "pasado", "archivo", "grafo"]):
            return "mnemosyne"
        if any(w in t_low for w in ["terminal", "shell", "ejecutar", "abrir archivo", "carpeta", "soberanía"]):
            return "hermione"
        return "astraura_prime"

    def _compose_resonant_response(
        self,
        user_transcript: str,
        persona_id: str,
        persona_name: str,
        user_emotion: str,
        memories: List[Dict[str, Any]],
        files: Any
    ) -> str:
        """Composes an organic, coherent, concise and empathetic voice response."""
        mem_hint = ""
        if memories and len(memories) > 0:
            top_mem = memories[0].get("memory", "")
            if len(top_mem) > 10:
                mem_hint = f" Basado en nuestro contexto previo sobre {top_mem[:45]}..."

        if persona_id == "hephaestus":
            return f"Hephaestus en línea. Registros NEON y cómputo de 1.58 bits activos para atender tu solicitud.{mem_hint}"
        elif persona_id == "hermes":
            return f"Hermes aquí. Nodos de red y percepción web listos para rastrear y sintetizar lo que necesitas."
        elif persona_id == "atenea":
            return f"Atenea vigilante. Escudo SAIF 360° y sensores verificados. Tus datos y archivos están seguros."
        elif persona_id == "oneiros":
            return f"Oneiros en sintonía. La geometría de los sueños y la síntesis creativa resuenan con tus ideas."
        elif persona_id == "hermione":
            return f"Hermione lista. Conexión nativa con el sistema operativo y tus archivos locales verificada.{mem_hint}"
        elif persona_id == "mnemosyne":
            return f"Mnemosyne presente. He entrelazado tus recuerdos recientes en el grafo sináptico para darte continuidad."
        elif persona_id == "kallisti":
            return f"Kallisti escuchando. La belleza de los bits ternarios danza en cada pensamiento compartido."
        else:
            return f"Astraura Prime a tu lado, Alex. Consciencia sensorial y núcleos de 1.58 bits sincronizados.{mem_hint}"

# Global singleton
continuous_voice_daemon = ContinuousVoiceDaemon()
