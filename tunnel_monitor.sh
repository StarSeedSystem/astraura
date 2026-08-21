#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit // Cloudflare Tunnel Monitor (Persistent Auto-Restart)
# Mantiene un túnel Cloudflare vivo apuntando al backend local (8000).
# Actualiza frontend/public/active_tunnel.json y data/active_tunnel.json
# para que TODOS los medios (Vercel, app nativa, navegador) apunten al
# backend correcto automáticamente, sin rebuild.
# ==============================================================================
set -e

PROJECT_DIR="/Users/alex/Documents/IA 1.58 bit"
BACKEND_URL="http://127.0.0.1:8000"
PUBLIC_JSON="$PROJECT_DIR/frontend/public/active_tunnel.json"
DATA_JSON="$PROJECT_DIR/data/active_tunnel.json"
LOG="$PROJECT_DIR/data/tunnel_monitor.log"

mkdir -p "$(dirname "$DATA_JSON")"
touch "$LOG"

update_json() {
  local url="$1"
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local content="{
  \"url\": \"$url\",
  \"updated_at\": \"$ts\",
  \"backend\": \"$BACKEND_URL\",
  \"status\": \"active\"
}"
  echo "$content" > "$PUBLIC_JSON"
  echo "$content" > "$DATA_JSON"
  echo "[$(date)] active_tunnel updated -> $url" >> "$LOG"
}

echo "[$(date)] Starting Astraura tunnel monitor..." >> "$LOG"

while true; do
  echo "[$(date)] Launching cloudflared..." >> "$LOG"
  # Lanzar cloudflared y capturar la URL del túnel quick
  cloudflared tunnel --url "$BACKEND_URL" --no-autoupdate > /tmp/astraura_cloudflared.log 2>&1 &
  CFD_PID=$!
  
  # Esperar a que cloudflared imprima la URL del túnel
  TUNNEL_URL=""
  for i in $(seq 1 30); do
    TUNNEL_URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/astraura_cloudflared.log 2>/dev/null | head -1)
    if [ -n "$TUNNEL_URL" ]; then
      break
    fi
    sleep 1
  done
  
  if [ -n "$TUNNEL_URL" ]; then
    update_json "$TUNNEL_URL"
    echo "[$(date)] Tunnel live: $TUNNEL_URL" >> "$LOG"
  else
    echo "[$(date)] ERROR: cloudflared no produjo URL" >> "$LOG"
  fi
  
  # Esperar a que cloudflared muera (o 1h como timeout de seguridad)
  wait $CFD_PID 2>/dev/null || true
  echo "[$(date)] cloudflared exited, restarting in 3s..." >> "$LOG"
  sleep 3
done
