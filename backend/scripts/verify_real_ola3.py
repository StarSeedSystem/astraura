#!/usr/bin/env python3
"""
Verificación FUNCIONAL REAL del sistema completo Astraura 1.58 (Ola 3 · Adenda 155)
contra un backend VIVO (uvicorn con lifespan) en http://127.0.0.1:8000.

Comprueba, con el modelo REAL cargado (BitNet nativo u Ollama):
  1. motor honesto (`real_mode`) y puente StarSeed presente;
  2. chat multi-personalidad por @menciones (SSE del puente);
  3. disparo de imaginación NO bloqueante + rama generada por el modelo (`generated_by: llm`);
  4. feed de eventos: diversidad por proceso, contador sin leer y `ack`;
  5. resumen normalizado de procesos del puente;
  6. `invoke` real de una personalidad con clave de API con scope;
  7. air-gap soberano on/off;
  8. ciclo de supervisión del Director.
Con `--full` añade el informe de síntesis (lento: encadena varias generaciones).

Uso:  cd backend && python3 scripts/verify_real_ola3.py [--full]
"""
from __future__ import annotations

import json
import sys
import time
import urllib.request

BASE = "http://127.0.0.1:8000"
FULL = "--full" in sys.argv
RESULTS: list[tuple[str, bool, str]] = []


def _master_key() -> str:
    try:
        sys.path.insert(0, ".")
        from app.core.security import master_key
        return master_key() or ""
    except Exception:
        return ""


MASTER_KEY = _master_key()


def req(method: str, path: str, body: dict | None = None, timeout: float = 60.0, key: str | None = None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    k = key or MASTER_KEY
    if k:
        headers["X-Astraura-Key"] = k
    r = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    with urllib.request.urlopen(r, timeout=timeout) as res:
        raw = res.read()
        try:
            return json.loads(raw)
        except Exception:
            return {"_raw": raw.decode(errors="ignore")[:400]}


def sse(path: str, body: dict, timeout: float = 1800.0) -> list[dict]:
    data = json.dumps(body).encode()
    r = urllib.request.Request(BASE + path, data=data, method="POST", headers={"Content-Type": "application/json"})
    events = []
    with urllib.request.urlopen(r, timeout=timeout) as res:
        for line in res:
            line = line.decode(errors="ignore").strip()
            if line.startswith("data:"):
                try:
                    events.append(json.loads(line[5:].strip()))
                except Exception:
                    pass
    return events


def check(name: str, ok: bool, detail: str = ""):
    RESULTS.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""), flush=True)


