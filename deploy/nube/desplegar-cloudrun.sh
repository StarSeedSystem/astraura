#!/bin/bash
# Despliegue económico de Astraura en Cloud Run.
#   · min-instances=0  → escala a cero, no se paga por estar encendida
#   · max-instances=2  → techo de gasto aunque llegue tráfico raro
#   · 1 GiB / 1 vCPU con CPU solo durante la petición (cpu-throttling)
#   · tras desplegar, borra las imágenes viejas: el almacenamiento acumulado
#     era lo único que cobraba de verdad en la etapa anterior.
set -u
cd "$(dirname "$0")/../.." || exit 1
ENV_OS="$HOME/Documents/starseed-os-main/.env.local"
SUPA_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_OS" | cut -d= -f2-)
SUPA_SRV=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_OS" | cut -d= -f2-)

gcloud run deploy astraura-nube \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=2 \
  --memory=1Gi \
  --cpu=1 \
  --concurrency=40 \
  --timeout=300 \
  --set-env-vars "ASTRAURA_MODE=nube,SUPABASE_URL=${SUPA_URL},SUPABASE_SERVICE_ROLE_KEY=${SUPA_SRV}" \
  --quiet
SALIDA=$?

echo "--- limpieza de imágenes antiguas (deja solo la última) ---"
REPO="us-central1-docker.pkg.dev/gen-lang-client-0222660240/cloud-run-source-deploy/astraura-nube"
gcloud artifacts docker images list "$REPO" --include-tags --sort-by=~UPDATE_TIME --format='value(DIGEST)' 2>/dev/null \
  | tail -n +2 \
  | while read -r d; do [ -n "$d" ] && gcloud artifacts docker images delete "${REPO}@${d}" --delete-tags --quiet 2>/dev/null; done
gcloud run services describe astraura-nube --region us-central1 --format='value(status.url)' 2>/dev/null
exit $SALIDA
