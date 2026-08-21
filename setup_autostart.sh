#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit // Registro de Auto-Arranque (macOS)
# Ejecuta ESTE script desde Terminal NORMAL (no desde el sandbox del agente)
# para registrar los servicios de Astraura que arrancan solos al encender el Mac:
#   - com.starseed.astraura        -> backend FastAPI (puerto 8000)
#   - com.starseed.astraura.tunnel -> túnel Cloudflare persistente
# ==============================================================================
set -e
PLIST_DIR="$HOME/Library/LaunchAgents"
SRC="/Users/alex/Documents/IA 1.58 bit/deploy/installers/macos/launchd"

echo "📋 Registrando auto-arranque de Astraura..."
cp "$SRC/com.starseed.astraura.plist" "$PLIST_DIR/"
cp "$SRC/com.starseed.astraura.tunnel.plist" "$PLIST_DIR/"

launchctl load "$PLIST_DIR/com.starseed.astraura.plist" 2>/dev/null || true
launchctl load "$PLIST_DIR/com.starseed.astraura.tunnel.plist" 2>/dev/null || true

echo "✅ Listo. Astraura arrancará automáticamente al iniciar sesión."
echo "   Backend:  http://127.0.0.1:8000"
echo "   Túnel:    se actualiza solo en frontend/public/active_tunnel.json"
echo ""
echo "Ver estado:"
echo "  launchctl list | grep astraura"
