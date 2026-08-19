import os
import sys
import argparse
from pathlib import Path
import requests

MODELS_DIR = Path(__file__).resolve().parent.parent / "backend" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

AVAILABLE_MODELS = {
    "bitnet-2b": {
        "name": "BitNet-b1.58-2B-4T (i2_s)",
        "url": "https://huggingface.co/microsoft/BitNet-b1.58-2B-4T/resolve/main/ggml-model-i2_s.gguf",
        "filename": "BitNet-b1.58-2B-4T-i2_s.gguf",
        "size_mb": 750
    },
    "bitnet-large": {
        "name": "BitNet-b1.58-Large (i2_s)",
        "url": "https://huggingface.co/1bitLLM/bitnet_b1_58-large/resolve/main/ggml-model-i2_s.gguf",
        "filename": "bitnet_b1_58-large-i2_s.gguf",
        "size_mb": 420
    }
}

def download_file(url: str, dest_path: Path):
    print(f"📥 Descargando desde: {url}")
    print(f"💾 Guardando en: {dest_path}")
    
    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        total_size = int(response.headers.get('content-length', 0))
        
        downloaded = 0
        with open(dest_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=1024 * 1024): # 1MB chunks
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        mb = downloaded / (1024 * 1024)
                        total_mb = total_size / (1024 * 1024)
                        print(f"\r  Progreso: {percent:.1f}% ({mb:.1f}MB / {total_mb:.1f}MB)", end="", flush=True)
                    else:
                        print(f"\r  Descargados: {downloaded / (1024 * 1024):.1f}MB", end="", flush=True)
        print("\n✅ Descarga completada con éxito.")
    except Exception as e:
        print(f"\n⚠️  Aviso de descarga: {e}")
        print("💡 Puedes colocar manualmente tus archivos .gguf cuantizados en 'backend/models/'")

def main():
    parser = argparse.ArgumentParser(description="Descargador de Modelos BitNet 1.58-bit")
    parser.add_argument("--model", choices=list(AVAILABLE_MODELS.keys()), default="bitnet-2b", help="Modelo a descargar")
    args = parser.parse_args()

    selected = AVAILABLE_MODELS[args.model]
    target_path = MODELS_DIR / selected["filename"]
    
    print("=" * 60)
    print(f"🤖 Preparando modelo: {selected['name']} (~{selected['size_mb']} MB)")
    print("=" * 60)
    
    if target_path.exists():
        print(f"✅ El modelo ya está presente en: {target_path}")
        return

    download_file(selected["url"], target_path)

if __name__ == "__main__":
    main()
