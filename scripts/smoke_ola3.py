#!/usr/bin/env python3
"""
smoke_ola3.py — Prueba de humo de la Ola 3 (OS · cognición real, puente de procesos, air-gap).

Uso:  cd backend && python3 ../scripts/smoke_ola3.py

Arranca la app con `fastapi.testclient.TestClient` SIN lifespan (sin `with`): no se
lanzan los bucles de fondo (imaginación, enjambre, sync, túnel). Comprueba:
  1. GET  /api/starseed/processes → 200 con las 8 claves de procesos.
  2. GET  /api/starseed/events    → 200 con lista `events`.
  3. POST /api/starseed/processes/imagination/trigger → 200.
  4. POST /api/v1/personalities/aurora/invoke con clave válida → 200 y `response`
     REAL (≠ "Respuesta procesada."). En modo plantillas es un párrafo de plantilla.
  5. Air-gap: toggle ON → POST /api/browser/search devuelve success=False con el
     error "air-gap activo" → toggle OFF.
  + comprobaciones baratas: manifest con events_url, ack de eventos, invoke de agente.

Imprime PASS/FAIL por comprobación y termina con código ≠ 0 si alguna falla.
"""
import json
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))
os.chdir(BACKEND)

# Entorno ANTES de importar app.main (clave maestra + claves fuera del repo).
os.environ.setdefault("ASTRAURA_API_KEY", "test")
os.environ.setdefault("ASTRAURA_KEYS_DIR", "/tmp/keys_smoke")
os.environ.setdefault("ASTRAURA_AUTH_MODE", "local-only")

import warnings  # noqa: E402
warnings.filterwarnings("ignore")

from fastapi.testclient import TestClient  # noqa: E402

import app.main as main_module  # noqa: E402
from app.core.personality_api_engine import personality_api_engine  # noqa: E402
from app.core.agent_vault_engine import agent_vault_engine  # noqa: E402
from app.core.privacy_manager import privacy_manager, AIR_GAP_ERROR  # noqa: E402
from app.core import cognition  # noqa: E402

MASTER = {"X-Astraura-Key": os.environ["ASTRAURA_API_KEY"]}
PROCESS_KEYS = ["imagination", "swarm", "director", "dream", "auth_orchestrator", "engine", "privacy", "sync"]

client = TestClient(main_module.app)  # sin `with` → sin lifespan
results = []


def check(name: str, ok: bool, detail: str = ""):
    results.append((name, bool(ok), detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))


