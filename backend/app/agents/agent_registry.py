"""
Astraura Agent Registry (1.58-bit StarSeed OS)

Registro CENTRAL de TODOS los agentes del ecosistema, con estado en vivo y
configuración editable. Cada sección del frontend (Tareas en Progreso en 2do
Plano, Imaginación Intuitiva, Enjambre Multiagéntico, Enrutamiento &
Almacenamiento) consume este registro para mostrar cada agente con su switch
de activación y sus ajustes configurables.

Agentes registrados:
  - auth_orchestrator      → Agente de Orquestación Inteligente de Autorizaciones
  - director_orchestrator  → Director Orquestrador General (Metis)
  - architectus_projectmaster → Agente de Proyectos (Architectus / ProjectMaster)
  - routing_storage_agent  → Enrutamiento, Almacenamiento & Sincronización Universal
  - hephaestus/oneiros/mnemosyne/hermes/athena/daedalus → agentes del enjambre
"""

from typing import Dict, Any, List, Optional

# Lazy resolution
_auth_orch = None
_director = None
_architectus = None
_routing = None
_swarm = None


def _resolve():
    global _auth_orch, _director, _architectus, _routing, _swarm
    if _auth_orch is None:
        from app.agents.intelligent_authorization_orchestrator import intelligent_authorization_orchestrator as _auth_orch
    if _director is None:
        from app.agents.director_orchestrator import director_orchestrator as _director
    if _architectus is None:
        try:
            from app.projects.project_master_agent import project_master_agent as _architectus
        except Exception:
            _architectus = None
    if _routing is None:
        from app.agents.routing_storage_agent import routing_storage_agent as _routing
    if _swarm is None:
        from app.agents.swarm_manager import swarm_manager as _swarm


# Metadatos base de cada agente (edición de config va al agente real)
AGENT_META = {
    "auth_orchestrator": {
        "name": "Agente de Orquestación Inteligente de Autorizaciones",
        "emoji": "🛡️",
        "role": "Procesa automáticamente las solicitudes de autorización acumuladas, las traslada a la cola de su agente con prioridad crítica y sincroniza todo el ecosistema 1.58-bit.",
        "area": "Autorizaciones",
        "section": "notifications",
    },
    "director_orchestrator": {
        "name": "Director Orquestrador General (Metis)",
        "emoji": "👑",
        "role": "Supervisa, audita y reorienta todo el enjambre multi-agente respetando prioridades y gobernanza del ecosistema.",
        "area": "Dirección",
        "section": "imagination",
    },
    "architectus_projectmaster": {
        "name": "Architectus · ProjectMaster",
        "emoji": "🏛️",
        "role": "Arquitectura de proyectos, síntesis jerárquica y gestión de la topología de la Bóveda de Proyectos.",
        "area": "Proyectos",
        "section": "imagination",
    },
    "routing_storage_agent": {
        "name": "Enrutamiento, Almacenamiento & Sincronización Universal",
        "emoji": "🌐",
        "role": "Malla multi-dispositivo sincronizada en tiempo real: detección de memorias 1.58b, fusión multi-OS, enrutamiento automático y organización de cerebros/personalidades/medios.",
        "area": "Enrutamiento & Storage",
        "section": "routing",
    },
    "hephaestus": {
        "name": "Hephaestus · Ingeniería",
        "emoji": "🔧",
        "role": "Ingeniería de sistemas, kernels vectoriales y optimización de código en Apple Silicon.",
        "area": "Engineering",
        "section": "swarm",
    },
    "oneiros": {
        "name": "Oneiros · Síntesis Creativa",
        "emoji": "🎨",
        "role": "Síntesis onírica, shaders procedurales y creatividad ciberdélica.",
        "area": "Creative",
        "section": "swarm",
    },
    "mnemosyne": {
        "name": "Mnemosyne · Memoria Sináptica",
        "emoji": "🧠",
        "role": "Consolidación del grafo de memoria StarSeed y memorias a largo plazo.",
        "area": "Memory",
        "section": "swarm",
    },
    "hermes": {
        "name": "Hermes · Inteligencia Web",
        "emoji": "🌐",
        "role": "Rastreo de conocimiento, simulación predictiva y contrainteligencia cuántica.",
        "area": "Web Intel",
        "section": "swarm",
    },
    "athena": {
        "name": "Atenea · Centinela & Privacidad",
        "emoji": "🛡️",
        "role": "Auditoría de sensores físicos, privacidad 360° y evolución soberana.",
        "area": "Sentinel",
        "section": "swarm",
    },
    "daedalus": {
        "name": "Daedalus · Gestión de Proyectos",
        "emoji": "📋",
        "role": "Sincronización de topología y versiones de proyecto.",
        "area": "Project Mgmt",
        "section": "swarm",
    },
}


