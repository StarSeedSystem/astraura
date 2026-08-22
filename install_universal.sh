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
echo ""
echo "🌌 SINCRONIZACIÓN AUTOMÁTICA MULTI-MEDIO (Sistema 1.58-Bit):"
echo "   Al iniciar, Astraura escanea TODOS tus almacenamientos conectados"
echo "   (discos externos, Google Drive, servidores) y VINCULA automáticamente"
echo "   los cerebros, memorias y configuraciones encontrados. Desde CUALQUIER"
echo "   medio (navegador, app nativa, terminal, Vercel) verás el MISMO sistema"
echo "   en tiempo real, con la misma UI y los mismos agentes/personalidades."
echo ""
echo "🔄 ACTUALIZACIONES AUTOMÁTICAS: Astraura se actualiza SOLA desde GitHub"
echo "   (main) cada hora en segundo plano. Siempre tendrás la última versión."
echo ""

# Configurar Cloudflare R2 para sincronización multi-dispositivo automática
echo "☁️  Configurando sincronización global con Cloudflare R2..."
chmod +x "$DIR/deploy/installers/setup_r2.sh" 2>/dev/null || true
bash "$DIR/deploy/installers/setup_r2.sh" || echo "⚠️  R2 no configurado (opcional)."

# Configurar actualizaciones automáticas desde GitHub (main)
echo "🔄 Configurando actualizaciones automáticas desde GitHub..."
chmod +x "$DIR/update_astraura.sh" 2>/dev/null || true
bash "$DIR/update_astraura.sh" || echo "⚠️  Auto-update no configurado (opcional)."

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
