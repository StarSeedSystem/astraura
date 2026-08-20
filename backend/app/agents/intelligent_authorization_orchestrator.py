"""
Astraura Intelligent Authorization Orchestration Agent (1.58-bit StarSeed OS)

Capa de orquestación inteligente que coordina el procesamiento en lote de
notificaciones/solicitudes de autorización acumuladas. A diferencia de un
bucle naive, este agente:

  1. RELACIONA las tareas entre sí (grafo de dependencias semánticas).
  2. DETERMINA el orden de ejecución por prioridad + dependencias.
  3. REFINA cada propuesta según el contexto 1.58-bit actualizado
     (personalidad activa, cerebro vinculado, memoria reciente).
  4. ENRUTA cada tarea al agente dedicado real del enjambre
     (hephaestus, oneiros, mnemosyne, hermes, athena, architectus/daedalus)
     según el tipo de proceso.
  5. Registra en el exocórtex StarSeed con cerebros + personalidades vinculados.
  6. Al final, dispara el re-escaneo de TODOS los medios (storage routing).

Se integra con: IntuitiveImaginationEngine, SystemNotificationsEngine,
AdaptiveMultiAreaSwarmEngine, PersonalityEngine, StarSeedMemoryEngine,
CerebrosManager y StorageRoutingEngine.
"""

import asyncio
import json
import time
import re
from datetime import datetime
from typing import Dict, List, Any, Optional

# Importación perezosa para evitar ciclos en el arranque de FastAPI
_intuitive = None
_notifications = None
_swarm = None
_personality = None
_memory = None
_cerebros = None
_storage = None


def _resolve():
    """Resuelve las instancias globales ya inicializadas en main.py."""
    global _intuitive, _notifications, _swarm, _personality, _memory, _cerebros, _storage
    if _intuitive is None:
        from ..core.intuitive_imagination_engine import intuitive_imagination_engine
        _intuitive = intuitive_imagination_engine
    if _notifications is None:
        from ..core.system_notifications_engine import system_notifications_engine
        _notifications = system_notifications_engine
    if _swarm is None:
        from ..agents.swarm_manager import swarm_manager
        _swarm = swarm_manager
    if _personality is None:
        from ..personalities.personality_engine import personality_engine
        _personality = personality_engine
    if _memory is None:
        from ..memory.starseed_memory_engine import starseed_memory_engine
        _memory = starseed_memory_engine
    if _cerebros is None:
        from ..cerebros.cerebros_manager import cerebros_manager
        _cerebros = cerebros_manager
    if _storage is None:
        from ..core.storage_routing_engine import storage_routing_engine
        _storage = storage_routing_engine


# ─────────────────────────────────────────────────────────────────────────
# Mapa de enrutamiento de procesos → agente dedicado del enjambre
# ─────────────────────────────────────────────────────────────────────────
PROCESS_TO_AGENT = {
    "code_self_reflection_opt":        "hephaestus",  # Ingeniería / forja
    "lucid_cyberdelic_creativity":     "oneiros",      # Síntesis creativa
    "rem_synaptic_consolidation":      "mnemosyne",    # Memoria sináptica
    "autonomous_agent_evolution":      "athena",       # Centinela / evolución
    "autonomous_sovereign_self_growth":"athena",       # Privacidad / soberanía
    "predictive_future_simulation":    "hermes",       # Inteligencia web / futuro
    "counterfactual_quantum_imagination": "hermes",    # Simulación contrafáctica
    "cross_modal_reasoning":           "daedalus",     # Gestión de proyectos
    "project_architectural_synthesis": "architectus",  # Arquitectura
}

AGENT_AREA = {
    "hephaestus":  "area_engineering",
    "oneiros":     "area_creative_synthesis",
    "mnemosyne":   "area_synaptic_memory",
    "hermes":      "area_web_intel",
    "athena":      "area_sentinel_privacy",
    "daedalus":    "area_project_management",
    "architectus": "area_project_management",
}

# Palabras clave para inferir prioridad
_HIGH_PRIORITY_KW = ["seguridad", "security", "urgente", "critical", "privacidad",
                     "soberan", "brecha", "vulnerab", "auth", "autoriz"]
_LOW_PRIORITY_KW = ["cosmetic", "estetica", "decor", "minor", "menor", "opcional"]


