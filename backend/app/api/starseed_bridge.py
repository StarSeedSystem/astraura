"""
starseed_bridge.py — Puente oficial Astraura 1.58-bit ⇄ StarSeed OS (Adenda 153 del OS).

Tres rutas pequeñas y estables que el OS usa para tratar a este backend como su
SISTEMA PRIMARIO de inteligencia (ver en el repo del OS
`architecture/astraura-158-sistema-primario.md`):

  GET  /api/starseed/health    — latido ligero (sin telemetría pesada).
  GET  /api/starseed/manifest  — motor + personalidades + agentes + habilidades +
                                 cerebros en UNA llamada (el panel del OS).
  POST /api/starseed/chat      — chat con `messages[]` estilo OpenAI (system/user/
                                 assistant). El backend es single-turn: aquí se
                                 construye la transcripción en el servidor y se
                                 reusa `orchestrator.generate_response_stream`,
                                 devolviendo el MISMO SSE que /api/chat/stream
                                 (branching_plan · agent_traces · token · done).

Compatibilidad: si un OS antiguo no conoce estas rutas sigue usando
/api/chat/stream; si un backend antiguo no las tiene, el OS recibe 404 y cae a
/api/chat/stream. Sin dependencias nuevas.

(OS · Ola 3) Rutas nuevas para que el OS vea y gobierne los PROCESOS de fondo:
  GET  /api/starseed/events?since=&limit=   — bandeja unificada (notificaciones no
                                              leídas, propuestas de imaginación que
                                              esperan permiso, tareas del enjambre
                                              completadas, eventos de aprendizaje)
                                              con ids ESTABLES y acciones que apuntan
                                              a endpoints existentes.
  POST /api/starseed/events/ack {ids}       — marca leído / recuerda acks en
                                              data/starseed_bridge_acks.json.
  GET  /api/starseed/processes              — estado de todos los procesos en UNA
                                              llamada (imaginación, enjambre, director,
                                              sueños, autorizaciones, motor, privacidad,
                                              sincronización).
  POST /api/starseed/processes/imagination/trigger {theme?, process_type?}
"""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/starseed", tags=["StarSeed OS bridge"])

BRIDGE_VERSION = "1.1.0"  # (OS · Ola 3) 1.0.0 + events/ack/processes/trigger
HISTORY_BUDGET_CHARS = 9000


class BridgeMessage(BaseModel):
    role: str
    content: str


class BridgeChatRequest(BaseModel):
    messages: List[BridgeMessage]
    persona_id: Optional[str] = None
    system_prompt: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    stream: Optional[bool] = True


def build_prompt(messages: List[BridgeMessage], extra_system: Optional[str] = None) -> Dict[str, str]:
    """Transcripción single-turn (misma regla que el adaptador del OS)."""
    systems = [m.content.strip() for m in messages if m.role == "system" and m.content.strip()]
    if extra_system and extra_system.strip():
        systems.append(extra_system.strip())
    system_prompt = "\n\n".join(systems)
    turns = [m for m in messages if m.role != "system"]
    if not turns:
        return {"system_prompt": system_prompt, "prompt": ""}
    last = turns[-1]
    last_user = last.content if last.role == "user" else ""
    history = turns[:-1] if last.role == "user" else turns
    if not history:
        return {"system_prompt": system_prompt, "prompt": last_user.strip()}
    lines: List[str] = []
    used = 0
    for m in reversed(history):
        who = "Usuario" if m.role == "user" else "Astraura"
        line = f"{who}: {m.content.strip()}"
        if used + len(line) > HISTORY_BUDGET_CHARS:
            break
        lines.insert(0, line)
        used += len(line) + 1
    transcript = "\n".join(lines)
    if last_user:
        prompt = (
            "Transcripción de la conversación hasta ahora (responde SOLO al último mensaje "
            "del usuario, sin repetir la transcripción):\n"
            f"{transcript}\n\nÚltimo mensaje del usuario:\n{last_user.strip()}"
        )
    else:
        prompt = f"Transcripción de la conversación hasta ahora. Continúa de forma natural:\n{transcript}"
    return {"system_prompt": system_prompt, "prompt": prompt}


def _safe(fn, default):
    try:
        return fn()
    except Exception:
        return default


