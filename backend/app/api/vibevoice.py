"""
StarSeed OS · Astraura 1.58-bit — Servidor de VOZ VibeVoice (Microsoft, fork comunidad).

VibeVoice es un TTS expresivo MULTI-LOCUTOR de larga duración (hasta 4 speakers
en un mismo guion, clonación de voz desde ~30 s de audio). Es el motor que da
"varias personalidades con voces distintas en un mismo diálogo" en el OS.

ARQUITECTURA (auto: local o nube, según el dispositivo):
  · Local con GPU (neurona/PC): este mismo router sirve VibeVoice en la máquina.
  · Nube: el MISMO router se despliega en Cloud Run GPU y el OS lo llama por URL.
  · Sin GPU / sin endpoint: el OS cae solo al siguiente eslabón (OmniVoice/OpenVoice)
    — Aurora NUNCA queda muda.

REQUISITO DURO: GPU (VRAM para los modelos diffusion + LLM Qwen). En CPU/8 GB sin
GPU NO corre; por eso el router es OPCIONAL y no se monta a menos que
VIBEVOICE_ENABLED=1 y el paquete `vibevoice` esté instalado.

El modelo se carga PEREZOSAMENTE (al primer /synthesize) para no penalizar el
arranque del backend. Cualquier fallo devuelve 503 con mensaje claro, nunca
revienta el backend.
"""

from __future__ import annotations

import base64
import io
import os
import threading
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel

router = APIRouter(prefix="/api/vibevoice", tags=["VibeVoice Multi-Speaker TTS"])

# ── Config ───────────────────────────────────────────────────────────────────
VIBEVOICE_ENABLED = os.environ.get("VIBEVOICE_ENABLED", "0") == "1"
VIBEVOICE_REPO = os.environ.get(
    "VIBEVOICE_REPO",
    os.path.expanduser("~/vibevoice-research"),
)
VIBEVOICE_MODEL_PATH = os.environ.get(
    "VIBEVOICE_MODEL_PATH",
    os.path.expanduser("/tmp/vibevoice-model"),
)
VIBEVOICE_DEVICE = os.environ.get("VIBEVOICE_DEVICE", "cuda")

_lock = threading.Lock()
_demo_instance = None  # instancia perezosa de VibeVoiceDemo
_available_voices: Dict[str, str] = {}  # nombre -> path (caché tras cargar)


# ── Esquemas ───────────────────────────────────────────────────────────────
class VibeVoiceSynthesizeRequest(BaseModel):
    # Guion YA formateado por el cliente OS: "Speaker 0: texto\nSpeaker 1: texto…"
    # (cada personalidad activa = un speaker, 1..4). Si se pasa `turns`, el
    # servidor lo formatea. Uno de los dos es obligatorio.
    script: Optional[str] = None
    turns: Optional[List[str]] = None
    # Nombres de voces preloaded del servidor (las de demo/voices/, p.ej.
    # "en-Alice_woman"). Si se omiten, el servidor asigna las primeras N
    # voces disponibles en orden. La clonación desde audio NO está soportada
    # por este fork de la comunidad (solo voces preset).
    speakers: Optional[List[str]] = None
    cfg_scale: float = 1.3
    inference_steps: Optional[int] = None
    seed: Optional[int] = None
    disable_voice_cloning: bool = False


# ── Carga perezosa del modelo ───────────────────────────────────────────────
def _ensure_demo() -> Any:
    """Carga VibeVoice una vez (lazy). Lanza RuntimeError si no disponible."""
    global _demo_instance, _available_voices
    if _demo_instance is not None:
        return _demo_instance
    if not VIBEVOICE_ENABLED:
        raise RuntimeError(
            "VibeVoice deshabilitado (VIBEVOICE_ENABLED != 1). Actívalo en la "
            "neurona/servidor con GPU."
        )
    repo = VIBEVOICE_REPO
    if not os.path.isdir(repo):
        raise RuntimeError(
            f"Repo VibeVoice no encontrado en {repo}. Clona "
            "github.com/vibevoice-community/VibeVoice ahí."
        )
    try:
        import sys
        sys.path.insert(0, repo)
        from demo.gradio_demo import VibeVoiceDemo  # type: ignore
    except Exception as e:  # pragma: no cover - depende del entorno GPU
        raise RuntimeError(f"No se pudo importar VibeVoice: {e}")
    demo = VibeVoiceDemo(
        model_path=VIBEVOICE_MODEL_PATH,
        device=VIBEVOICE_DEVICE,
    )
    _available_voices = getattr(demo, "available_voices", {}) or {}
    _demo_instance = demo
    return demo