def main() -> int:
    t0 = time.time()

    # 1 · Motor y puente
    st = req("GET", "/api/status", timeout=30)
    eng = st.get("engine", {})
    real = eng.get("real_mode") in ("bitnet-native", "ollama")
    check("motor con modelo REAL", real, f"{eng.get('real_mode')} · {str(eng.get('active_model'))[:70]}")
    check("puente starseed presente", bool(st.get("starseed_bridge")), str(st.get("starseed_bridge"))[:40])

    # 2 · Chat multi-personalidad por @menciones
    try:
        evs = sse("/api/starseed/chat", {
            "messages": [{"role": "user", "content": "@Hermes y @Logos: en UNA frase cada uno, ¿la web descentralizada necesita más exploración o más lógica?"}],
            "preferences": {"max_length_chars": 320, "multi_personality_mode": "multi_dialogue"},
            "stream": True,
        })
        kinds = {e.get("type") for e in evs}
        done = next((e for e in evs if e.get("type") == "done"), {})
        text = done.get("full_text", "")
        multi = "multi_personality_start" in kinds
        check("chat @menciones multi-personalidad", multi and len(text) > 40,
              f"tipos={sorted(kinds)} chars={len(text)}")
    except Exception as e:
        check("chat @menciones multi-personalidad", False, str(e)[:120])

    # 3 · Imaginación: disparo NO bloqueante + rama del modelo real
    try:
        before = {b.get("id") for b in (req("GET", "/api/imagination/status", timeout=60).get("branches") or [])}
        t1 = time.time()
        trig = req("POST", "/api/starseed/processes/imagination/trigger", {"theme": "sinergia entre el enjambre y StarSeed OS"}, timeout=60)
        dt = time.time() - t1
        check("disparo de imaginación NO bloqueante", dt < 5 and bool(trig.get("scheduled")), f"{dt:.2f}s scheduled={trig.get('scheduled')}")
        found = None
        deadline = time.time() + 1800
        while time.time() < deadline and not found:
            time.sleep(20)
            for b in (req("GET", "/api/imagination/status", timeout=60).get("branches") or []):
                if b.get("id") not in before:
                    found = b
                    break
        if found:
            check("rama imaginada por el MODELO REAL", found.get("generated_by") == "llm",
                  f"gen={found.get('generated_by')} · {str(found.get('hypothesis'))[:80]}")
        else:
            check("rama imaginada por el MODELO REAL", False, "no apareció en 30 min")
    except Exception as e:
        check("disparo de imaginación NO bloqueante", False, str(e)[:120])

    # 4 · Eventos: diversidad, contador y ack
    try:
        ev = req("GET", "/api/starseed/events?limit=24", timeout=60)
        evs2 = ev.get("events") or []
        kinds = {}
        for e in evs2:
            kinds[str(e.get("kind"))] = kinds.get(str(e.get("kind")), 0) + 1
        check("feed de eventos con TODOS los procesos", len(evs2) > 0 and len(kinds) >= 2 and isinstance(ev.get("unread_count"), int),
              f"página={kinds} total={ev.get('total')} sin_leer={ev.get('unread_count')}")
        ids = [e["id"] for e in evs2[:2] if e.get("id")]
        if ids:
            ack = req("POST", "/api/starseed/events/ack", {"ids": ids}, timeout=60)
            after = req("GET", "/api/starseed/events?limit=50", timeout=60)
            still = [e for e in (after.get("events") or []) if e.get("id") in ids and not (e.get("acked") or e.get("read"))]
            check("ack de eventos", not still, f"acked={ack.get('acked')}")
    except Exception as e:
        check("feed de eventos con TODOS los procesos", False, str(e)[:120])

    # 5 · Procesos normalizados
    try:
        pr = req("GET", "/api/starseed/processes", timeout=60)
        names = sorted(str(p.get("id")) for p in (pr.get("processes") or []))
        check("procesos del puente", {"imagination", "swarm", "director", "engine"} <= set(names), f"{len(names)}: {names}")
    except Exception as e:
        check("procesos del puente", False, str(e)[:120])

    # 6 · Invoke real de una personalidad (clave de API con scope)
    try:
        rk = req("POST", "/api/personalities/logos/generate_key", {}, timeout=60)
        raw = rk.get("new_api_key") or rk.get("api_key") or ""
        inv = req("POST", "/api/v1/personalities/logos/invoke", {"prompt": "Di en una frase qué haces por StarSeed."}, timeout=1200, key=raw)
        out = str(inv.get("output") or inv.get("response") or inv.get("result") or "")
        check("invoke REAL de personalidad", len(out) > 20, f"gen={inv.get('generated_by')} → {out[:70]!r}")
    except Exception as e:
        check("invoke REAL de personalidad", False, str(e)[:140])

    # 7 · Air-gap
    try:
        req("POST", "/api/privacy/toggle_air_gap", {"enabled": True}, timeout=60)
        on = req("GET", "/api/privacy/settings", timeout=60)
        active = bool(on.get("air_gap_active") or (on.get("settings") or {}).get("strict_air_gap_mode"))
        req("POST", "/api/privacy/toggle_air_gap", {"enabled": False}, timeout=60)
        off = req("GET", "/api/privacy/settings", timeout=60)
        inactive = not (off.get("air_gap_active") or (off.get("settings") or {}).get("strict_air_gap_mode"))
        check("air-gap soberano on/off", active and inactive)
    except Exception as e:
        check("air-gap soberano on/off", False, str(e)[:120])

    # 8 · Director
    try:
        cyc = req("POST", "/api/director/trigger_cycle", {}, timeout=1200)
        check("ciclo del Director", "error" not in cyc, str(cyc.get("message") or list(cyc.keys()))[:70])
    except Exception as e:
        check("ciclo del Director", False, str(e)[:120])

    # 9 · Síntesis (solo con --full: encadena varias generaciones)
    if FULL:
        try:
            rep = req("POST", "/api/imagination/synthesis_reports/generate", {"trigger_type": "manual_request"}, timeout=3600)
            r = rep.get("report") or {}
            check("informe de síntesis", bool(r.get("executive_summary")), f"gen={r.get('generated_by') or rep.get('generated_by')}")
        except Exception as e:
            check("informe de síntesis", False, str(e)[:120])

    ok = sum(1 for _, o, _ in RESULTS if o)
    print(f"\n== {ok}/{len(RESULTS)} PASS en {time.time() - t0:.0f}s ==")
    return 0 if ok == len(RESULTS) else 1


if __name__ == "__main__":
    sys.exit(main())
