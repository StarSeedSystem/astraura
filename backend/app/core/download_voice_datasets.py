#!/usr/bin/env python3
"""
download_voice_datasets.py — Descarga los datasets recomendados para el trainer
1.58-bit de Astraura (StarSeed OS).

Los datasets fueron investigados por el subagente multiagente (2026-08-26):
prioridad español + multilingüe + licencia libre + multi-speaker. Ver
architecture/voice-158-myelium-symbiotic.md para la justificación.

Uso:
  .venv/bin/python app/core/download_voice_datasets.py --all
  .venv/bin/python app/core/download_voice_datasets.py --only common_voice_14,ma_es

Notas de licencia (importante para el procomún del micelio):
  * CC0 / Public Domain / CC BY 4.0  -> usables libremente (incl. comercial).
  * CC BY-SA / CC BY-NC              -> verificar uso comercial antes de compartir
                                      en la malla (la privacidad del OS lo filtra).
  * Emilia/RAVDESS/Expresso son NC   -> solo para experimentación local.
"""
import argparse
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent.parent / "data" / "voice_mycelium" / "datasets_raw"
BASE.mkdir(parents=True, exist_ok=True)

# (clave, comando de descarga, licencia)
DATASETS = {
    "common_voice_14": (
        "huggingface-cli download mozilla-foundation/common_voice_14_0 --language es --repo-type dataset",
        "CC0",
    ),
    "ma_es": (
        "echo 'M-AILABS es_ES 108h Public Domain: descarga manual desde caito.de "
        "(web por idioma) -> descomprimir en datasets_raw/ma_es'",
        "Public Domain",
    ),
    "la_spanish": (
        "for c in 61 71 72 73 74 75; do curl -L -o datasets_raw/la_$c.zip "
        "https://openslr.org/resources/$c/es_*.zip; done",
        "CC BY-SA 4.0",
    ),
    "mls_es": (
        "huggingface-cli download facebook/multilingual_librispeech spanish --repo-type dataset",
        "CC BY 4.0",
    ),
    "css10_es": (
        "echo 'CSS10 es_CC0: clonar github.com/Kyubyong/css10 -> carpeta es'",
        "CC0",
    ),
    "piper_voices": (
        "huggingface-cli download rhasspy/piper-voices --repo-type dataset",
        "CC0",
    ),
    "emovome": (
        "echo 'EMOVOME (emoción ES, CC BY 4.0): zenodo.org/records/10694370'",
        "CC BY 4.0",
    ),
}


def run(key: str) -> None:
    cmd, lic = DATASETS[key]
    print(f"\n=== {key} [{lic}] ===")
    print(f"$ {cmd}")
    try:
        subprocess.run(cmd, shell=True, check=False, cwd=BASE.parent.parent)
    except Exception as e:
        print(f"  error: {e}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--only", default="", help="claves separadas por coma")
    args = ap.parse_args()

    keys = list(DATASETS.keys()) if args.all else [k.strip() for k in args.only.split(",") if k.strip()]
    if not keys:
        print("Usa --all o --only clave1,clave2. Claves:", ", ".join(DATASETS))
        sys.exit(1)
    for k in keys:
        if k not in DATASETS:
            print(f"clave desconocida: {k}")
            continue
        run(k)
    print("\nListo. Los datos quedan en data/voice_mycelium/datasets_raw/. "
          "Luego usa POST /api/voice/train {src, lang, speaker} para normalizar a 24k mono.")


if __name__ == "__main__":
    main()