class IntelligentAuthorizationOrchestrator:
    """Orquestador inteligente de autorizaciones en 2do plano (1.58-bit)."""

    def __init__(self):
        self.orchestrations_run = 0
        self.last_orchestration = None
        self.is_busy = False
        print("✨ [AuthOrchestrator] Agente de Orquestación Inteligente de Autorizaciones inicializado.")

    # ─────────────────────────────────────────────────────────────────────
    # Utilidades de contexto 1.58-bit
    # ─────────────────────────────────────────────────────────────────────
    def _find_profile(self, pid: Optional[str]) -> Dict[str, Any]:
        """Busca un perfil por id dentro de get_all_profiles()."""
        try:
            profiles = _personality.get_all_profiles() or []
            for p in profiles:
                if p.get("id") == pid:
                    return p
        except Exception:
            pass
        return {}

    def _active_personality(self) -> Dict[str, Any]:
        _resolve()
        try:
            pid = None
            try:
                pid = _personality.active_personality_id
            except Exception:
                pid = None
            if pid:
                prof = self._find_profile(pid)
                if prof:
                    return prof
            profiles = _personality.get_all_profiles() or []
            return profiles[0] if profiles else {}
        except Exception:
            return {}

    def _active_brain(self) -> Dict[str, Any]:
        _resolve()
        try:
            bid = getattr(_cerebros, "active_brain_id", None)
            brains = _cerebros.get_cerebros() or []
            if bid:
                for b in brains:
                    if b.get("id") == bid:
                        return b
            return brains[0] if brains else {}
        except Exception:
            return {}

    def _personality_for_brain(self, brain_id: str) -> Dict[str, Any]:
        """Devuelve la personalidad vinculada a un cerebro específico."""
        _resolve()
        try:
            brains = _cerebros.get_cerebros() or []
            for b in brains:
                if b.get("id") == brain_id:
                    pid = b.get("personality_id")
                    if pid:
                        return self._find_profile(pid) or {}
            return self._active_personality()
        except Exception:
            return {}

    # ─────────────────────────────────────────────────────────────────────
    # Relación de tareas (grafo de dependencias semánticas)
    # ─────────────────────────────────────────────────────────────────────
    def _infer_process_type(self, branch: Dict[str, Any]) -> str:
        return branch.get("process_type") or branch.get("type") or "project_architectural_synthesis"

    def _infer_priority(self, branch: Dict[str, Any], notif: Optional[Dict[str, Any]]) -> int:
        text = " ".join([
            branch.get("theme", "") or "",
            branch.get("hypothesis", "") or "",
            branch.get("title", "") or "",
            (notif or {}).get("message", "") or "",
            (notif or {}).get("title", "") or "",
        ]).lower()
        score = 5  # prioridad media por defecto
        for kw in _HIGH_PRIORITY_KW:
            if kw in text:
                score = min(10, score + 2)
        for kw in _LOW_PRIORITY_KW:
            if kw in text:
                score = max(1, score - 2)
        # Si ya tiene prioridad en la rama, respétala
        if isinstance(branch.get("priority"), (int, float)):
            score = int(branch["priority"])
        return score

    def _relate_tasks(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Construye relaciones semánticas entre las tareas y determina el orden.
        items: lista de {branch, notif, agent, area, priority}
        Devuelve la lista ordenada por (prioridad desc, dependencias).
        """
        # Índice por tipo de proceso y por agente para detectar colisiones / sinergias
        by_agent = {}
        by_type = {}
        for it in items:
            a = it["agent"]
            t = it["process_type"]
            by_agent.setdefault(a, []).append(it)
            by_type.setdefault(t, []).append(it)

        # Detectar dependencias: una tarea de arquitectura (architectus/daedalus)
        # suele preceder a tareas de ingeniería (hephaestus) sobre el mismo tema.
        theme_re = re.compile(r"([a-z0-9_]{4,})", re.I)
        def themes_of(it):
            txt = (it["branch"].get("theme", "") or it["branch"].get("title", "") or "")
            return set(w.lower() for w in theme_re.findall(txt))

        related_edges = []
        for a_it in items:
            a_themes = themes_of(a_it)
            if not a_themes:
                continue
            for b_it in items:
                if a_it is b_it:
                    continue
                if a_it["agent"] in ("architectus", "daedalus") and b_it["agent"] == "hephaestus":
                    if a_themes & themes_of(b_it):
                        related_edges.append((a_it["id"], b_it["id"], "precedes_implementation"))
                # Tareas del mismo agente y tema → se agrupan (paralelo)
                if a_it["agent"] == b_it["agent"] and (a_themes & themes_of(b_it)):
                    related_edges.append((a_it["id"], b_it["id"], "parallel_group"))

        # Topológico simple: las que son 'precedes' van primero.
        precedence = {dst: src for src, dst, kind in related_edges if kind == "precedes_implementation"}

        def sort_key(it):
            prec = 0 if it["id"] in precedence else 1
            return (-it["priority"], prec, it["agent"])

        ordered = sorted(items, key=sort_key)

        # Adjunta relaciones a cada item para trazabilidad en el exocórtex
        rel_map = {}
        for src, dst, kind in related_edges:
            rel_map.setdefault(src, []).append({"to": dst, "kind": kind})
            rel_map.setdefault(dst, []).append({"to": src, "kind": "depends_on" if kind.startswith("precedes") else "grouped_with"})
        for it in ordered:
            it["relations"] = rel_map.get(it["id"], [])
        return ordered

    # ─────────────────────────────────────────────────────────────────────
    # Refinamiento de propuesta según contexto 1.58-bit actualizado
    # ─────────────────────────────────────────────────────────────────────
    def _refine_proposal(self, branch: Dict[str, Any], personality: Dict[str, Any],
                         brain: Dict[str, Any]) -> Dict[str, Any]:
        """
        Añade contexto 1.58-bit a la propuesta: personalidad activa, cerebro
        vinculado, timestamp, y un 'refined_directive' que guía al agente.
        """
        now = time.time()
        ts = datetime.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S")
        persona_name = personality.get("name", "Aurora")
        brain_name = brain.get("name", "Cerebro Génesis")
        brain_color = brain.get("color", "#00f0ff")

        proc = self._infer_process_type(branch)
        agent = PROCESS_TO_AGENT.get(proc, "athena")
        area = AGENT_AREA.get(agent, "area_project_management")

        theme = branch.get("theme") or branch.get("title") or "Proceso Autónomo 1.58-bit"
        hypothesis = branch.get("hypothesis") or branch.get("description") or ""

        refined = dict(branch)
        refined["refined_directive"] = (
            f"[{ts}] Ejecutar bajo personalidad '{persona_name}' en cerebro "
            f"'{brain_name}' ({brain_color}). Proceso '{proc}' → agente '{agent}' "
            f"({area}). Hipótesis base: {hypothesis[:160]}"
        )
        refined["orchestrated_at"] = ts
        refined["orchestrated_by"] = "IntelligentAuthorizationOrchestrator"
        refined["assigned_agent"] = agent
        refined["assigned_area"] = area
        refined["personality_id"] = personality.get("id")
        refined["brain_id"] = brain.get("id")
        refined["brain_color"] = brain_color
        return refined

    # ─────────────────────────────────────────────────────────────────────
    # Registro en exocórtex con cerebros + personalidades
    # ─────────────────────────────────────────────────────────────────────
    def _record_in_exocortex(self, branch: Dict[str, Any], notif: Optional[Dict[str, Any]],
                             personality: Dict[str, Any], brain: Dict[str, Any],
                             agent: str, result: Dict[str, Any]) -> bool:
        _resolve()
        try:
            concept = f"Autorización Orquestada: {branch.get('theme', branch.get('title', 'Proceso'))[:80]}"
            definition = (
                f"Procesada por Agente de Orquestación Inteligente 1.58-bit. "
                f"Agente ejecutor: {agent}. Personalidad: {personality.get('name','Aurora')}. "
                f"Cerebro: {brain.get('name','Génesis')}. "
                f"Resultado: {result.get('message', result.get('status', 'ejecutada'))[:180]}"
            )
            node_data = {
                "concept": concept,
                "definition": definition,
                "category": "authorization",
                "resonance": 0.98,
                "brain_id": brain.get("id"),
                "personality_id": personality.get("id"),
                "agent_id": agent,
                "metadata": {
                    "branch_id": branch.get("id"),
                    "notif_id": (notif or {}).get("id"),
                    "process_type": self._infer_process_type(branch),
                    "relations": branch.get("relations", []),
                },
            }
            node = _memory.add_memory_node(node_data)
            return bool(node)
        except Exception as e:
            print(f"⚠️ [AuthOrchestrator] Error registrando en exocórtex: {e}")
            return False

    # ─────────────────────────────────────────────────────────────────────
    # Bucle principal: orquesta una lista de notificaciones
    # ─────────────────────────────────────────────────────────────────────
    async def orchestrate_list(self, notif_ids: List[str]) -> Dict[str, Any]:
        """
        Procesa en lote las notificaciones de autorización con agentes reales
        del enjambre, relación inteligente y re-escaneo de medios.
        """
        _resolve()
        if self.is_busy:
            return {"success": False, "error": "Orquestador ocupado en otra ejecución."}
        self.is_busy = True
        self.orchestrations_run += 1
        started = time.time()
        try:
            # 1. Recolectar items válidos (notificación + rama)
            items = []
            failed = []
            for nid in notif_ids:
                notif = next((n for n in _notifications.notifications if n["id"] == nid), None)
                if not notif:
                    failed.append({"notif_id": nid, "error": "No encontrada"})
                    continue
                b_id = notif.get("branch_id")
                if not b_id and isinstance(nid, str) and nid.startswith("notif_req_"):
                    b_id = nid.replace("notif_req_", "")
                branch = next((b for b in _intuitive.branches if b.get("id") == b_id), None)
                if not branch:
                    # Notificación de sistema → marcar directo
                    failed.append({"notif_id": nid, "error": "Sin rama asociada (sistema)"})
                    continue
                proc = self._infer_process_type(branch)
                agent = PROCESS_TO_AGENT.get(proc, "athena")
                # Personalidad vinculada al cerebro de la rama (o activa)
                brain = self._active_brain()
                personality = self._personality_for_brain(brain.get("id")) or self._active_personality()
                priority = self._infer_priority(branch, notif)
                items.append({
                    "id": nid,
                    "branch": branch,
                    "notif": notif,
                    "process_type": proc,
                    "agent": agent,
                    "priority": priority,
                    "brain": brain,
                    "personality": personality,
                })

            # 2. Relacionar y ordenar
            ordered = self._relate_tasks(items)

            # 3. Procesar secuencialmente (respetando orden y relaciones)
            processed = []
            agent_executions = {a: 0 for a in set(PROCESS_TO_AGENT.values())}
            for it in ordered:
                try:
                    branch = it["branch"]
                    # Refinar propuesta con contexto 1.58-bit
                    refined = self._refine_proposal(branch, it["personality"], it["brain"])
                    # Fusionar campos refinados en la rama original en memoria
                    branch.update(refined)

                    # Conceder autorización (registra en exocórtex)
                    grant = _intuitive.grant_and_apply_request(branch.get("id"))
                    if not grant.get("success"):
                        failed.append({"notif_id": it["id"], "error": grant.get("error", "grant falló")})
                        continue

                    # Despachar tarea real al agente del enjambre (telemetría física)
                    try:
                        _swarm.dispatch_task(
                            area_id=it["agent"] and AGENT_AREA.get(it["agent"], "area_project_management"),
                            title=f"Autorización: {branch.get('theme', branch.get('title',''))[:60]}",
                            prompt=refined.get("refined_directive", ""),
                            agent_id=it["agent"],
                        )
                        agent_executions[it["agent"]] = agent_executions.get(it["agent"], 0) + 1
                    except Exception as e:
                        print(f"⚠️ [AuthOrchestrator] dispatch_task falló para {it['agent']}: {e}")

                    # Ejecutar flujo completo de agentes (8 fases)
                    workflow = _intuitive.run_automated_execution_workflow([branch])
                    result = workflow if isinstance(workflow, dict) else {"status": "ok"}

                    # Registrar en exocórtex con cerebro + personalidad
                    self._record_in_exocortex(branch, it["notif"], it["personality"],
                                             it["brain"], it["agent"], result)

                    # Marcar notificación aplicada
                    _notifications.apply_notification(it["id"])
                    processed.append({
                        "notif_id": it["id"],
                        "branch_id": branch.get("id"),
                        "agent": it["agent"],
                        "process_type": it["process_type"],
                        "priority": it["priority"],
                        "relations": it.get("relations", []),
                    })
                except Exception as exc:
                    failed.append({"notif_id": it["id"], "error": str(exc)})

            # 4. Re-escaneo de TODOS los medios
            scan_events = []
            try:
                scan_events = await _storage.scan_and_execute_rules(force_all=True)
            except Exception as e:
                print(f"⚠️ [AuthOrchestrator] Error re-escaneando medios: {e}")

            elapsed = round(time.time() - started, 2)
            summary = {
                "success": True,
                "orchestrated_by": "IntelligentAuthorizationOrchestrator",
                "processed_count": len(processed),
                "failed_count": len(failed),
                "agent_executions": agent_executions,
                "storage_events": len(scan_events),
                "elapsed_seconds": elapsed,
                "processed": processed,
                "failed": failed,
                "message": (
                    f"🧠 Orquestación inteligente completa: {len(processed)} tareas procesadas "
                    f"por agentes reales (hephaestus/oneiros/mnemosyne/hermes/athena/architectus/daedalus) "
                    f"con personalidades y cerebros 1.58-bit. {len(scan_events)} medios actualizados. "
                    f"({elapsed}s)"
                ),
            }
            self.last_orchestration = summary
            return summary
        finally:
            self.is_busy = False


# Instancia global singleton
intelligent_authorization_orchestrator = IntelligentAuthorizationOrchestrator()