@router.get("/health")
async def starseed_health():
    from ..engine.bitnet_engine import bitnet_engine
    engine = _safe(bitnet_engine.get_engine_status, {})
    return {
        "status": "online",
        "bridge": BRIDGE_VERSION,
        "engine": {
            "active_model": engine.get("active_model"),
            "bitnet_cpp_installed": engine.get("bitnet_cpp_installed"),
            "models_on_disk": len(engine.get("models_on_disk") or []),
        },
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@router.get("/manifest")
async def starseed_manifest():
    from ..engine.bitnet_engine import bitnet_engine
    from ..personalities.personality_engine import personality_engine
    from ..skills.starseed_library import starseed_library
    from ..core.agent_vault_engine import agent_vault_engine
    from ..agents.agent_registry import agent_registry
    from ..cerebros.cerebros_manager import cerebros_manager

    engine = _safe(bitnet_engine.get_engine_status, {})
    personalities = _safe(personality_engine.list_personalities, [])
    active = _safe(personality_engine.get_active_persona, {}) or {}
    skills = _safe(starseed_library.get_all_skills, [])
    vault_agents = [dict(a, origin="vault") for a in (_safe(agent_vault_engine.list_agents, []) or [])]
    eco_agents = [dict(a, origin="ecosystem") for a in (_safe(agent_registry.get_all_agents, []) or [])]
    cerebros = _safe(cerebros_manager.get_cerebros, {}) or {}

    # Catálogo compacto: el OS no necesita los prompts completos ni las claves.
    def slim_persona(p: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": p.get("id"),
            "name": p.get("name"),
            "title": p.get("title"),
            "color": p.get("color"),
            "description": (p.get("description") or "")[:240],
            "is_custom": bool(p.get("is_custom")),
            "temperature": p.get("temperature"),
            "voice_profile": {
                "voice_id": (p.get("voice_profile") or {}).get("voice_id"),
                "caracter": (p.get("voice_profile") or {}).get("caracter"),
            },
            "tags": p.get("tags") or [],
        }

    def slim_brain(b: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": b.get("id"),
            "name": b.get("name"),
            "scope": b.get("scope"),
            "role": b.get("role"),
            "color": b.get("color"),
            "active_persona": b.get("active_persona"),
            "md_layers": {k: (v or "")[:160] for k, v in (b.get("md_layers") or {}).items()},
            "memory_neurons": [
                {"id": n.get("id"), "name": n.get("name"), "type": n.get("type"), "enabled": n.get("enabled", True)}
                for n in (b.get("memory_neurons") or [])
            ],
            "linked_personalities": b.get("linked_personalities") or [],
        }

    return {
        "bridge": BRIDGE_VERSION,
        "status": {"status": "online", "engine": engine},
        "personalities": [slim_persona(p) for p in personalities],
        "active_persona_id": active.get("id"),
        "agents": vault_agents + eco_agents,
        "skills": skills,
        "cerebros": [slim_brain(b) for b in (cerebros.get("cerebros") or [])],
        "active_brain_id": cerebros.get("active_brain_id"),
        # (OS · Ola 3) Descubrimiento de las rutas de procesos/eventos.
        "events_url": "/api/starseed/events",
        "events_ack_url": "/api/starseed/events/ack",
        "processes_url": "/api/starseed/processes",
        "imagination_trigger_url": "/api/starseed/processes/imagination/trigger",
    }


@router.post("/chat")
async def starseed_chat(req: BridgeChatRequest):
    from ..agents.orchestrator import orchestrator

    built = build_prompt(req.messages, req.system_prompt)
    prefs: Dict[str, Any] = dict(req.preferences or {})
    if req.persona_id:
        prefs.setdefault("personaId", req.persona_id)
        prefs.setdefault("selected_personalities", [req.persona_id])
    prefs.setdefault("multi_personality_mode", "single")
    prefs.setdefault("client", "starseed-os")

    if not built["prompt"].strip():
        return {"error": "messages sin mensaje de usuario"}

    if req.stream is False:
        full = ""
        async for event in orchestrator.generate_response_stream(built["prompt"], built["system_prompt"], preferences=prefs):
            if event.get("type") == "token":
                full += event.get("token", "")
            elif event.get("type") == "done" and not full:
                full = event.get("full_text", "")
        return {"response": full, "persona_id": req.persona_id, "bridge": BRIDGE_VERSION}

    async def sse_generator():
        async for event in orchestrator.generate_response_stream(built["prompt"], built["system_prompt"], preferences=prefs):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")


# ======================= (OS · Ola 3) Eventos, acks y procesos =======================

# Acks persistidos (ids de eventos que no son notificaciones: imag:/swarm:/learn:).
ACKS_FILE: Path = None  # se resuelve perezosamente contra DATA_DIR
ACKS_MAX = 2000

# Mapa categoría de notificación → kind del evento (el OS filtra por kind).
_KIND_BY_CATEGORY = {
    "solicitud de autorización": "authorization",
    "autorización soberana": "authorization",
    "gobernanza de solicitudes": "authorization",
    "authorization": "authorization",
    "control del dispositivo": "authorization",
    "imaginación intuitiva": "imagination",
    "imaginación & sueños": "imagination",
    "propuesta onírica aplicada": "imagination",
    "administración de proyectos": "imagination",
    "sensores & entorno": "sensor",
    "percepción sensorial": "sensor",
    "hardware & m1": "hardware",
    "reciclaje de memoria": "recycle",
    "almacenamiento": "recycle",
}

_LEVEL_BY_SEVERITY = {"info": "info", "suggestion": "info", "success": "success", "warning": "warning", "error": "error"}


def _acks_path() -> Path:
    global ACKS_FILE
    if ACKS_FILE is None:
        from ..core.config import DATA_DIR
        ACKS_FILE = Path(DATA_DIR) / "starseed_bridge_acks.json"
    return ACKS_FILE


def _load_acks() -> Dict[str, float]:
    try:
        p = _acks_path()
        if p.exists():
            data = json.loads(p.read_text(encoding="utf-8"))
            if isinstance(data, dict) and isinstance(data.get("acked"), dict):
                return {str(k): float(v) for k, v in data["acked"].items()}
    except Exception:
        pass
    return {}


def _save_acks(acked: Dict[str, float]) -> None:
    try:
        items = sorted(acked.items(), key=lambda kv: kv[1], reverse=True)[:ACKS_MAX]
        p = _acks_path()
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps({"acked": dict(items), "updated_at": time.time()}, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"⚠️ [StarSeed bridge] No se pudieron guardar los acks: {e}")


def _kind_for(category: str, action_type: Optional[str], branch_id: Optional[str]) -> str:
    if branch_id or action_type == "grant_authorization":
        return "authorization"
    return _KIND_BY_CATEGORY.get((category or "").strip().lower(), "system")


def _notification_events(since: Optional[float]) -> List[Dict[str, Any]]:
    from ..core.system_notifications_engine import system_notifications_engine
    from ..core.intuitive_imagination_engine import intuitive_imagination_engine

    pending_branch_ids = {
        b.get("id") for b in intuitive_imagination_engine.branches
        if b.get("status") == "pending_approval" or b.get("requires_user_approval")
    }
    events: List[Dict[str, Any]] = []
    for n in system_notifications_engine.notifications:
        if n.get("read"):
            continue
        ts = float(n.get("timestamp") or 0)
        if since is not None and ts < since:
            continue
        nid = str(n.get("id"))
        branch_id = n.get("branch_id") or (nid.replace("notif_req_", "") if nid.startswith("notif_req_") else None)
        # La rama pendiente ya viaja como evento `imag:<branch_id>` (con más contexto y
        # la acción de concesión); se evita el duplicado.
        if branch_id and branch_id in pending_branch_ids:
            continue
        actions: List[Dict[str, Any]] = []
        if n.get("action_type") or branch_id:
            actions.append({"id": "apply", "label": "Aplicar", "method": "POST", "endpoint": "/api/notifications/apply", "body": {"notif_id": nid}})
        actions.append({"id": "mark_read", "label": "Marcar leída", "method": "POST", "endpoint": "/api/notifications/mark_read", "body": {"notif_id": nid}})
        actions.append({"id": "delete", "label": "Descartar", "method": "POST", "endpoint": "/api/notifications/delete", "body": {"notif_id": nid}})
        events.append({
            "id": f"notif:{nid}",
            "ts": ts,
            "kind": _kind_for(n.get("category", ""), n.get("action_type"), branch_id),
            "title": n.get("title", "Aviso del Sistema"),
            "body": n.get("message", ""),
            "level": _LEVEL_BY_SEVERITY.get(str(n.get("severity", "info")), "info"),
            "source": "notifications",
            "category": n.get("category"),
            "status": n.get("status"),
            "read": bool(n.get("read", False)),
            "actions": actions,
        })
    return events


def _imagination_events(since: Optional[float], acked: Dict[str, float]) -> List[Dict[str, Any]]:
    from ..core.intuitive_imagination_engine import intuitive_imagination_engine
    events: List[Dict[str, Any]] = []
    for b in intuitive_imagination_engine.branches:
        if not (b.get("status") == "pending_approval" or b.get("requires_user_approval")):
            continue
        bid = str(b.get("id"))
        eid = f"imag:{bid}"
        if eid in acked:
            continue
        ts = float(b.get("timestamp") or 0)
        if since is not None and ts < since:
            continue
        agent = b.get("responsible_agent") or {}
        events.append({
            "id": eid,
            "ts": ts,
            "kind": "imagination",
            "title": f"Propuesta: {b.get('theme', 'Imaginación')}",
            "body": f"{b.get('hypothesis', '')} — {b.get('insights', '')}".strip(" —"),
            "level": "warning" if str(b.get("importance_level", "")) in ("high", "critical_security") else "info",
            "source": "imagination",
            "process_type": b.get("process_type"),
            "process_name": b.get("process_name"),
            "importance_level": b.get("importance_level"),
            "generated_by": b.get("generated_by", "template"),
            "agent": agent.get("id") if isinstance(agent, dict) else None,
            "persona": agent.get("id") if isinstance(agent, dict) else None,
            "read": False,
            "actions": [
                {"id": "grant", "label": "Conceder y aplicar", "method": "POST", "endpoint": f"/api/imagination/requests/{bid}/grant", "body": {"data": None}},
                {"id": "regenerate", "label": "Regenerar", "method": "POST", "endpoint": f"/api/imagination/branch/{bid}/regenerate"},
                {"id": "discard", "label": "Descartar", "method": "DELETE", "endpoint": f"/api/imagination/branch/{bid}"},
            ],
        })

    # (Adenda 155) Ramas YA resueltas (aplicadas sola por la política de permisos o
    # por el orquestador de autorizaciones): el usuario debe VER lo que su sistema
    # pensó e hizo sin preguntarle — si no, el feed solo enseña al enjambre y la
    # imaginación autónoma queda invisible. Informativas, ackeables, con el mismo id.
    resolved = [
        b for b in intuitive_imagination_engine.branches
        if not (b.get("status") == "pending_approval" or b.get("requires_user_approval"))
    ]
    resolved.sort(key=lambda b: float(b.get("timestamp") or 0), reverse=True)
    for b in resolved[:12]:
        bid = str(b.get("id"))
        eid = f"imag:{bid}"
        if eid in acked:
            continue
        ts = float(b.get("timestamp") or 0)
        if since is not None and ts < since:
            continue
        agent = b.get("responsible_agent") or {}
        applied_by = str(b.get("applied_by") or "")
        events.append({
            "id": eid,
            "ts": ts,
            "kind": "imagination",
            "title": f"Imaginado: {b.get('theme', 'rama')}",
            "body": f"{b.get('hypothesis', '')} — {b.get('insights', '')}".strip(" —"),
            "level": "info",
            "source": "imagination",
            "process_type": b.get("process_type"),
            "process_name": b.get("process_name"),
            "importance_level": b.get("importance_level"),
            "generated_by": b.get("generated_by", "template"),
            "status": b.get("status"),
            "applied_by": applied_by or None,
            "agent": agent.get("id") if isinstance(agent, dict) else None,
            "persona": agent.get("id") if isinstance(agent, dict) else None,
            "read": False,
            "actions": [
                {"id": "open", "label": "Ver en el Studio", "method": "GET", "endpoint": f"/api/imagination/process/{b.get('process_type') or ''}/branches"},
                {"id": "discard", "label": "Descartar", "method": "DELETE", "endpoint": f"/api/imagination/branch/{bid}"},
            ],
        })
    return events


def _director_events(since: Optional[float], acked: Dict[str, float]) -> List[Dict[str, Any]]:
    """(Adenda 155) Decisiones recientes del Director (Metis): auditorías, enrutados
    y directivas. Son el «qué está haciendo el sistema por su cuenta» del enjambre."""
    from ..agents.director_orchestrator import director_orchestrator
    events: List[Dict[str, Any]] = []
    try:
        status = director_orchestrator.get_status() or {}
    except Exception:
        return events
    history = status.get("decision_history") or []
    for h in list(history)[-10:]:
        hid = str(h.get("id") or h.get("timestamp") or "")
        if not hid:
            continue
        eid = f"director:{hid}"
        if eid in acked:
            continue
        ts = float(h.get("timestamp") or 0)
        if since is not None and ts < since:
            continue
        events.append({
            "id": eid,
            "ts": ts,
            "kind": "director",
            "title": f"Director: {h.get('action', 'decisión')}",
            "body": str(h.get("reasoning") or "")[:400],
            "level": "info",
            "source": "director",
            "agent": h.get("agent_id"),
            "status": h.get("status"),
            "read": False,
            "actions": [{"id": "open", "label": "Ver Director", "method": "GET", "endpoint": "/api/director/status"}],
        })
    return events


def _swarm_events(since: Optional[float], acked: Dict[str, float]) -> List[Dict[str, Any]]:
    from ..agents.swarm_manager import swarm_manager
    events: List[Dict[str, Any]] = []
    for t in swarm_manager.active_tasks:
        if t.get("status") != "completed":
            continue
        ts = float(t.get("completed_at") or t.get("started_at") or 0)
        if since is not None and ts < since:
            continue
        tid = str(t.get("id"))
        eid = f"swarm:{tid}"
        body = t.get("deliverable_excerpt") or (t.get("logs") or ["Tarea completada."])[-1]
        agent_id = t.get("agent_id")
        persona = None
        try:
            used = swarm_manager.agents.get(agent_id, {}).get("used_personalities") or []
            persona = used[0].get("id") if used else None
        except Exception:
            persona = None
        events.append({
            "id": eid,
            "ts": ts,
            "kind": "swarm",
            "title": f"Tarea completada: {t.get('title', tid)}",
            "body": str(body)[:600],
            "level": "success",
            "source": "swarm",
            "agent": agent_id,
            "persona": persona,
            "area_id": t.get("area_id"),
            "artifact_file": t.get("artifact_file"),
            "generated_by": t.get("generated_by", "template"),
            "read": eid in acked,
            "actions": [
                {"id": "view_swarm", "label": "Ver enjambre", "method": "GET", "endpoint": "/api/swarm/status"},
            ],
        })
    return events


def _learning_events(since: Optional[float], acked: Dict[str, float]) -> List[Dict[str, Any]]:
    from ..memory.background_learner import background_learner
    events: List[Dict[str, Any]] = []
    for ev in background_learner.learned_events_log:
        ts = float(ev.get("timestamp") or 0)
        if since is not None and ts < since:
            continue
        eid = f"learn:{int(ts * 1000)}"
        data = ev.get("data") or {}
        if isinstance(data, dict):
            body = data.get("summary") or data.get("concept") or data.get("message") or json.dumps(data, ensure_ascii=False)[:400]
        else:
            body = str(data)[:400]
        events.append({
            "id": eid,
            "ts": ts,
            "kind": "learning",
            "title": f"Aprendizaje: {ev.get('event_type', 'evento')}",
            "body": str(body)[:600],
            "level": "info",
            "source": "background_learner",
            "read": eid in acked,
            "actions": [
                {"id": "view_events", "label": "Ver eventos", "method": "GET", "endpoint": "/api/memory/events"},
            ],
        })
    return events


@router.get("/events")
async def starseed_events(since: Optional[float] = None, limit: int = 50):
    """
    (OS · Ola 3) Bandeja unificada de eventos de los procesos de fondo con ids
    estables (`notif:<id>`, `imag:<branch_id>`, `swarm:<task_id>`, `learn:<ts_ms>`).
    `since`: unix ts (opcional) → solo eventos posteriores. `limit`: máx. 50 por defecto.
    """
    limit = max(1, min(int(limit or 50), 200))
    acked = _load_acks()
    events: List[Dict[str, Any]] = []
    for producer in (
        lambda: _notification_events(since),
        lambda: _imagination_events(since, acked),
        lambda: _swarm_events(since, acked),
        lambda: _learning_events(since, acked),
        lambda: _director_events(since, acked),
    ):
        try:
            events.extend(producer())
        except Exception as e:
            print(f"⚠️ [StarSeed bridge] productor de eventos falló: {e}")
    events.sort(key=lambda e: float(e.get("ts") or 0), reverse=True)
    unread = sum(1 for e in events if not e.get("read"))

    # (Adenda 155) REPARTO JUSTO por tipo de proceso: el enjambre completa muchas
    # tareas y, con un simple corte por recencia, tapaba a la imaginación, las
    # autorizaciones y el aprendizaje — justo los avisos que el usuario debe ver.
    # Se reserva una cuota mínima por `kind` (round-robin de más recientes) y el
    # resto se rellena por recencia pura.
    def _fair(items: List[Dict[str, Any]], n: int) -> List[Dict[str, Any]]:
        if len(items) <= n:
            return items
        buckets: Dict[str, List[Dict[str, Any]]] = {}
        for e in items:
            buckets.setdefault(str(e.get("kind") or "otro"), []).append(e)
        if len(buckets) <= 1:
            return items[:n]
        picked: List[Dict[str, Any]] = []
        seen: set = set()
        quota = max(3, n // max(1, len(buckets)))
        for i in range(quota):
            for b in buckets.values():
                if i < len(b) and len(picked) < n:
                    picked.append(b[i])
                    seen.add(id(b[i]))
        for e in items:  # relleno por recencia con lo que falte
            if len(picked) >= n:
                break
            if id(e) not in seen:
                picked.append(e)
                seen.add(id(e))
        picked.sort(key=lambda e: float(e.get("ts") or 0), reverse=True)
        return picked

    page = _fair(events, limit)
    by_kind: Dict[str, int] = {}
    for e in events:
        by_kind[str(e.get("kind") or "otro")] = by_kind.get(str(e.get("kind") or "otro"), 0) + 1
    return {
        "events": page,
        "total": len(events),
        "unread": unread,
        # Alias que consume el OS (`astraura-158-client.ts` / feed de notificaciones).
        "unread_count": unread,
        "by_kind": by_kind,
        "server_ts": time.time(),
        "bridge": BRIDGE_VERSION,
    }


class AckEventsRequest(BaseModel):
    ids: List[str]


@router.post("/events/ack")
async def starseed_events_ack(req: AckEventsRequest):
    """
    (OS · Ola 3) Marca leídas las notificaciones (`notif:<id>`) con el motor de
    notificaciones y recuerda los acks de `imag:`/`swarm:`/`learn:` en
    data/starseed_bridge_acks.json para que dejen de aparecer.
    """
    from ..core.system_notifications_engine import system_notifications_engine
    acked = _load_acks()
    now = time.time()
    marked_read = 0
    remembered = 0
    unknown: List[str] = []
    for raw in req.ids or []:
        eid = str(raw).strip()
        if not eid:
            continue
        if eid.startswith("notif:"):
            nid = eid[len("notif:"):]
            if system_notifications_engine.mark_as_read(nid):
                marked_read += 1
            else:
                unknown.append(eid)
            continue
        if eid.startswith("imag:"):
            bid = eid[len("imag:"):]
            # También se da por leída la notificación espejo de la rama (notif_req_<id> o branch_id).
            for n in system_notifications_engine.notifications:
                if n.get("branch_id") == bid or n.get("id") == f"notif_req_{bid}":
                    if not n.get("read"):
                        n["read"] = True
                        marked_read += 1
            system_notifications_engine._save()
            acked[eid] = now
            remembered += 1
            continue
        if eid.startswith("swarm:") or eid.startswith("learn:"):
            acked[eid] = now
            remembered += 1
            continue
        unknown.append(eid)
    _save_acks(acked)
    return {
        "success": True,
        "acked": marked_read + remembered,
        "notifications_marked_read": marked_read,
        "remembered": remembered,
        "unknown": unknown,
        "server_ts": now,
    }


def _slim_imagination_status(status: Dict[str, Any]) -> Dict[str, Any]:
    """Estado de imaginación sin las listas completas (el OS las pide aparte si las necesita)."""
    slim = dict(status)
    for key, keep in (("branches", 10), ("creations", 5), ("insights", 5), ("suggestions", 5), ("recycle_history", 3)):
        items = status.get(key) or []
        slim[key] = items[:keep]
        slim[f"{key}_total"] = len(items)
    slim["trimmed"] = True
    return slim


@router.get("/processes")
async def starseed_processes():
    """(OS · Ola 3) Estado de TODOS los procesos de fondo en una llamada."""
    from ..core.intuitive_imagination_engine import intuitive_imagination_engine
    from ..agents.swarm_manager import swarm_manager
    from ..agents.director_orchestrator import director_orchestrator
    from ..core.dream_engine import dream_engine
    from ..agents.intelligent_authorization_orchestrator import intelligent_authorization_orchestrator
    from ..engine.bitnet_engine import bitnet_engine
    from ..core.privacy_manager import is_air_gapped
    from ..core import sync_engine
    from ..core import cognition

    def auth_status() -> Dict[str, Any]:
        s = intelligent_authorization_orchestrator.get_status()
        s["auto_mode"] = intelligent_authorization_orchestrator.auto_mode
        return s

    raw = {
        "imagination": _slim_imagination_status(_safe(intuitive_imagination_engine.get_status, {}) or {}),
        "swarm": _safe(swarm_manager.get_status, {}),
        "director": _safe(director_orchestrator.get_status, {}),
        "dream": _safe(dream_engine.get_status, {}),
        "auth_orchestrator": _safe(auth_status, {}),
        "engine": _safe(bitnet_engine.get_engine_status, {}),
        "privacy": {"air_gap": _safe(is_air_gapped, False)},
        "sync": _safe(sync_engine.get_sync_status, {"last_push_sections": [], "supabase_available": False, "r2_available": False}),
        "cognition": _safe(cognition.stats, {}),
    }

    # Lista NORMALIZADA para el OS ({id, name, status, running, detail, counters});
    # las secciones crudas siguen presentes para clientes que quieran el detalle.
    def _proc(pid: str, name: str, status: str, running: bool, detail: str = "", counters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return {"id": pid, "name": name, "status": status, "running": bool(running), "detail": detail,
                "counters": {k: v for k, v in (counters or {}).items() if isinstance(v, (int, float))}}

    imag = raw["imagination"] or {}
    sw = raw["swarm"] or {}
    di = (raw["director"] or {}).get("director") or raw["director"] or {}
    dr = raw["dream"] or {}
    au = raw["auth_orchestrator"] or {}
    en = raw["engine"] or {}
    sy = raw["sync"] or {}
    cg = raw["cognition"] or {}
    running_tasks = [t for t in (sw.get("active_tasks") or []) if (t or {}).get("status") == "running"]
    processes = [
        _proc("engine", "Motor 1.58-bit", str(en.get("real_mode") or "desconocido"), en.get("real_mode") in ("bitnet-native", "ollama"),
              str(en.get("active_model") or ""), {"tokens": en.get("tokens_generated"), "reales": cg.get("real_calls"), "plantilla": cg.get("template_calls")}),
        _proc("imagination", "Imaginación intuitiva",
              "paused" if imag.get("is_paused_due_to_threshold") else ("dreaming" if imag.get("is_dreaming_now") else ("active" if imag.get("is_always_on") else "idle")),
              bool(imag.get("is_always_on")) and not imag.get("is_paused_due_to_threshold"),
              f"próximo ciclo: {imag.get('next_cycle_formatted') or imag.get('next_cycle_seconds_left') or '—'}",
              {"pendientes": imag.get("pending_approval_count"), "ciclos": imag.get("cycles_completed"), "procesos": imag.get("active_processes_count")}),
        _proc("swarm", "Enjambre multi-área", "active" if running_tasks else "idle", bool(running_tasks),
              f"capacidad {((sw.get('capacity_governor') or {}).get('capacity_mode') or '—')}",
              {"tareas": len(running_tasks), "agentes": sw.get("total_active_agents"), "hechas": sw.get("total_completed_tasks")}),
        _proc("director", "Director (Metis Prime)", str(di.get("status") or "idle"), str(di.get("status") or "").lower() in ("active", "supervising", "running"),
              str(di.get("active_directive") or ""), {"supervisadas": di.get("tasks_supervised_count"), "verificaciones": di.get("verifications_completed_count")}),
        _proc("dream", "Sueños (Oneiros)", "dreaming" if dr.get("is_dreaming") else ("active" if dr.get("is_always_on") else "idle"),
              bool(dr.get("is_always_on")), "", {"ciclos": dr.get("cycles_completed")}),
        _proc("auth_orchestrator", "Orquestador de autorizaciones", "busy" if au.get("is_busy") else ("auto" if au.get("auto_mode") else "manual"),
              bool(au.get("auto_mode")), "", {"ejecuciones": au.get("orchestrations_run")}),
        _proc("privacy", "Privacidad y air-gap", "air-gap" if (raw["privacy"] or {}).get("air_gap") else "abierto", True, "", {}),
        _proc("sync", "Malla de sincronización", "online" if sy.get("supabase_available") else "offline", bool(sy.get("supabase_available")),
              "", {"secciones": len(sy.get("last_push_sections") or [])}),
    ]

    return {
        "bridge": BRIDGE_VERSION,
        "server_ts": time.time(),
        "processes": processes,
        **raw,
    }


class ImaginationTriggerRequest(BaseModel):
    theme: Optional[str] = None
    process_type: Optional[str] = None


@router.post("/processes/imagination/trigger")
async def starseed_trigger_imagination(req: Optional[ImaginationTriggerRequest] = None, wait: bool = False):
    """(OS · Ola 3/155) Dispara un ciclo de imaginación.

    Por defecto NO bloquea: el ciclo hace inferencia REAL con el modelo 1.58 (dos
    generaciones encoladas tras los procesos de fondo), lo que en CPU puede tardar
    minutos. La UI del OS no debe quedarse colgada: se programa en segundo plano y
    la rama resultante llega por `/api/starseed/events` (y por la notificación).
    Con `?wait=1` se conserva el comportamiento bloqueante (scripts y verificación).
    """
    import asyncio as _asyncio
    from ..core.intuitive_imagination_engine import intuitive_imagination_engine
    from ..core.system_notifications_engine import system_notifications_engine

    theme = req.theme if req else None
    process_type = req.process_type if req else None

    def _notify(res: Dict[str, Any]) -> None:
        try:
            if res.get("success") and res.get("branch"):
                system_notifications_engine.add_notification({
                    "title": "✨ Nueva Imaginación Intuitiva",
                    "message": (res.get("branch") or {}).get("theme", "")[:100],
                    "category": "Imaginación Intuitiva",
                    "severity": "suggestion"
                })
        except Exception:
            pass

    if wait:
        res = await intuitive_imagination_engine.trigger_cycle(theme, process_type)
        _notify(res)
        return {**res, "bridge": BRIDGE_VERSION, "server_ts": time.time()}

    async def _run() -> None:
        try:
            res = await intuitive_imagination_engine.trigger_cycle(theme, process_type)
            _notify(res)
        except Exception as e:  # pragma: no cover - defensivo
            print(f"⚠️ [bridge] ciclo de imaginación en segundo plano falló: {e}")

    _asyncio.create_task(_run())
    return {
        "success": True,
        "scheduled": True,
        "message": "Ciclo de imaginación lanzado en segundo plano: la rama llegará por eventos cuando el modelo termine.",
        "bridge": BRIDGE_VERSION,
        "server_ts": time.time(),
    }


# ─── (Adenda 175) Preferencia de motor de cognición (auto · bitnet-158 · multimodel) ───
class CognitionPreferenceRequest(BaseModel):
    preference: str


@router.get("/cognition/preference")
async def get_cognition_preference_endpoint():
    """Preferencia efectiva del motor + procedencia (env | stored | default)."""
    from ..core.cognition import cognition_preference_detail
    return {"success": True, "bridge": BRIDGE_VERSION, **cognition_preference_detail()}


@router.post("/cognition/preference")
async def set_cognition_preference_endpoint(req: CognitionPreferenceRequest):
    """Cambia la preferencia en caliente (persistida). Honesto con el override por entorno."""
    from ..core.cognition import set_cognition_preference
    try:
        detail = set_cognition_preference(req.preference)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return {"success": True, "bridge": BRIDGE_VERSION, **detail}
