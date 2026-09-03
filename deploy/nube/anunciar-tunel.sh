#!/bin/bash
# Publica en la nube StarSeed la URL del túnel de ESTA neurona, para que
# astraura-nube.vercel.app pueda decir a cualquier usuario dónde hay un cerebro
# vivo. Solo publica la URL (dato ya público); nunca claves.
URL=$(python3 -c "import json;print(json.load(open('$HOME/Documents/IA 1.58 bit/data/active_tunnel.json')).get('url',''))" 2>/dev/null)
[ -z "$URL" ] && exit 0
ANON=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$HOME/Documents/starseed-os-main/.env.local" | cut -d= -f2-)
[ -z "$ANON" ] && exit 0
curl -s -m 10 -X POST "https://pqzdpmedcsgcedkvndzl.supabase.co/rest/v1/relevo_eventos" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"quien\":\"neurona-alex\",\"tipo\":\"tunel\",\"texto\":\"$URL\"}" >/dev/null && echo "anunciado: $URL"
