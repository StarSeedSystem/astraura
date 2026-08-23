#!/usr/bin/env bash
# purge_secrets_from_repo.sh — saca del ÍNDICE de git los archivos con claves (Adenda 153).
# No reescribe el historial: para eso (recomendado tras rotar), usa git filter-repo:
#   pip install git-filter-repo && git filter-repo --invert-paths \
#     --path data/personality_apis.json --path data/agent_apis.json \
#     --path backend/data/personality_apis.json --path backend/data/agent_apis.json
set -euo pipefail
cd "$(dirname "$0")/.."
for f in data/personality_apis.json data/agent_apis.json backend/data/personality_apis.json backend/data/agent_apis.json data/sensorium/sensorium_location.json; do
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    git rm --cached -q "$f" && echo "  ✓ quitado del índice: $f"
  fi
done
echo "Ahora: git commit -m 'security: claves y ubicación fuera del repo (Adenda 153)'"
