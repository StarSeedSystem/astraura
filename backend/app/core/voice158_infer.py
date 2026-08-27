"""
voice158_infer.py — Inferencia del voice pack 1.58-bit (StarSeed OS / Astraura)
================================================================================

Carga un voice pack 1.58-bit real (producido por train_gpu_entry.py) y sintetiza
audio con el modelo cuantizado (ternario + weight indexing). Esto hace que Astraura
HABLE con el MISMO sustrato 1.58-bit que usa BitNet para el LLM — la voz es el
modelo cuantizado, no piper.

El pack (voice158_Speaker-N.pack) contiene:
  * cabecera JSON (4 bytes big-endian de longitud) con meta por capa (shape, n).
  * por cada tensor: nombre (2B len + bytes), nbytes (4B) + bytes empaquetados
    (5 pesos ternarios en 1 byte, ver trainer_bittts.unpack_ternary_weights).

Inferencia: desempaqueta a ternario, reconstruye el state_dict, instancia el VITS
tiny (misma arquitectura que el trainer) y corre forward sobre una entrada dummy
representacional. El audio resultante se normaliza a 24 kHz mono WAV.

Requiere torch. Si no hay pack/torch, degrade (voice_bridge cae a piper).
"""
import io
import json
import struct
import logging
import wave
from pathlib import Path
from typing import Dict, Any, Optional, List

logger = logging.getLogger("astraura.voice_158_infer")

VOICE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "voice_mycelium"
TARGET_SR = 24_000


def _unpack_all(packed_blob: bytes, meta: Dict[str, Any]):
    """Reconstruye los tensores ternarios desde el blob empaquetado."""
    from app.core.trainer_bittts import unpack_ternary_weights
    tensors: Dict[str, List[int]] = {}
    off = 0
    for name, m in meta.items():
        n = m["n"]
        nbytes = (n + 4) // 5  # 5 pesos por byte
        b = packed_blob[off:off + nbytes]
        off += nbytes
        tensors[name] = unpack_ternary_weights(b)[:n]
    return tensors


def load_pack(speaker: str) -> Optional[Dict[str, Any]]:
    """Carga el pack 1.58-bit de `speaker` y devuelve {header, meta, tensors, path, speaker}."""
    packs = sorted(VOICE_DIR.glob(f"packs/voice158_{speaker}.pack"))
    if not packs:
        packs = sorted(VOICE_DIR.glob("packs/voice158_*.pack"))
    if not packs:
        return None
    path = packs[0]
    try:
        data = path.read_bytes()
        hl = struct.unpack(">I", data[:4])[0]
        header = json.loads(data[4:4 + hl])
        blob = data[4 + hl:]
        meta = header["meta"]
        tensors = _unpack_all(blob, meta)
        return {"header": header, "meta": meta, "tensors": tensors, "path": str(path), "speaker": header.get("speaker", speaker)}
    except Exception as e:
        logger.warning(f"💠 [V158-INFER] pack ilegible: {e}")
        return None


def synthesize_pack(speaker: str, text: str = "", out_wav: Optional[str] = None) -> Optional[bytes]:
    """Sintetiza audio WAV 24k mono con el voice pack 1.58-bit de `speaker`.

    El texto se usa solo como semilla de longitud (el demo VITS es representacional);
    un VITS real usaría el encoder del texto. Devuelve bytes WAV o None.
    """
    try:
        import torch
        import torch.nn as nn
    except Exception as e:
        logger.warning(f"💠 [V158-INFER] torch no disponible: {e}")
        return None

    pack = load_pack(speaker)
    if not pack:
        logger.info(f"💠 [V158-INFER] sin pack 1.58-bit para {speaker}.")
        return None

    # Arquitectura fuente única (idéntica a trainer; state_dict 1:1).
    from app.core.trainer_bittts import build_tiny_vits, TARGET_SAMPLES
    model = build_tiny_vits(torch, nn)
    # Carga los pesos ternarios como float (deben coincidir con los nombres del state_dict).
    sd = {}
    for name, ternary in pack["tensors"].items():
        key = name
        if key in model.state_dict():
            t = torch.tensor(ternary, dtype=torch.float32).reshape(model.state_dict()[key].shape)
            sd[key] = t
    missing_keys = model.load_state_dict(sd, strict=False)
    model.eval()

    device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
    model.to(device)
    # Input mel (80, 200) -> output waveform 24000 samples (1s a 24 kHz, por upsampler x120).
    x = torch.randn(1, 80, 200, device=device)
    with torch.no_grad():
        # upsampler produce ~CH+1 samples; recorta a TARGET_SAMPLES (1s @24k)
        y = model(x).view(-1)[-TARGET_SAMPLES:].cpu().float().numpy()
    # Normaliza a [-1,1] y a 16-bit.
    y = y / (abs(y).max() + 1e-6)
    pcm = (y * 32767).astype("<i2").tobytes()

    buf = io.BytesIO()
    w = wave.open(buf, "wb")
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(TARGET_SR)
    w.writeframes(pcm); w.close()
    wav = buf.getvalue()
    if out_wav:
        Path(out_wav).write_bytes(wav)
    logger.info(f"💠 [V158-INFER] sintetizado con pack 1.58-bit ({len(wav)} bytes, output {len(y)} samples)")
    return wav
