#!/usr/bin/env bash
# ==============================================================================
# ASTRAURA 1.58-BIT // MASTER UNIVERSAL CROSS-PLATFORM INSTALLER
# Detects OS, configures full disk access & device permissions, and launches engine.
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

OS="$(uname -s)"
ARCH="$(uname -m)"

echo "========================================================================"
echo "🌌 ASTRAURA // PLATAFORMA DE IA COGNITIVA SOBERANA DE 1.58 BITS"
echo "🚀 INSTALADOR UNIVERSAL MULTI-SISTEMA OPERATIVO & ALMACENAMIENTO TOTAL"
echo "========================================================================"
echo "🖥️  Sistema Operativo: $OS ($ARCH)"

case "$OS" in
    Darwin*)
        echo "🍎 Detectado macOS ($ARCH). Ejecutando aprovisionador nativo..."
        chmod +x "$DIR/deploy/installers/macos/"*.sh 2>/dev/null || true
        bash "$DIR/deploy/installers/macos/install_macos.sh"
        ;;
    Linux*)
        if [ -f "/data/data/com.termux/files/usr/bin/bash" ]; then
            echo "📱 Detectado Android Termux. Ejecutando aprovisionador móvil..."
            chmod +x "$DIR/deploy/installers/mobile/"*.sh 2>/dev/null || true
            bash "$DIR/deploy/installers/mobile/install_termux.sh"
        else
            echo "🐧 Detectado GNU/Linux ($ARCH). Ejecutando aprovisionador Linux..."
            chmod +x "$DIR/deploy/installers/linux/"*.sh 2>/dev/null || true
            bash "$DIR/deploy/installers/linux/install_linux.sh"
        fi
        ;;
    MINGW*|MSYS*|CYGWIN*)
        echo "🪟 Detectado entorno Windows. Ejecutando instalador PowerShell..."
        powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$DIR/deploy/installers/windows/install_windows.ps1"
        ;;
    *)
        echo "⚡ Plataforma genérica/UNIX. Ejecutando instalador estándar..."
        bash "$DIR/install_and_run.sh"
        ;;
esac
