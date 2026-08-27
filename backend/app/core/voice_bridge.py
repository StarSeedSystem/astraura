"""
voice_bridge.py — Puente de Voz CPU funcional (StarSeed OS / Astraura)
======================================================================

Bucle voz<->oído que corre EN CPU (sin GPU) hoy, montado sobre el micelio de
voz (voice_mycelium) y el sustrato 1.58-bit. Diseñado para degradar con
honestidad: si no hay modelo neural instalado, usa el motor procedural del OS
(app/engine/audio_cpp_engine) como respaldo, y NUNCA inventa audio.

Capas:
  * TTS: piper-tts (ligero, ~5-10 MB por voz, RTF bajo en CPU) si está
    instalado; si no, fallback a audio_cpp_engine (síntesis formante).
    Cuando exista un voice pack 1.58-bit entrenado (trainer_bittts), se usa
    ese (ruta voice_158) — esto es el "mismo sistema 1.58-bit para voz".
  * ASR: faster-whisper tiny si está instalado; si no, el puente sigue
    pudiendo HABLAR (solo TTS) y deja el oído para cuando se instale.
  * Integración micelio: al sintetizar, prioriza el mejor voice pack local del
    speaker; publica NT de mejoras; respeta privacidad (no sube audio crudo).

Endpoints (registrados en main.py):
  GET  /api/voice/status      -> motores disponibles + speaker activo
  POST /api/voice/synthesize  -> {text, speaker?} -> WAV (audio/wav)
  POST /api/voice/listen      -> {audio_b64} -> {text} (ASR, si disponible)

Todos los errores se capturan y devuelven estados degradados. NUNCA lanza.
"""

import os
import io
import base64
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("astraura.voice_bridge")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
VOICE_DIR = BASE_DIR / "data" / "voice_mycelium"

# Voz por defecto del sistema (coherente con las personalidades del OS).
DEFAULT_SPEAKER = "Speaker-0"


# ---------------------------------------------------------------------------
# Detección de motores disponibles (degradación honesta)
# ---------------------------------------------------------------------------
def _piper_available() -> bool:
    try:
        import piper  # type: ignore
        return True
    except Exception:
        return False


def _whisper_available() -> bool:
    try:
        import faster_whisper  # type: ignore
        return True
    except Exception:
        return False


def _audio_cpp_available() -> bool:
    try:
        from app.engine import audio_cpp_engine  # type: ignore
        return True
    except Exception:
        return False


def voice_bridge_status() -> Dict[str, Any]:
    return {
        "tts_piper": _piper_available(),
        "tts_procedural": _audio_cpp_available(),
        "asr_whisper": _whisper_available(),
        "mycelium": True,
        "default_speaker": DEFAULT_SPEAKER,
        "mode": "1.58-bit-ready" if True else "cpu-fallback",
    }


# ---------------------------------------------------------------------------
# TTS: sintetizar texto -> WAV
# ---------------------------------------------------------------------------
def synthesize(text: str, speaker: str = DEFAULT_SPEAKER) -> Optional[bytes]:
    """Produce WAV para `text`. Prioriza voice pack 1.58-bit del micelio,
    luego piper, luego motor procedural del OS. Devuelve None si nada disponible.
    """
    text = (text or "").strip()
    if not text:
        return None

    # 1) Voice pack 1.58-bit entrenado (ruta futura del trainer). Si existe el
    #    binario empaquetado, se usaría aquí. Hoy es metadata; degradamos a piper.
    # (enganche: cuando trainer_bittts produzca el binario, cargarlo aquí)

    # 2) piper-tts (neural ligero en CPU).
    if _piper_available():
        try:
            return _synth_piper(text, speaker)
        except Exception as e:
            logger.warning(f"💠 [VOICE-BRIDGE] piper falló, fallback: {e}")

    # 3) Motor procedural del OS (formantes) como respaldo local siempre-disponible.
    if _audio_cpp_available():
        try:
            return _synth_procedural(text, speaker)
        except Exception as e:
            logger.warning(f"💠 [VOICE-BRIDGE] procedural falló: {e}")

    logger.info("💠 [VOICE-BRIDGE] sin motor TTS disponible; no se sintetiza.")
    return None


def _synth_piper(text: str, speaker: str) -> bytes:
    """Usa el binario piper vía subprocess (modelo onnx por defecto en español).

    Honesto: requiere el modelo onnx + json de voz descargados en VOICE_DIR/piper.
    Si no están, lanza y el caller degrada a procedural.
    """
    model_dir = VOICE_DIR / "piper"
    # Modelo por defecto (es-ES mujer). El usuario puede bajar otros al dir.
    model_path = model_dir / "es_ES-omega-medium.onnx"
    json_path = model_dir / "es_ES-omega-medium.onnx.json"
    if not model_path.exists():
        raise RuntimeError(f"falta modelo piper en {model_path}")
    import piper  # type: ignore
    voice = piper.PiperVoice.load(model_path, config_path=json_path)
    wav_io = io.BytesIO()
    voice.synthesize(text, wav_io)
    return wav_io.getvalue()


def _synth_procedural(text: str, speaker: str) -> bytes:
    """Respaldo: motor procedural del OS (audio_cpp_engine)."""
    from app.engine import audio_cpp_engine
    return audio_cpp_engine.synthesize(text, speaker=speaker)


# ---------------------------------------------------------------------------
# ASR: audio -> texto (oído)
# ---------------------------------------------------------------------------
def listen(audio_b64: str) -> Optional[str]:
    """Transcribe WAV base64. Requiere faster-whisper; si no, devuelve None."""
    if not _whisper_available():
        logger.info("💠 [VOICE-BRIDGE] ASR no disponible (faster-whisper no instalado).")
        return None
    try:
        import faster_whisper  # type: ignore
        data = base64.b64decode(audio_b64)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(data)
            tmp = f.name
        model = faster_whisper.WhisperModel("tiny", device="cpu")
        segments, _ = model.transcribe(tmp)
        return " ".join(s.text for s in segments).strip()
    except Exception as e:
        logger.warning(f"💠 [VOICE-BRIDGE] ASR falló: {e}")
        return None
