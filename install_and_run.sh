#!/bin/bash
# ==============================================================================
# ASTRAURA 1.58-BIT AI ENGINE - Master Setup and Launch Script
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "======================================================================"
echo "⚡ ASTRAURA // PLATAFORMA DE IA COGNITIVA DE 1.58 BITS (BitNet b1.58)"
echo "======================================================================"

# 1. Check Python Environment
echo "\n[1/5] Verificando entorno de ejecución..."
if command -v /Users/alex/.local/bin/uv >/dev/null 2>&1; then
    UV_CMD="/Users/alex/.local/bin/uv"
elif command -v uv >/dev/null 2>&1; then
    UV_CMD="uv"
else
    UV_CMD=""
fi

if [ ! -d ".venv" ]; then
    echo "  📦 Creando entorno virtual .venv..."
    if [ -n "$UV_CMD" ]; then
        $UV_CMD venv .venv
    else
        python3 -m venv .venv
    fi
fi

# Activate virtual environment
source .venv/bin/activate

# 2. Install backend dependencies
echo "\n[2/5] Verificando e instalando librerías del backend..."
if [ -n "$UV_CMD" ]; then
    $UV_CMD pip install -r backend/requirements.txt
else
    pip install -r backend/requirements.txt
fi

# 3. Build/check Frontend
echo "\n[3/5] Verificando interfaz frontend multimedia..."
if [ ! -d "frontend/dist" ]; then
    echo "  🎨 Compilando interfaz frontend..."
    cd frontend
    npm install
    npm run build
    cd "$DIR"
else
    echo "  ✅ Bundle frontend listo en frontend/dist"
fi

# 4. Run Hardware Profiler & Index Documents
echo "\n[4/5] Ejecutando auto-optimización por hardware e indexación de memorias..."
PYTHONPATH=backend python3 -m backend.app.memory.document_indexer

# 5. Launch Backend Server
echo "\n[5/5] Iniciando servidor cognitivo Astraura en http://127.0.0.1:8000..."
echo "======================================================================"
echo "🚀 Sistema listo. Abriendo navegador en http://127.0.0.1:8000..."
echo "💡 Presiona Ctrl+C para detener el servidor."
echo "======================================================================"

# Open browser automatically on macOS
if [ "$(uname)" = "Darwin" ]; then
    (sleep 1.5 && open "http://127.0.0.1:8000") &
fi

PYTHONPATH=backend python3 backend/run_backend.py
