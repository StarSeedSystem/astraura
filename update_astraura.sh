#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit // Actualizador Automático desde GitHub (main)
# Pull --rebase de main en segundo plano; si hay cambios, rebuild del frontend
# y restart del backend (launchd). Idempotente y seguro.
# Se registra via launchd (macOS) o systemd (Linux) cada 1h.
# ==============================================================================
set -e
REPO="/Users/alex/Documents/IA 1.58 bit"
cd "$REPO" || exit 1

echo "[$(date)] Astraura auto-update: verificando main..."
BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "none")
git fetch origin main --quiet 2>/dev/null || { echo "fetch fallo"; exit 0; }
git merge --ff-only origin/main --quiet 2>/dev/null || git rebase origin/main --quiet 2>/dev/null || true
AFTER=$(git rev-parse HEAD 2>/dev/null || echo "none")

if [ "$BEFORE" = "$AFTER" ]; then
  echo "[$(date)] Sin cambios. Astraura al día (${AFTER:0:8})."
  exit 0
fi

echo "[$(date)] Actualización detectada: $BEFORE -> $AFTER. Reconstruyendo..."

# Rebuild frontend
if [ -d "frontend" ]; then
  cd "$REPO/frontend" && npm run build >/tmp/astraura_build.log 2>&1 || echo "build warn"
  cd "$REPO"
fi

# Restart backend via launchd si está registrado
if launchctl list | grep -q "com.starseed.astraura$"; then
  launchctl unload "$HOME/Library/LaunchAgents/com.starseed.astraura.plist" 2>/dev/null || true
  sleep 2
  launchctl load "$HOME/Library/LaunchAgents/com.starseed.astraura.plist" 2>/dev/null || true
  echo "[$(date)] Backend reiniciado con la nueva versión."
fi

echo "[$(date)] Astraura actualizada a ${AFTER:0:8}."