def _format_script(turns: List[str], num_speakers: int) -> str:
    """Convierte una lista de turnos a 'Speaker N: texto' alternando speakers."""
    lines = []
    for i, t in enumerate(turns):
        lines.append(f"Speaker {i % num_speakers}: {t}")
    return "\n".join(lines)


def _to_wav_bytes(audio_any: Any) -> bytes:
    """VibeVoice devuelve una ruta/ndarray; lo normalizamos a WAV bytes."""
    # Caso 1: ruta de archivo
    if isinstance(audio_any, str) and os.path.isfile(audio_any):
        with open(audio_any, "rb") as f:
            return f.read()
    # Caso 2: bytes ya en WAV
    if isinstance(audio_any, (bytes, bytearray)):
        return bytes(audio_any)
    # Caso 3: ndarray → lo escribimos como WAV mono 24k (VibeVoice ~24 kHz)
    try:
        import numpy as np
        import soundfile as sf

        arr = np.asarray(audio_any)
        buf = io.BytesIO()
        sf.write(buf, arr, 24000, format="WAV")
        return buf.getvalue()
    except Exception as e:
        raise RuntimeError(f"No se pudo serializar el audio de VibeVoice: {e}")


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.get("/status")
async def vibevoice_status() -> Dict[str, Any]:
    return {
        "available": VIBEVOICE_ENABLED and _demo_instance is not None,
        "enabled": VIBEVOICE_ENABLED,
        "device": VIBEVOICE_DEVICE,
        "repo": VIBEVOICE_REPO,
        "model_path": VIBEVOICE_MODEL_PATH,
        "loaded": _demo_instance is not None,
        "voices": list(_available_voices.keys()),
    }


@router.get("/voices")
async def vibevoice_voices() -> Dict[str, Any]:
    """Lista de voces preloaded disponibles en el servidor."""
    with _lock:
        if _demo_instance is None:
            try:
                _ensure_demo()
            except RuntimeError:
                pass
    return {"voices": list(_available_voices.keys())}


@router.post("/synthesize")
async def vibevoice_synthesize(
    req: VibeVoiceSynthesizeRequest = Body(...),
) -> Any:
    """Sintetiza un diálogo multi-locutor. Devuelve WAV binario (audio/wav)."""
    if not req.script and not req.turns:
        raise HTTPException(
            status_code=400,
            detail="Proporciona `script` (formato 'Speaker N: texto') o `turns`.",
        )

    with _lock:
        try:
            demo = _ensure_demo()
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e))

    # Resolver el guion
    if req.turns:
        script = _format_script(req.turns, len(req.turns) or 1)
    else:
        script = req.script  # type: ignore

    # Contar speakers distintos presentes en el guion ("Speaker N:")
    import re as _re
    speaker_ids = set(
        int(m.group(1))
        for m in _re.finditer(r"Speaker\s+(\d+)\s*:", script or "")
    )
    num_speakers = max(speaker_ids) + 1 if speaker_ids else 1
    num_speakers = max(1, min(num_speakers, 4))

    # Resolver voces: usar los nombres pedidos si existen, si no las primeras N
    # voces disponibles del servidor en orden.
    avail = list(_available_voices.keys())
    chosen: List[Optional[str]] = []
    req_speakers = req.speakers or []
    for i in range(num_speakers):
        name = req_speakers[i] if i < len(req_speakers) else None
        if name and name in _available_voices:
            chosen.append(name)
        elif i < len(avail):
            chosen.append(avail[i])
        else:
            chosen.append(None)
    s1, s2, s3, s4 = (chosen + [None, None, None, None])[:4]

    try:
        # generate_podcast_streaming es un generador; tomamos el ÚLTIMO yield
        # donde `complete_wav_path` no es None (audio completo en disco).
        final_audio = None
        for item in demo.generate_podcast_streaming(
            num_speakers=num_speakers,
            script=script,
            speaker_1=s1,
            speaker_2=s2,
            speaker_3=s3,
            speaker_4=s4,
            cfg_scale=req.cfg_scale,
            inference_steps=req.inference_steps,
            seed=req.seed,
            disable_voice_cloning=req.disable_voice_cloning,
        ):
            # item = ((sr, audio_stream), complete_wav_path|None, log, update)
            try:
                complete = item[1]
            except Exception:
                complete = None
            if complete is not None:
                final_audio = complete
        if final_audio is None:
            raise RuntimeError("VibeVoice no produjo audio.")
        wav = _to_wav_bytes(final_audio)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Fallo VibeVoice: {e}")

    from fastapi.responses import Response

    return Response(content=wav, media_type="audio/wav")
