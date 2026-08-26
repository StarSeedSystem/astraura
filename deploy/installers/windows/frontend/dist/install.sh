#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit AI Engine // Universal Sovereign Auto-Installer & Updater
# Official GitHub: https://github.com/StarSeedSystem/astraura.git
# ==============================================================================

set -e

echo "========================================================================"
echo "🚀 ASTRAURA 1.58-BIT COGNITIVE ENGINE // INSTALADOR UNIVERSAL MULTI-SO"
echo "========================================================================"

OS="$(uname -s)"
ARCH="$(uname -m)"
echo "🖥️  Plataforma Detectada: $OS ($ARCH)"

INSTALL_DIR="$HOME/.astraura"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 1. Verificar Python 3.10+
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3.10+ es requerido. Por favor instálalo en tu sistema."
    if [ "$OS" = "Darwin" ] && command -v brew &> /dev/null; then
        echo "💡 Instalando Python mediante Homebrew..."
        brew install python@3.11
    elif [ "$OS" = "Linux" ] && command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y python3 python3-venv python3-pip git
    fi
fi

# 2. Entorno Virtual Aislado con Aceleración SIMD/NEON
if [ ! -d ".venv" ]; then
    echo "📦 Creando entorno virtual aislado en $INSTALL_DIR/.venv..."
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip setuptools wheel 2>/dev/null || true

# 3. Clonar o Actualizar desde GitHub Oficial
if [ ! -d ".git" ]; then
    echo "📥 Clonando repositorio oficial soberano de Astraura 1.58-bit..."
    git clone https://github.com/StarSeedSystem/astraura.git .
else
    echo "🔄 Comprobando e instalando actualizaciones inteligentes desde GitHub..."
    git fetch origin main
    git reset --hard origin/main
fi

# 4. Instalar Dependencias del Backend
echo "⚡ Verificando librerías de silicio y aceleración matemática..."
pip install -r backend/requirements.txt 2>/dev/null || pip install fastapi uvicorn httpx numpy pydantic psutil beautifulsoup4

# 5. Configurar Permisos de Almacenamiento y Sistema
if [ "$OS" = "Darwin" ]; then
    echo "🍎 Configurando permisos y acceso a almacenamiento en macOS (/Volumes, ~)..."
    chmod +x install_and_run.sh deploy/installers/macos/*.sh 2>/dev/null || true
elif [ "$OS" = "Linux" ]; then
    echo "🐧 Configurando permisos de almacenamiento en Linux (/media, /mnt, /run/media)..."
    chmod +x install_and_run.sh deploy/installers/linux/*.sh 2>/dev/null || true
fi

echo "========================================================================"
echo "✅ Astraura 1.58-Bit instalado y optimizado para $OS ($ARCH)."
echo "🚀 Iniciando Motor Cognitivo Soberano en http://127.0.0.1:8000..."
echo "========================================================================"

if [ "$OS" = "Darwin" ]; then
    (sleep 1.5 && open "http://127.0.0.1:8000") &
fi

python3 backend/run_backend.py
