#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit AI Engine // macOS Sovereign Installer & App Provisioner
# Optimizado para Apple Silicon (M1/M2/M3/M4) e Intel Core
# ==============================================================================

set -e

echo "========================================================================"
echo "🍎 ASTRAURA 1.58-BIT // INSTALADOR NATIVO PARA MACOS"
echo "========================================================================"

ARCH="$(uname -m)"
echo "🖥️ Arquitectura: $ARCH"

INSTALL_DIR="$HOME/.astraura"
APP_DIR="/Applications/Astraura.app"
DESKTOP_DIR="$HOME/Desktop"

mkdir -p "$INSTALL_DIR"

# 1. Copiar / Clonar código
echo "📦 Configurando directorio de aplicación en $INSTALL_DIR..."
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

if [ -f "$CURRENT_DIR/backend/run_backend.py" ]; then
    rsync -av --exclude '.git' --exclude '.venv' --exclude 'frontend/node_modules' "$CURRENT_DIR/" "$INSTALL_DIR/"
else
    git clone https://github.com/StarSeedSystem/astraura.git "$INSTALL_DIR" 2>/dev/null || (cd "$INSTALL_DIR" && git pull origin main)
fi

cd "$INSTALL_DIR"

# 2. Entorno Virtual Python
echo "🐍 Configurando Python 3 y librerías de aceleración..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r backend/requirements.txt

# 3. Compilar Frontend si es necesario
if [ ! -d "frontend/dist" ]; then
    echo "🎨 Compilando interfaz frontend..."
    cd frontend && npm install && npm run build && cd "$INSTALL_DIR"
fi

# 4. Crear Lanzador .command de Doble Clic en el Escritorio
LAUNCHER_PATH="$DESKTOP_DIR/Astraura.command"
cat << 'EOF' > "$LAUNCHER_PATH"
#!/usr/bin/env bash
echo "🚀 Iniciando Astraura 1.58-Bit Engine..."
cd "$HOME/.astraura"
source .venv/bin/activate
(sleep 1.5 && open "http://127.0.0.1:8000") &
python3 backend/run_backend.py
EOF
chmod +x "$LAUNCHER_PATH"
echo "✅ Lanzador de escritorio creado en: $LAUNCHER_PATH"

# 5. Crear Bundle macOS .app
echo "📱 Empaquetando Astraura.app en /Applications/..."
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

cp deploy/installers/macos/Info.plist "$APP_DIR/Contents/Info.plist"

cat << 'EOF' > "$APP_DIR/Contents/MacOS/Astraura"
#!/bin/bash
DIR="$HOME/.astraura"
cd "$DIR"
source .venv/bin/activate
(sleep 1.5 && open "http://127.0.0.1:8000") &
exec python3 backend/run_backend.py
EOF
chmod +x "$APP_DIR/Contents/MacOS/Astraura"

# 6. Configurar Demonio de Segundo Plano (launchd)
LAUNCHD_DIR="$HOME/Library/LaunchAgents"
mkdir -p "$LAUNCHD_DIR"
cp deploy/installers/macos/launchd/com.starseed.astraura.plist "$LAUNCHD_DIR/"
echo "⚙️ Servicio en segundo plano registrado en: $LAUNCHD_DIR/com.starseed.astraura.plist"

echo "========================================================================"
echo "🛡️ INSTRUCCIONES DE PERMISOS TOTALES DE MACOS (TCC & Full Disk Access):"
echo "1. Ve a: Configuración del Sistema > Privacidad y Seguridad > Acceso total al disco."
echo "2. Agrega y activa 'Terminal' y 'Astraura.app' para permitir acceso completo a /Volumes, SSDs y discos externos."
echo "3. Permite acceso al Micrófono para OmniVoice Voice Studio."
echo "========================================================================"
echo "✨ Instalación completada con éxito. Ya puedes abrir Astraura desde Aplicaciones o tu Escritorio."
