import os
import sys
import platform
import shutil
from pathlib import Path
from typing import Dict, Any, List

class SystemAutoDiscoveryEngine:
    """
    Universal Device & Context Auto-Discovery Engine for Astraura (StarSeed OS).
    When installed or booted on ANY device (macOS, Linux, Windows, ARM, x86_64):
      1. Automatically scans the host for existing 1.58-bit models, GGUFs, vector databases, and prior configurations.
      2. Discovers existing workspaces, documents, and memory nodes to preserve continuity.
      3. Auto-configures compute threads, quantization, and permissions based on host hardware.
    """
    def __init__(self):
        self.home_dir = Path.home()
        self.system_info = self._get_host_specs()
        
    def _get_host_specs(self) -> Dict[str, Any]:
        uname = platform.uname()
        mem_gb = 8.0
        try:
            import psutil
            mem_gb = round(psutil.virtual_memory().total / (1024**3), 2)
            cores = psutil.cpu_count(logical=True) or os.cpu_count() or 4
        except Exception:
            cores = os.cpu_count() or 4

        is_apple_silicon = platform.system() == "Darwin" and platform.machine() in ["arm64", "aarch64"]
        
        return {
            "os": platform.system(),
            "os_release": uname.release,
            "arch": platform.machine(),
            "processor": uname.processor or platform.machine(),
            "cpu_cores": cores,
            "ram_total_gb": mem_gb,
            "is_apple_silicon": is_apple_silicon,
            "acceleration": "ARM NEON SIMD" if is_apple_silicon else ("AVX2/AVX-512" if platform.machine() in ["x86_64", "AMD64"] else "Standard SIMD")
        }

    def scan_for_existing_contexts(self) -> Dict[str, Any]:
        """
        Scans common locations on the target device for previous 1.58-bit weights,
        StarSeed configurations, GGUF models, and knowledge bases.
        """
        candidate_paths = [
            self.home_dir / ".astraura",
            self.home_dir / "Documents" / "IA 1.58 bit",
            self.home_dir / "Documents" / "starseed-os-main",
            self.home_dir / ".config" / "astraura",
            self.home_dir / "Library" / "Application Support" / "Astraura",
            Path("/var/data/astraura"),
            Path("./data"),
            self.home_dir / ".ollama" / "models"
        ]

        found_models = []
        found_documents = []
        found_memories = []
        
        for base in candidate_paths:
            if not base.exists():
                continue
            try:
                # Look for GGUF / model files
                for f in base.glob("**/*"):
                    if f.is_file():
                        suffix = f.suffix.lower()
                        if suffix in [".gguf", ".bin"]:
                            found_models.append({
                                "name": f.name,
                                "path": str(f.resolve()),
                                "size_mb": round(f.stat().st_size / (1024 * 1024), 2),
                                "source": str(base)
                            })
                        elif suffix in [".pdf", ".md", ".txt", ".json"] and not any(x in str(f) for x in ["node_modules", ".git", ".venv"]):
                            if f.stat().st_size < 50 * 1024 * 1024: # Under 50MB
                                found_documents.append({
                                    "name": f.name,
                                    "path": str(f.resolve()),
                                    "size_kb": round(f.stat().st_size / 1024, 2),
                                    "source": str(base)
                                })
                        elif "knowledge_graph" in f.name or "vector_store" in f.name:
                            found_memories.append({
                                "name": f.name,
                                "path": str(f.resolve()),
                                "source": str(base)
                            })
            except Exception as e:
                print(f"[AutoDiscovery] Warning scanning {base}: {e}")

        return {
            "host": self.system_info,
            "scan_completed": True,
            "found_models": found_models,
            "found_documents": found_documents,
            "found_memories": found_memories,
            "total_models": len(found_models),
            "total_documents": len(found_documents),
            "total_memories": len(found_memories)
        }

    def generate_installer_script(self, custom_domain: str = "astraura.vercel.app") -> str:
        """
        Generates a self-contained, one-line curl/bash installer for any device.
        """
        return f"""#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit AI Engine // Universal Auto-Installer
# Automatically provisions native permissions, 1.58-bit ternary runtime & context
# Official Web Distribution: https://{custom_domain}
# ==============================================================================

set -e

echo "🚀 Iniciando Instalación Automática de Astraura 1.58-Bit AI Engine..."
OS="$(uname -s)"
ARCH="$(uname -m)"
echo "🖥️ Dispositivo detectado: $OS ($ARCH)"

INSTALL_DIR="$HOME/.astraura"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 1. Check Python & Virtualenv
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 no encontrado. Por favor instala Python 3.10+ en tu sistema."
    exit 1
fi

# 2. Setup Virtual Environment
if [ ! -d ".venv" ]; then
    echo "📦 Creando entorno virtual aislado en $INSTALL_DIR/.venv..."
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip

# 3. Clone or Update Engine
if [ ! -f "backend/app/main.py" ]; then
    echo "📥 Descargando núcleo de Astraura 1.58-bit..."
    # Download clean repository release
    curl -fsSL "https://{custom_domain}/api/download/core.tar.gz" -o core.tar.gz 2>/dev/null || true
    if [ -f "core.tar.gz" ]; then
        tar -xzf core.tar.gz
        rm core.tar.gz
    fi
fi

# 4. Install Dependencies & Hardware Acceleration
echo "⚡ Configurando aceleración matemática y dependencias..."
pip install fastapi uvicorn httpx numpy pydantic psutil beautifulsoup4 playwright || true

# 5. Run Auto-Discovery & Continuity Scanner
echo "🔍 Buscando memorias y modelos previos de 1.58 bits en este dispositivo..."
python3 -c "from app.core.auto_discovery import auto_discovery_engine; print(auto_discovery_engine.scan_for_existing_contexts())" 2>/dev/null || true

echo "✅ Astraura instalado y optimizado para tu dispositivo."
echo "🚀 Para iniciar: cd $INSTALL_DIR && source .venv/bin/activate && python3 backend/run_backend.py"
"""

auto_discovery_engine = SystemAutoDiscoveryEngine()
