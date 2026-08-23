#!/usr/bin/env python3
"""
rotate_keys.py — Rota TODAS las claves de API de personalidades y agentes (Adenda 153).

Las claves antiguas vivían en `data/*_apis.json` y `backend/data/*_apis.json`
(commiteadas en git → comprometidas). Ahora viven en `~/.astraura/keys/`
(o `ASTRAURA_KEYS_DIR`). Este script:
  1. revoca y regenera cada clave activa con los engines oficiales;
  2. imprime las claves NUEVAS UNA sola vez (guárdalas en tu gestor);
  3. sobrescribe las copias antiguas del repo con un placeholder vacío.

Uso:  cd backend && python3 ../scripts/rotate_keys.py [--dry-run]
"""
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))
os.chdir(BACKEND)

dry = "--dry-run" in sys.argv

from app.core.personality_api_engine import personality_api_engine  # noqa: E402
from app.core.agent_vault_engine import agent_vault_engine  # noqa: E402

rotated = []
for pid in list(personality_api_engine.api_records.keys()):
    if dry:
        rotated.append(("personalidad", pid, "(dry-run)"))
        continue
    res = personality_api_engine.regenerate_api_key(pid)
    key = (res.get("new_api_key") or res.get("api_key") or "?")
    rotated.append(("personalidad", pid, key))

for aid in list(agent_vault_engine.api_records.keys()):
    if dry:
        rotated.append(("agente", aid, "(dry-run)"))
        continue
    res = agent_vault_engine.regenerate_agent_api_key(aid)
    key = (res.get("new_api_key") or res.get("api_key") or "?")
    rotated.append(("agente", aid, key))

print("\n🔐 Claves rotadas (cópialas AHORA; no se vuelven a mostrar completas):")
for kind, ident, key in rotated:
    print(f"  {kind:12s} {ident:28s} {key}")

legacy = [ROOT / "data" / "personality_apis.json", ROOT / "data" / "agent_apis.json",
          BACKEND / "data" / "personality_apis.json", BACKEND / "data" / "agent_apis.json"]
for f in legacy:
    if f.exists() and not dry:
        f.write_text(json.dumps({"_note": "claves movidas a ~/.astraura/keys (Adenda 153); este archivo ya no contiene secretos"}, indent=2), encoding="utf-8")
        print(f"  🧹 placeholder escrito en {f}")
print("\nSiguiente paso: bash scripts/purge_secrets_from_repo.sh  (quita los archivos del índice de git)")
