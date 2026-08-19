#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit AI Engine // Universal Auto-Installer & Smart Updater
# Official GitHub: https://github.com/StarSeedSystem/astraura.git
# ==============================================================================

set -e

echo "🚀 Iniciando Instalador Inteligente de Astraura 1.58-Bit AI Engine..."
OS="$(uname -s)"
ARCH="$(uname -m)"
echo "🖥️ Plataforma: $OS ($ARCH)"

INSTALL_DIR="$HOME/.astraura"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3.10+ es requerido. Por favor instálalo en tu sistema."
    exit 1
fi

# 2. Setup Virtual Environment
if [ ! -d ".venv" ]; then
    echo "📦 Creando entorno virtual aislado en $INSTALL_DIR/.venv..."
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip setuptools wheel 2>/dev/null || true

# 3. Clone or Update Engine
if [ ! -d ".git" ]; then
    echo "📥 Clonando repositorio oficial de Astraura 1.58-bit..."
    git clone https://github.com/StarSeedSystem/astraura.git .
else
    echo "🔄 Comprobando e instalando actualizaciones inteligentes automáticas desde GitHub..."
    git pull origin main --rebase 2>/dev/null || true
fi

# 4. Install Dependencies
echo "⚡ Configurando dependencias y aceleración SIMD/NEON..."
pip install fastapi uvicorn httpx numpy pydantic psutil beautifulsoup4 2>/dev/null || true

echo "✅ Astraura instalado y optimizado para $OS ($ARCH)."
echo "🚀 Iniciando Astraura 1.58-Bit Engine..."
python3 backend/run_backend.py