def main() -> int:
    t_start = time.time()
    print(f"Motor real: {cognition.engine_mode()} · rutas: {len(main_module.app.routes)}")

    # 1. /api/starseed/processes
    try:
        r = client.get("/api/starseed/processes", headers=MASTER)
        data = r.json() if r.status_code == 200 else {}
        missing = [k for k in PROCESS_KEYS if k not in data]
        check("GET /api/starseed/processes → 200 con 8 claves", r.status_code == 200 and not missing,
              f"status={r.status_code} faltan={missing} air_gap={data.get('privacy', {}).get('air_gap')} "
              f"engine={data.get('engine', {}).get('real_mode')}")
    except Exception as e:
        check("GET /api/starseed/processes → 200 con 8 claves", False, repr(e))

    # 2. /api/starseed/events
    events_payload = {}
    try:
        r = client.get("/api/starseed/events?limit=50", headers=MASTER)
        events_payload = r.json() if r.status_code == 200 else {}
        evs = events_payload.get("events")
        ok = r.status_code == 200 and isinstance(evs, list) and "server_ts" in events_payload
        ids_ok = all(isinstance(e.get("id"), str) and ":" in e["id"] and "kind" in e and "ts" in e for e in (evs or []))
        check("GET /api/starseed/events → 200 con lista events", ok and ids_ok,
              f"status={r.status_code} total={events_payload.get('total')} unread={events_payload.get('unread')} "
              f"kinds={sorted({e.get('kind') for e in (evs or [])})}")
    except Exception as e:
        check("GET /api/starseed/events → 200 con lista events", False, repr(e))

    # 2b. ack de eventos (marca leídas notificaciones y recuerda imag:/swarm:/learn:)
    try:
        evs = events_payload.get("events") or []
        sample_ids = [e["id"] for e in evs[:3]]
        r = client.post("/api/starseed/events/ack", json={"ids": sample_ids}, headers=MASTER)
        d = r.json() if r.status_code == 200 else {}
        check("POST /api/starseed/events/ack → 200", r.status_code == 200 and d.get("success") is True,
              f"ids={sample_ids} acked={d.get('acked')} unknown={d.get('unknown')}")
    except Exception as e:
        check("POST /api/starseed/events/ack → 200", False, repr(e))

    # 2c. manifest intacto + descubrimiento de rutas nuevas
    try:
        r = client.get("/api/starseed/manifest", headers=MASTER)
        d = r.json() if r.status_code == 200 else {}
        check("GET /api/starseed/manifest → 200 con events_url",
              r.status_code == 200 and d.get("events_url") == "/api/starseed/events" and isinstance(d.get("personalities"), list),
              f"status={r.status_code} personalities={len(d.get('personalities') or [])} bridge={d.get('bridge')}")
    except Exception as e:
        check("GET /api/starseed/manifest → 200 con events_url", False, repr(e))

    # 3. trigger de imaginación vía puente
    try:
        r = client.post("/api/starseed/processes/imagination/trigger",
                        json={"theme": "Prueba de humo Ola 3", "process_type": "lucid_cyberdelic_creativity"}, headers=MASTER)
        d = r.json() if r.status_code == 200 else {}
        branch = d.get("branch") or {}
        check("POST /api/starseed/processes/imagination/trigger → 200", r.status_code == 200 and d.get("success") is True,
              f"status={r.status_code} theme={str(branch.get('theme'))[:60]!r} generated_by={branch.get('generated_by')}")
    except Exception as e:
        check("POST /api/starseed/processes/imagination/trigger → 200", False, repr(e))

    # 4. invoke REAL de personalidad (clave generada en el propio script)
    try:
        keyres = personality_api_engine.regenerate_api_key("aurora")
        key = keyres.get("new_api_key")
        r = client.post("/api/v1/personalities/aurora/invoke",
                        json={"prompt": "Preséntate en dos frases y di qué puedes hacer por StarSeed OS."},
                        headers={"X-Astraura-Key": key})
        d = r.json() if r.status_code == 200 else {}
        resp = (d.get("response") or "").strip()
        ok = r.status_code == 200 and d.get("success") is True and resp and resp != "Respuesta procesada." and len(resp) > 20
        check("POST /api/v1/personalities/aurora/invoke → 200 con respuesta real (no placeholder)", ok,
              f"status={r.status_code} generated_by={d.get('generated_by')} engine={d.get('engine_mode')} "
              f"latency={d.get('latency_ms')}ms len={len(resp)} preview={resp[:70]!r}")
    except Exception as e:
        check("POST /api/v1/personalities/aurora/invoke → 200 con respuesta real (no placeholder)", False, repr(e))

    # 4b. invoke sin clave → 401 (auth intacta)
    try:
        r = client.post("/api/v1/personalities/aurora/invoke", json={"prompt": "hola"})
        check("POST /api/v1/personalities/aurora/invoke sin clave → 401", r.status_code == 401, f"status={r.status_code}")
    except Exception as e:
        check("POST /api/v1/personalities/aurora/invoke sin clave → 401", False, repr(e))

    # 4c. invoke de agente (primera personalidad del agente)
    try:
        agents = agent_vault_engine.list_agents() or []
        agent_id = agents[0]["id"] if agents else None
        if agent_id:
            k = agent_vault_engine.regenerate_agent_api_key(agent_id)
            akey = k.get("new_api_key") or k.get("api_key")
            r = client.post(f"/api/v1/agents/{agent_id}/invoke", json={"prompt": "Resume tu misión en una frase."},
                            headers={"X-Astraura-Key": akey})
            d = r.json() if r.status_code == 200 else {}
            resp = (d.get("response") or "").strip()
            ok = r.status_code == 200 and resp and resp != "Tarea del agente completada."
            check(f"POST /api/v1/agents/{agent_id}/invoke → 200 con respuesta real", ok,
                  f"status={r.status_code} persona={d.get('persona_id')} len={len(resp)} preview={resp[:60]!r}")
        else:
            check("POST /api/v1/agents/<id>/invoke → 200 con respuesta real", False, "sin agentes en la bóveda")
    except Exception as e:
        check("POST /api/v1/agents/<id>/invoke → 200 con respuesta real", False, repr(e))

    # 5. Air-gap real: toggle ON → búsqueda bloqueada → toggle OFF
    was_on = privacy_manager.is_air_gapped()
    try:
        r = client.post("/api/privacy/toggle_air_gap", json={"enabled": True}, headers=MASTER)
        d = r.json() if r.status_code == 200 else {}
        check("POST /api/privacy/toggle_air_gap {enabled:true} → air_gap_mode=true",
              r.status_code == 200 and d.get("air_gap_mode") is True and privacy_manager.is_air_gapped(), f"status={r.status_code} {d}")

        r = client.post("/api/browser/search", json={"query": "bitnet", "num_results": 2}, headers=MASTER)
        d = r.json() if r.status_code == 200 else {}
        ok = r.status_code == 200 and d.get("success") is False and AIR_GAP_ERROR in str(d.get("error", ""))
        check("POST /api/browser/search con air-gap → success=False + 'air-gap activo'", ok, f"status={r.status_code} {d}")

        r = client.get("/api/starseed/processes", headers=MASTER)
        d = r.json() if r.status_code == 200 else {}
        check("GET /api/starseed/processes refleja privacy.air_gap=true", d.get("privacy", {}).get("air_gap") is True,
              f"privacy={d.get('privacy')} sync={d.get('sync', {}).get('air_gap')}")

        # El chat sigue funcionando con air-gap (puente /chat sin stream).
        r = client.post("/api/starseed/chat", json={"messages": [{"role": "user", "content": "¿Sigues operativa en modo aislado?"}],
                                                    "persona_id": "aurora", "stream": False}, headers=MASTER)
        d = r.json() if r.status_code == 200 else {}
        check("POST /api/starseed/chat con air-gap → 200 con respuesta", r.status_code == 200 and bool((d.get("response") or "").strip()),
              f"status={r.status_code} len={len(d.get('response') or '')}")
    finally:
        r = client.post("/api/privacy/toggle_air_gap", json={"enabled": was_on}, headers=MASTER)
        d = r.json() if r.status_code == 200 else {}
        check(f"POST /api/privacy/toggle_air_gap {{enabled:{str(was_on).lower()}}} → restaurado",
              r.status_code == 200 and d.get("air_gap_mode") is was_on, f"status={r.status_code} {d}")

    failed = [n for n, ok, _ in results if not ok]
    print("-" * 72)
    print(f"{len(results) - len(failed)}/{len(results)} comprobaciones OK en {time.time() - t_start:.1f}s · motor={cognition.engine_mode()}")
    if failed:
        print("FALLARON: " + "; ".join(failed))
        return 1
    print("SMOKE OLA 3: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
