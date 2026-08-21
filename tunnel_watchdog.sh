#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit // Túnel Watchdog
# Verifica que el túnel Cloudflare responda. Si no, mata cloudflareds huérfanos
# y relanza tunnel_monitor.sh. Pensado para correr como cronjob de Hermes cada
# 2 min, sobreviviendo a la sesión del agente.
# ==============================================================================
PROJECT_DIR="/Users/alex/Documents/IA 1.58 bit"
LOG="$PROJECT_DIR/data/tunnel_watchdog.log"
ACTIVE="$PROJECT_DIR/data/active_tunnel.json"
touch "$LOG"

URL=""
if [ -f "$ACTIVE" ]; then
  URL=$(python3 -c "import json,sys; print(json.load(open('$ACTIVE')).get('url',''))" 2>/dev/null)
fi

alive=0
if [ -n "$URL" ]; then
  if curl -s -m 8 "$URL/api/status" >/dev/null 2>&1; then
    alive=1
  fi
fi

if [ "$alive" -eq 1 ]; then
  echo "[$(date)] OK tunel vivo: $URL" >> "$LOG"
  exit 0
fi

echo "[$(date)] TUNEL CAIDO ($URL). Relanzando monitor..." >> "$LOG"

# Matar cloudflareds y monitores previos
pkill -9 -f "cloudflared tunnel" 2>/dev/null
pkill -9 -f "tunnel_monitor.sh" 2>/dev/null
sleep 2

# Relanzar monitor en background (desatado de la sesión)
nohup bash "$PROJECT_DIR/tunnel_monitor.sh" >/dev/null 2>&1 &
echo "[$(date)] Monitor relanzado (pid $!)" >> "$LOG"
