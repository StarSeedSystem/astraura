#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit AI Engine // Universal Linux Sovereign Installer
# Soporta Ubuntu, Debian, Fedora, Arch Linux, Manjaro, openSUSE, Pop!_OS
# ==============================================================================

set -e

echo "========================================================================"
echo "🐧 ASTRAURA 1.58-BIT // INSTALADOR NATIVO PARA GNU/LINUX"
echo "========================================================================"

ARCH="$(uname -m)"
echo "🖥️ Arquitectura: $ARCH"

INSTALL_DIR="$HOME/.astraura"
DESKTOP_DIR="$HOME/Desktop"
XDG_APPS_DIR="$HOME/.local/share/applications"

mkdir -p "$INSTALL_DIR" "$XDG_APPS_DIR"

# 1. Detectar e Instalar Dependencias del Sistema
echo "📦 Verificando gestor de paquetes de Linux e instalando librerías..."
if command -v apt-get &> /dev/null; then
    sudo apt-get update && sudo apt-get install -y python3 python3-venv python3-pip python3-dev build-essential git curl libgl1-mesa-dev libasound2-dev 2>/dev/null || true
elif command -v dnf &> /dev/null; then
    sudo dnf install -y python3 python3-devel python3-pip gcc gcc-c++ git curl mesa-libGL-devel alsa-lib-devel 2>/dev/null || true
elif command -v pacman &> /dev/null; then
    sudo pacman -S --noconfirm python python-pip base-devel git curl mesa alsa-lib 2>/dev/null || true
elif command -v zypper &> /dev/null; then
    sudo zypper install -y python3 python3-devel python3-pip gcc gcc-c++ git curl 2>/dev/null || true
fi

# 2. Copiar o Clonar Código
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
if [ -f "$CURRENT_DIR/backend/run_backend.py" ]; then
    rsync -av --exclude '.git' --exclude '.venv' --exclude 'frontend/node_modules' "$CURRENT_DIR/" "$INSTALL_DIR/"
else
    git clone https://github.com/StarSeedSystem/astraura.git "$INSTALL_DIR" 2>/dev/null || (cd "$INSTALL_DIR" && git pull origin main)
fi

cd "$INSTALL_DIR"

# 3. Entorno Virtual Python
echo "🐍 Configurando entorno virtual .venv..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r backend/requirements.txt

# 4. Compilar Frontend
if [ ! -d "frontend/dist" ]; then
    echo "🎨 Compilando interfaz web de alta fidelidad..."
    cd frontend && npm install && npm run build && cd "$INSTALL_DIR"
fi

# 5. Instalar Acceso Directo de Escritorio (XDG Desktop Entry)
echo "🖥️ Creando accesos directos de escritorio (.desktop)..."
DESKTOP_FILE="$XDG_APPS_DIR/astraura.desktop"
cat << EOF > "$DESKTOP_FILE"
[Desktop Entry]
Version=1.0
Type=Application
Name=Astraura 1.58-Bit
Comment=Plataforma de Inteligencia Artificial Cognitiva Soberana de 1.58 Bits
Exec=bash -c "cd $INSTALL_DIR && source .venv/bin/activate && (sleep 1.5 && xdg-open http://127.0.0.1:8000 &) && python3 backend/run_backend.py"
Icon=utilities-terminal
Terminal=true
Categories=Development;Science;ArtificialIntelligence;Utility;
Keywords=AI;BitNet;LLM;Cognitive;StarSeed;
EOF
chmod +x "$DESKTOP_FILE"

if [ -d "$DESKTOP_DIR" ]; then
    cp "$DESKTOP_FILE" "$DESKTOP_DIR/"
    chmod +x "$DESKTOP_DIR/astraura.desktop"
fi

# 6. Configurar Servicio Systemd de Usuario
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
mkdir -p "$SYSTEMD_USER_DIR"
cat << EOF > "$SYSTEMD_USER_DIR/astraura.service"
[Unit]
Description=Astraura 1.58-Bit Cognitive Engine Background Service
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/.venv/bin/python3 $INSTALL_DIR/backend/run_backend.py
Restart=always
RestartSec=5
Environment=PYTHONPATH=$INSTALL_DIR/backend
Environment=LANG=es_ES.UTF-8

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload 2>/dev/null || true

# 7. Permisos de Almacenamiento Raw y Discos (/media, /mnt)
echo "🛡️ Configurando permisos para unidades de almacenamiento montadas..."
sudo usermod -aG disk "$USER" 2>/dev/null || true
sudo usermod -aG storage "$USER" 2>/dev/null || true
sudo usermod -aG audio "$USER" 2>/dev/null || true
sudo usermod -aG video "$USER" 2>/dev/null || true

echo "========================================================================"
echo "✅ Astraura 1.58-Bit instalado exitosamente en GNU/Linux."
echo "🚀 Iniciando motor en http://127.0.0.1:8000..."
echo "========================================================================"

(sleep 1.5 && xdg-open "http://127.0.0.1:8000" 2>/dev/null || sensible-browser "http://127.0.0.1:8000" 2>/dev/null) &
python3 backend/run_backend.py
