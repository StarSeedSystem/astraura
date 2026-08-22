#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit // Configurador Automático de Cloudflare R2
# Crea ~/.astraura/r2_credentials.json para sincronización multi-dispositivo
# del Sistema 1.58-Bit (cerebros, memorias y configuración en tiempo real).
#
# Prioridad de fuente de credenciales:
#   1. Argumentos: --r2-account ID --r2-access-key AK --r2-secret SK [--r2-bucket B]
#   2. Archivo local del repo: r2_credentials.local.json (gitignored, lo crea
#      el usuario una vez y se copia a nuevos dispositivos).
#   3. Variables de entorno: ASTRAURA_R2_ACCOUNT / ASTRAURA_R2_ACCESS_KEY /
#      ASTRAURA_R2_SECRET / ASTRAURA_R2_BUCKET
#   4. Prompt interactivo (si la terminal es interactiva).
# ==============================================================================
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ASTRAURA_DIR="$HOME/.astraura"
CRED_FILE="$ASTRAURA_DIR/r2_credentials.json"
LOCAL_CRED="$REPO_ROOT/r2_credentials.local.json"

# Si ya está configurado, salir (idempotente)
if [ -f "$CRED_FILE" ]; then
  echo "✅ R2 ya configurado en $CRED_FILE"
  exit 0
fi

ACCOUNT=""; AK=""; SK=""; BUCKET="astraura-shared"

# 1. Argumentos
while [[ $# -gt 0 ]]; do
  case "$1" in
    --r2-account) ACCOUNT="$2"; shift 2;;
    --r2-access-key) AK="$2"; shift 2;;
    --r2-secret) SK="$2"; shift 2;;
    --r2-bucket) BUCKET="$2"; shift 2;;
    *) shift;;
  esac
done

# 2. Archivo local del repo (gitignored)
if [ -z "$ACCOUNT" ] && [ -f "$LOCAL_CRED" ]; then
  echo "📂 Usando r2_credentials.local.json del repositorio..."
  mkdir -p "$ASTRAURA_DIR"
  cp "$LOCAL_CRED" "$CRED_FILE"
  echo "✅ R2 configurado desde archivo local."
  exit 0
fi

# 3. Variables de entorno
if [ -z "$ACCOUNT" ]; then
  ACCOUNT="${ASTRAURA_R2_ACCOUNT:-}"
  AK="${ASTRAURA_R2_ACCESS_KEY:-}"
  SK="${ASTRAURA_R2_SECRET:-}"
  BUCKET="${ASTRAURA_R2_BUCKET:-astraura-shared}"
fi

# 4. Prompt interactivo
if [ -z "$ACCOUNT" ] && [ -t 0 ]; then
  echo "☁️  Configuración de Cloudflare R2 (Sincronización Multi-Dispositivo 1.58-Bit)"
  read -p "   Account ID: " ACCOUNT
  read -p "   Access Key ID: " AK
  read -s -p "   Secret Access Key: " SK; echo
  read -p "   Bucket [astraura-shared]: " BUCKET
  BUCKET="${BUCKET:-astraura-shared}"
fi

if [ -z "$ACCOUNT" ] || [ -z "$AK" ] || [ -z "$SK" ]; then
  echo "⚠️  No se proporcionaron credenciales R2. La sincronización multi-dispositivo"
  echo "    estará disponible cuando agregues las credenciales en:"
  echo "    $CRED_FILE"
  echo "    O crea r2_credentials.local.json en el repo (gitignored)."
  exit 0
fi

mkdir -p "$ASTRAURA_DIR"
cat > "$CRED_FILE" <<EOF
{
  "account_id": "$ACCOUNT",
  "access_key_id": "$AK",
  "secret_access_key": "$SK",
  "bucket": "$BUCKET",
  "endpoint": "https://$ACCOUNT.r2.cloudflarestorage.com",
  "note": "Credenciales R2 de Astraura. Fuera del repo. No commitear."
}
EOF
chmod 600 "$CRED_FILE"
echo "✅ R2 configurado en $CRED_FILE (permisos 600)"
echo "   El backend sincronizará cerebros, memorias y configuración automáticamente."
