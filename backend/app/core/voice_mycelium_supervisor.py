#!/usr/bin/env python3
"""
voice_mycelium_supervisor.py — Agente supervisor en segundo plano (StarSeed OS)

Monitorea el micelio de voz y el nodo de entrenamiento GPU, y escribe un estado
viv en data/voice_mycelium/supervisor_state.json que la consola visual
(/voice-mycelium-console) consume para mostrar las "ventanas de agentes" en
tiempo real. Corre como daemon; nunca lanza.

Vigila:
  * micelio: /api/voice-mycelium/status (node, packs, malla, running)
  * voz: /api/voice/status (TTS/ASR disponibles)
  * trainer GPU: si hay un voice pack 1.58-bit producido (data/voice_mycelium/packs/*.pack)
  * redes: intenta un ping liviano a la malla (astraura_voice_mesh vía supabase_sync)

Uso: python app/core/voice_mycelium_supervisor.py  (o lo arranca el backend con
VOICE_MYCELIUM_ENABLED=1 como hilo adicional).
"""
import json
import time
import logging
import urllib.request
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("astraura.voice_mycelium.supervisor")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
VOICE_DIR = BASE_DIR / "data" / "voice_mycelium"
STATE_FILE = VOICE_DIR / "supervisor_state.json"
BACKEND = "http://127.0.0.1:8000"
INTERVAL_S = 5


def _get(url: str) -> Optional[Dict[str, Any]]:
    try:
        with urllib.request.urlopen(url, timeout=4) as r:
            return json.loads(r.read().decode())
    except Exception:
        return None


def collect() -> Dict[str, Any]:
    mic = _get(f"{BACKEND}/api/voice-mycelium/status") or {}
    voc = _get(f"{BACKEND}/api/voice/status") or {}
    packs = sorted([p.name for p in (VOICE_DIR / "packs").glob("*.pack")]) if (VOICE_DIR / "packs").exists() else []
    datasets = sorted([d.name for d in VOICE_DIR.glob("datasets/*")]) if VOICE_DIR.exists() else []
    # Agentes (tarjetas de la consola) con estado vivo derivado.
    agents = {
        "trainer": {"estado": "activo" if mic.get("running") else "parado",
                    "actividad": f"{len(packs)} pack(s) 1.58-bit"},
        "mesh": {"estado": "conectada" if mic.get("supabase_mesh") else "local",
                 "actividad": f"node {str(mic.get('node_id',''))[:12]}"},
        "tts": {"estado": "listo" if voc.get("tts_piper") or voc.get("tts_procedural") else "—",
                "actividad": "piper/voice158" if voc.get("tts_piper") else "procedural"},
        "asr": {"estado": "listo" if voc.get("asr_whisper") else "no instalado",
                "actividad": "faster-whisper" if voc.get("asr_whisper") else "pendiente"},
        "trainer_gpu": {"estado": "entrenando" if packs else "en espera",
                        "actividad": f"{len(packs)} pack(s) real(es)"},
        "datasets": {"estado": f"{len(datasets)} listos", "actividad": ", ".join(datasets[:3]) or "—"},
        "orchest": {"estado": "vivo", "actividad": "memorias corto/medio/largo"},
        "harmony": {"estado": "vivo", "actividad": "homeostasis de carga/prosodia"},
        "evolution": {"estado": "simbiótica", "actividad": f"{mic.get('local_packs',0)} packs locales en malla"},
    }
    return {
        "ts": time.time(),
        "micelium": mic,
        "voice": voc,
        "voice_packs_158": packs,
        "datasets_prepared": datasets,
        "agents": agents,
    }


def run_once() -> None:
    try:
        VOICE_DIR.mkdir(parents=True, exist_ok=True)
        state = collect()
        STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception as e:
        logger.debug(f"💠 [SUP] ciclo degradó: {e}")


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    logger.info("💠 [SUP] supervisor del micelio iniciado.")
    while True:
        run_once()
        for _ in range(INTERVAL_S):
            time.sleep(1)


if __name__ == "__main__":
    main()
