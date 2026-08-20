#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit AI Engine // Android Termux Native Installer
# Configura almacenamiento (/sdcard), aceleración ARMv8/v9 y servidor local
# ==============================================================================

set -e

echo "========================================================================"
echo "📱 ASTRAURA 1.58-BIT // INSTALADOR NATIVO PARA ANDROID (TERMUX)"
echo "========================================================================"

# 1. Permisos de Almacenamiento Android (MANAGE_EXTERNAL_STORAGE)
echo "🛡️ Solicitando permisos de acceso al almacenamiento del dispositivo..."
termux-setup-storage 2>/dev/null || true

# 2. Actualizar Paquetes de Termux
echo "📦 Instalando dependencias en Termux (Python, Clang, Git, Libs)..."
pkg update -y
pkg install -y python git clang make libjpeg-turbo libpng binutils rust

INSTALL_DIR="$HOME/.astraura"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 3. Clonar o Actualizar
if [ ! -d ".git" ]; then
    git clone https://github.com/StarSeedSystem/astraura.git .
else
    git fetch origin main && git reset --hard origin/main
fi

# 4. Entorno Virtual y Dependencias
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install fastapi uvicorn httpx numpy pydantic psutil beautifulsoup4

echo "========================================================================"
echo "✅ Astraura instalado en Android."
echo "🚀 Abre tu navegador móvil en: http://127.0.0.1:8000"
echo "========================================================================"

python backend/run_backend.py