class AgentRegistry:
    """Registro unificado de agentes con estado en vivo y config editable."""

    def get_all_agents(self) -> List[Dict[str, Any]]:
        _resolve()
        agents = []
        for aid, meta in AGENT_META.items():
            entry = {
                "id": aid,
                "name": meta["name"],
                "emoji": meta["emoji"],
                "role": meta["role"],
                "area": meta["area"],
                "section": meta["section"],
                "enabled": True,
                "is_busy": False,
                "status_detail": {},
                "configurable": True,
                "config": {},
            }
            try:
                if aid == "auth_orchestrator" and _auth_orch:
                    entry["enabled"] = _auth_orch.auto_mode
                    entry["is_busy"] = _auth_orch.is_busy
                    entry["status_detail"] = {
                        "orchestrations_run": _auth_orch.orchestrations_run,
                        "last_processed": _auth_orch.last_orchestration.get("processed_count") if _auth_orch.last_orchestration else 0,
                    }
                    entry["config"] = {"auto_mode": _auth_orch.auto_mode}
                elif aid == "director_orchestrator" and _director:
                    st = _director.get_status()
                    entry["enabled"] = True
                    entry["is_busy"] = False
                    entry["status_detail"] = {
                        "tasks_supervised": st.get("tasks_supervised_count", 0),
                        "active_agents": st.get("active_agents_count", 0),
                    }
                    entry["config"] = st.get("config", {}) if isinstance(st.get("config"), dict) else {}
                elif aid == "architectus_projectmaster" and _architectus:
                    st = _architectus.get_status()
                    entry["enabled"] = True
                    entry["status_detail"] = {"projects": st.get("projects_count", 0)}
                    entry["config"] = st.get("config", {}) if isinstance(st.get("config"), dict) else {}
                elif aid == "routing_storage_agent" and _routing:
                    st = _routing.get_status()
                    entry["enabled"] = st.get("enabled", True)
                    entry["is_busy"] = st.get("is_busy", False)
                    entry["status_detail"] = {
                        "devices": st.get("detected_devices", []),
                        "brains": st.get("brains_count", 0),
                        "sync_runs": st.get("sync_runs", 0),
                    }
                    entry["config"] = st.get("config", {})
                elif _swarm and aid in _swarm.agents:
                    ag = _swarm.agents.get(aid, {})
                    entry["enabled"] = ag.get("status") == "active"
                    entry["is_busy"] = len([t for t in _swarm.active_tasks if t.get("agent_id") == aid and t.get("status") == "running"]) > 0
                    entry["status_detail"] = {"completed_tasks": ag.get("completed_tasks", 0)}
                    entry["config"] = {"concurrency": ag.get("concurrency", 1), "status": ag.get("status", "active")}
            except Exception as e:
                entry["status_detail"] = {"error": str(e)}
            agents.append(entry)
        return agents

    def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        all_agents = self.get_all_agents()
        return next((a for a in all_agents if a["id"] == agent_id), None)

    def update_config(self, agent_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        _resolve()
        if agent_id == "auth_orchestrator" and _auth_orch:
            if "auto_mode" in config:
                _auth_orch.set_auto_mode(config["auto_mode"])
            return {"success": True, "config": {"auto_mode": _auth_orch.auto_mode}}
        if agent_id == "routing_storage_agent" and _routing:
            return _routing.update_config(config)
        if agent_id == "director_orchestrator" and _director:
            if hasattr(_director, "update_config"):
                return _director.update_config(config)
        if agent_id == "architectus_projectmaster" and _architectus:
            if hasattr(_architectus, "update_config"):
                return _architectus.update_config(config)
        if _swarm and agent_id in _swarm.agents:
            # Toggle de activación del agente del swarm
            if "status" in config:
                _swarm.toggle_agent(agent_id) if hasattr(_swarm, "toggle_agent") else None
            return {"success": True, "config": config}
        return {"success": False, "error": f"Agente {agent_id} no configurable aquí"}

    def set_enabled(self, agent_id: str, enabled: bool) -> Dict[str, Any]:
        _resolve()
        if agent_id == "auth_orchestrator" and _auth_orch:
            return _auth_orch.set_auto_mode(enabled)
        if agent_id == "routing_storage_agent" and _routing:
            return _routing.set_enabled(enabled)
        if _swarm and agent_id in _swarm.agents:
            if hasattr(_swarm, "set_agent_enabled"):
                return _swarm.set_agent_enabled(agent_id, enabled)
            # Fallback: toggle
            ag = _swarm.agents.get(agent_id, {})
            ag["status"] = "active" if enabled else "paused"
            return {"success": True, "enabled": enabled}
        return {"success": False, "error": f"No se puede activar {agent_id}"}


agent_registry = AgentRegistry()
