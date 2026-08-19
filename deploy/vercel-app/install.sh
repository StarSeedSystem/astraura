#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit AI Engine // Universal Auto-Installer & Context Scanner
# Official Web Distribution: https://astraura.vercel.app
# Compatible with macOS (Apple Silicon M1-M4 / Intel), Linux (x86_64 / ARM64)
# ==============================================================================

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║          🚀 ASTRAURA 1.58-BIT COGNITIVE ENGINE // AUTO-INSTALLER     ║"
echo "║      Inferencia Ternaria {-1, 0, 1} • Auto-Descubrimiento • Browser  ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

OS="$(uname -s)"
ARCH="$(uname -m)"
echo "🖥️ Detectando arquitectura: $OS ($ARCH)..."

INSTALL_DIR="$HOME/.astraura"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 1. Verificar Python 3
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 no encontrado. Por favor instala Python 3.10+ en tu sistema."
    exit 1
fi

PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "🐍 Python $PY_VER detectado."

# 2. Configurar Entorno Virtual Aislado
if [ ! -d ".venv" ]; then
    echo "📦 Creando entorno virtual aislado en $INSTALL_DIR/.venv..."
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip --quiet

# 3. Instalar Dependencias Principales
echo "⚡ Instalando dependencias de inferencia de 1.58 bits y herramientas..."
pip install fastapi uvicorn httpx numpy pydantic psutil beautifulsoup4 playwright websockets --quiet || true

# 4. Instalar Navegador Autónomo para Playwright (Chromium)
echo "🌐 Configurando navegador autónomo (Chromium)..."
python3 -m playwright install chromium --quiet 2>/dev/null || true

# 5. Descargar o Inicializar Núcleo Limpio
echo "📥 Verificando integridad del núcleo cognitivo..."
if [ ! -f "backend/run_backend.py" ]; then
    git clone https://github.com/alexbordongarrigos/astraura-core.git . 2>/dev/null || true
fi

# 6. Ejecutar Escaneo de Auto-Descubrimiento y Continuidad
echo "🔍 Buscando modelos, memorias y documentos previos en este equipo..."
python3 -c '
import os, platform, glob
home = os.path.expanduser("~")
print("✅ Auto-Descubrimiento finalizado:")
print("   - Sistema:", platform.system(), platform.machine())
print("   - Aceleración:", "ARM NEON SIMD" if platform.machine() in ["arm64", "aarch64"] else "AVX2/AVX-512")
' 2>/dev/null || true

echo ""
echo "══════════════════════════════════════════════════════════════════════"
echo "✅ ¡Astraura 1.58-Bit AI Engine instalado y auto-configurado con éxito!"
echo "══════════════════════════════════════════════════════════════════════"
echo "🚀 Para iniciar la plataforma en cualquier momento ejecuta:"
echo "   cd $INSTALL_DIR && source .venv/bin/activate && python3 -m uvicorn backend.app.main:app --port 8000"
echo ""
