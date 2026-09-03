#!/bin/bash
# Espera a que termine el despliegue de Cloud Run y publica el resultado en el
# bus de eventos (Supabase relevo_eventos) para que Claude y Hermes se enteren
# sin sondear: mismo canal que usa el enjambre.
while pgrep -f "desplegar-cloudrun.sh" >/dev/null; do sleep 20; done
URL=$(gcloud run services describe astraura-nube --region us-central1 --format='value(status.url)' 2>/dev/null)
CODIGO=$(curl -s -o /dev/null -m 45 -w '%{http_code}' "${URL}/api/status" 2>/dev/null)
COLA=$(tail -3 /tmp/cloudrun.log 2>/dev/null | tr '\n' ' ' | tr -d '"' | cut -c1-300)
ANON=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$HOME/Documents/starseed-os-main/.env.local" | cut -d= -f2-)
TIPO="verificado"; [ "$CODIGO" = "200" ] || TIPO="fallo"
curl -s -m 15 -X POST "https://pqzdpmedcsgcedkvndzl.supabase.co/rest/v1/relevo_eventos" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"quien\":\"nube\",\"tipo\":\"$TIPO\",\"tarea\":\"cloud-run\",\"texto\":\"Astraura en Cloud Run: ${URL:-sin URL} · /api/status → ${CODIGO:-sin respuesta} · ${COLA}\"}" >/dev/null
echo "avisado: $TIPO $URL $CODIGO"
