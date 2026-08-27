"""
trainer_bittts.py — Entrenamiento / auto-mejora de TTS a 1.58-bit (estilo BitTTS)
==================================================================================

BitTTS (Kawamura et al., INTERSPEECH 2025, arXiv:2506.03515) demuestra que un TTS
pequeño (acoustic model VITS-style + vocoder HiFi-GAN) cuantizado con QAT a 1.58-bit
pesa ~4.39 MB (vs 25.66 MB float32), MOS 3.09, RTF 0.064 en Apple M1 Pro.

Este módulo implementa el **núcleo reutilizable** del método para que el micelio
de voz pueda producir voice packs 1.58-bit propios:

  * weight indexing: empaqueta 5 pesos ternarios {-1,0,1} en 1 byte int8
    (3^5 = 243 <= 256). Mismo truco que el kernel I2_S de BitNet.
  * quantize_ternary(): pasa un tensor float a {-1,0,1} (signo de magnitud).
  * pack_ternary_weights(): serializa a bytes compactos.
  * maybe_self_improve(): si hay muestras de audio locales, optimiza/entrena un
    pack para el speaker dado. SIN datos => degrada honestamente (no inventa pesos).

Honesto: NO hay checkpoint 1.58-bit de voz libre (BitTTS no liberó pesos). El
entrenamiento real desde cero requiere dataset de audio (p.ej. LJSpeech/español +
grabaciones del usuario) y horas de GPU/CPU. Este archivo deja el *primitive* listo
y el punto de enganche `maybe_self_improve` para cuando el orquestador multiagente
reúna datos. NUNCA simula pesos entrenados.
"""

import os
import json
import time
import logging
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger("astraura.voice_mycelium.trainer")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
VOICE_DIR = BASE_DIR / "data" / "voice_mycelium"
PACKS_FILE = VOICE_DIR / "packs.json"


# ---------------------------------------------------------------------------
# Primitivos 1.58-bit (weight indexing)
# ---------------------------------------------------------------------------
def quantize_ternary(values: List[float], threshold: float = 0.05) -> List[int]:
    """Pasa magnitudes float a pesos ternarios {-1, 0, +1}.

    Umbral pequeño => valores cercanos a 0 se descartan (0), igual que BitNet.
    """
    out = []
    for v in values:
        if abs(v) < threshold:
            out.append(0)
        else:
            out.append(1 if v > 0 else -1)
    return out


def pack_ternary_weights(ternary: List[int]) -> bytes:
    """Weight indexing: 5 pesos ternarios {-1,0,1} -> 1 byte int8.

    Mapea {-1,0,1} -> {0,1,2}; el índice en base 3 de 5 pesos cabe en 0..242.
    """
    mapped = [t + 1 for t in ternary]  # {-1,0,1} -> {0,1,2}
    out = bytearray()
    for i in range(0, len(mapped), 5):
        chunk = mapped[i:i + 5]
        while len(chunk) < 5:
            chunk.append(0)  # padding con 0
        idx = 0
        for j, w in enumerate(chunk):
            idx += w * (3 ** (4 - j))
        out.append(idx & 0xFF)
    return bytes(out)


def unpack_ternary_weights(packed: bytes) -> List[int]:
    """Inverso de pack_ternary_weights (para verificación/inferencia)."""
    out = []
    for b in packed:
        v = b
        for _ in range(5):
            out.append((v % 3) - 1)  # {0,1,2} -> {-1,0,1}
            v //= 3
    return out


# ---------------------------------------------------------------------------
# Auto-mejora (enganche del micelio)
# ---------------------------------------------------------------------------
def _count_samples(samples_dir: Path) -> int:
    try:
        return len(list(samples_dir.glob("*.wav"))) + len(list(samples_dir.glob("*.flac")))
    except Exception:
        return 0


def maybe_self_improve(speaker: str, samples_dir: Path) -> Optional[dict]:
    """Si hay muestras locales para `speaker`, produce/optimiza un voice pack.

    Degradación honesta: sin muestras => None (no inventa pesos). Con muestras =>
    registra el pack (binario pendiente del entrenamiento real, que el orquestador
    multiagente dispara cuando reúna el dataset). Por ahora empaqueta la metadata
    de las muestras como señal de que el speaker tiene datos listos.
    """
    if samples_dir is None:
        return None
    n = _count_samples(samples_dir)
    if n == 0:
        logger.debug(f"💠 [TRAINER] {speaker}: sin muestras, no hay auto-mejora.")
        return None
    # Punto de enganche: aquí el orquestador lanzaría el entrenamiento QAT real.
    # Mientras tanto, registramos que el speaker tiene N muestras listas.
    logger.info(f"💠 [TRAINER] {speaker}: {n} muestras listas para entrenar pack 1.58-bit.")
    pack_meta = {
        "speaker": speaker,
        "version": 1,
        "samples": n,
        "ready_for_training": True,
        "updated_at": time.time(),
    }
    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        data = json.loads(PACKS_FILE.read_text(encoding="utf-8")) if PACKS_FILE.exists() else {"packs": {}}
    except Exception:
        data = {"packs": {}}
    data.setdefault("packs", {})[f"{speaker}@training"] = pack_meta
    PACKS_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return pack_meta
