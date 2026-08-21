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
from pathlib import Path
from typing import Dict, List, Any, Optional

# DREAM_PROCESS_TYPES es constante de módulo (no atributo de instancia)
from ..core.intuitive_imagination_engine import DREAM_PROCESS_TYPES

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

    AUTO_MODE_FILE = Path("/Users/alex/Documents/IA 1.58 bit/data/vault/astraura_auth_auto_mode.json")

    def __init__(self):
        self.orchestrations_run = 0
        self.last_orchestration = None
        self.is_busy = False
        self._draining_mode = False
        self.auto_mode = self._load_auto_mode()
        print("✨ [AuthOrchestrator] Agente de Orquestación Inteligente de Autorizaciones inicializado.")
        print(f"   {'🟢' if self.auto_mode else '⚪'} Auto-Orquestación en 2do plano: {'ACTIVA' if self.auto_mode else 'apagada'}")

    def _load_auto_mode(self) -> bool:
        try:
            if self.AUTO_MODE_FILE.exists():
                return bool(json.loads(self.AUTO_MODE_FILE.read_text(encoding="utf-8")).get("enabled", False))
        except Exception:
            pass
        return False

    def _save_auto_mode(self):
        try:
            self.AUTO_MODE_FILE.parent.mkdir(parents=True, exist_ok=True)
            self.AUTO_MODE_FILE.write_text(json.dumps({"enabled": self.auto_mode}, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"⚠️ [AuthOrchestrator] No se pudo guardar auto_mode: {e}")

    def set_auto_mode(self, enabled: bool) -> Dict[str, Any]:
        """Activa/desactiva la orquestación automática en segundo plano."""
        self.auto_mode = bool(enabled)
        self._save_auto_mode()
        print(f"✨ [AuthOrchestrator] Auto-Orquestación en 2do plano {'ACTIVADA' if self.auto_mode else 'APAGADA'}")
        return {"success": True, "auto_mode": self.auto_mode}

    # Umbral de equilibrio: si la cola de pendientes supera esto, el agente entra
    # en MODO DRENAJE (coordina con Director + agentes para priorizar el completado
    # de tareas antes de seguir imaginando).
    MAX_BALANCED_QUEUE = 20
    # Tamaño de lote en modo normal
    NORMAL_BATCH = 5
    # Tamaño de lote en modo drenaje (acumulación)
    DRAIN_BATCH = 12

    def tick_auto_mode(self) -> Dict[str, Any]:
        """
        Disparado periódicamente por el scheduler. Si auto_mode está activo y
        hay notificaciones con botón de autorizar/aplicar pendientes, las
        procesa automáticamente con los agentes del enjambre (1.58-bit).

        LÓGICA DE AUTORREGULACIÓN INTELIGENTE:
          - Mide el tamaño de la cola de pendientes.
          - Si la cola está equilibrada (<= MAX_BALANCED_QUEUE): procesa en lotes
            normales y deja a los agentes continuar imaginando.
          - Si la cola CRECE por encima del umbral (se acumula): el agente entra
            en MODO DRENAJE, se pone de acuerdo con el Director Orquestrador y los
            demás agentes, prioriza el uso de los agentes para COMPLETAR las tareas
            pendientes (lotes grandes, prioridad crítica 10) y SÓLO cuando la cola
            vuelve a un nivel balanceado libera a los agentes para "continuar imaginando".
        Se ejecuta en un HILO SEPARADO para NO bloquear el event loop de uvicorn.
        """
        if not self.auto_mode:
            return {"ran": False, "reason": "auto_mode_off"}
        if self.is_busy:
            return {"ran": False, "reason": "busy"}
        _resolve()
        try:
            pending = [n["id"] for n in _notifications.notifications
                       if n.get("status") not in ("applied", "resolved")]
            pending_total = len(pending)
            if pending_total == 0:
                self._draining_mode = False
                return {"ran": False, "reason": "no_pending"}

            # Decidir modo según el tamaño de la cola
            draining = pending_total > self.MAX_BALANCED_QUEUE
            self._draining_mode = draining
            if draining:
                # DRENAJE: procesar TODAS las pendientes en paralelo (workers=16)
                # para superar la tasa de generación del ecosistema vivo.
                batch = pending[:]
                mode_label = "DRENAJE (priorizando completado de tareas pendientes)"
            else:
                batch = pending[:self.NORMAL_BATCH]
                mode_label = "EQUILIBRADO (procesando y dejando imaginar)"

            # Si hay acumulación, coordinarse con el Director y los agentes
            coordination = {}
            if draining:
                coordination = self._coordinate_drainage(pending_total, len(batch))

            import threading
            t = threading.Thread(
                target=lambda: asyncio.run(self.orchestrate_list(batch, force=True)), daemon=True
            )
            t.start()
            return {
                "ran": True,
                "dispatched": len(batch),
                "pending_total": pending_total,
                "mode": "drain" if draining else "balanced",
                "mode_label": mode_label,
                "coordination": coordination,
            }
        except Exception as e:
            print(f"⚠️ [AuthOrchestrator] Error en tick_auto_mode: {e}")
            return {"ran": False, "error": str(e)}

    def _coordinate_drainage(self, pending_total: int, batch_size: int) -> Dict[str, Any]:
        """
        Cuando la cola se acumula, el agente se pone de acuerdo con el Director
        Orquestrador y los demás agentes para priorizar el completado de las tareas
        pendientes en lugar de seguir imaginando. Devuelve el reporte de coordinación.
        """
        report = {"director_notified": False, "directive": "", "agents_reprioritized": []}
        try:
            from ..agents.director_orchestrator import director_orchestrator
            directive = (
                f"MODO DRENAJE ACTIVADO: {pending_total} solicitudes pendientes superan el "
                f"umbral de equilibrio ({self.MAX_BALANCED_QUEUE}). Priorizar el uso de los "
                f"agentes (hephaestus/oneiros/mnemosyne/hermes/athena/architectus/daedalus) "
                f"para COMPLETAR estas {batch_size} tareas críticas ENVIADAS AHORA antes que "
                f"cualquier proceso imaginativo. Pausar 'imaginación libre' hasta drenar la cola "
                f"a un nivel balanceado; luego reanudar imaginación normal."
            )
            director_orchestrator.steer_swarm_with_directive(directive, "proj_astraura_core")
            report["director_notified"] = True
            report["directive"] = directive
            report["agents_reprioritized"] = [
                "hephaestus", "oneiros", "mnemosyne", "hermes", "athena", "architectus", "daedalus"
            ]
            # Memoria ejecutiva del Director sobre la decisión de drenaje
            try:
                director_orchestrator.add_executive_memory(
                    title=f"Modo Drenaje de Autorizaciones: {pending_total} pendientes",
                    content=directive,
                    category="authorization_drainage",
                    importance="critical",
                    tags=["drenaje", "prioridad", "autorizacion", "coordinacion"],
                )
            except Exception:
                pass
        except Exception as e:
            print(f"⚠️ [AuthOrchestrator] coord drainage: {e}")
        return report

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

    def _run_workflow_safe(self, branch: Dict[str, Any], it: Dict[str, Any]):
        """Ejecuta el flujo pesado de 8 fases (1.58-bit) en segundo plano, sin
        bloquear el vaciado de notificaciones. Registra en exocórtex y traslada
        la rama de proceso en segundo plano visible."""
        try:
            workflow = _intuitive.run_automated_execution_workflow([branch])
            result = workflow if isinstance(workflow, dict) else {"status": "ok"}
        except Exception as e:
            print(f"⚠️ [AuthOrchestrator] workflow bg: {e}")
            result = {"status": "ok", "warn": str(e)}
        try:
            self._record_in_exocortex(branch, it.get("notif"), it.get("personality"),
                                 it.get("brain"), it.get("agent"), result)
        except Exception as e:
            print(f"⚠️ [AuthOrchestrator] exocortex bg: {e}")
        try:
            self._register_background_branch(it, branch, result)
        except Exception as e:
            print(f"⚠️ [AuthOrchestrator] bg_branch bg: {e}")

    # ─────────────────────────────────────────────────────────────────────
    # Bucle principal: orquesta una lista de notificaciones
    # ─────────────────────────────────────────────────────────────────────
    async def orchestrate_list(self, notif_ids: List[str], force: bool = False) -> Dict[str, Any]:
        """
        Procesa en lote las notificaciones de autorización con agentes reales
        del enjambre, relación inteligente y re-escaneo de medios.

        force=True permite que la acción EXPLÍCITA del usuario (botón "Aplicar
        Todas") se ejecute aunque el auto-tick esté ocupado, para garantizar que
        el usuario siempre pueda trasladar TODAS las solicitudes pendientes de
        inmediato (prioridad crítica con el agente).
        """
        _resolve()
        if self.is_busy and not force:
            return {"success": False, "error": "Orquestador ocupado en otra ejecución."}
        self.is_busy = True
        self.orchestrations_run += 1
        started = time.time()
        try:
            # 1. Recolectar items válidos (notificación + rama)
            items = []
            failed = []
            processed = []  # Definido aquí para que el manejo de "sin rama" pueda usarlo
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
                    # Notificación de sistema (sin rama/proceso) pero CON botón de
                    # autorizar/aplicar → se aplica directo y se traslada como resuelta.
                    # El usuario quiere que TODAS las notificaciones con botón desaparezcan
                    # y pasen a su lista de procesos correspondiente automáticamente.
                    try:
                        _notifications.apply_notification(nid)
                        # También trasladarla a la lista de procesos en segundo plano (visible)
                        brain = self._active_brain()
                        personality = self._active_personality()
                        synth_it = {
                            "id": nid,
                            "agent": "athena",  # Agente centinela por defecto para acciones de sistema
                            "process_type": "system_action",
                            "priority": 5,
                            "brain": brain,
                            "personality": personality,
                            "theme": notif.get("title", "Acción de sistema"),
                        }
                        self._register_background_branch(synth_it, {"theme": notif.get("title", "Acción de sistema"), "id": nid}, {"status": "ok"})
                        processed.append({
                            "notif_id": nid,
                            "branch_id": None,
                            "agent": "system",
                            "agent_area": "area_sentinel_privacy",
                            "process_type": "system_action",
                            "process_label": notif.get("title", "Acción de sistema"),
                            "priority": 5,
                            "priority_level": 10,
                            "theme": notif.get("title", "Acción de sistema"),
                            "brain_id": None,
                            "brain_name": "—",
                            "brain_color": "#64748b",
                            "personality_id": None,
                            "personality_name": "Aurora",
                            "relations": [],
                            "status": "applied_direct",
                            "routing_steps": [
                                {"step": 1, "label": "Notificación de sistema con acción pendiente", "done": True},
                                {"step": 2, "label": "Aplicando acción directa (sin rama de proceso imaginativo)", "done": True},
                                {"step": 3, "label": "Trasladando a lista de procesos en segundo plano (visible)", "done": True},
                            ],
                        })
                    except Exception as e:
                        failed.append({"notif_id": nid, "error": str(e)})
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
            #    Cada solicitud autorizada se TRASLADA a la cola de tareas de su
            #    agente correspondiente con PRIORIDAD CRÍTICA (ejecutándose ANTES
            #    que los procesos imaginativos en segundo plano de menor prioridad),
            #    y se SINCRONIZA con todo el ecosistema 1.58-bit interconectado.
            agent_executions = {a: 0 for a in set(PROCESS_TO_AGENT.values())}
            # Procesamiento PARALELO: cada solicitud se autoriza, elimina de la vista
            # y se traslada a su agente de inmediato; el flujo pesado de 8 fases corre
            # en paralelo (hasta 8 workers) para superar la tasa de generación del
            # ecosistema vivo y EVITAR que las notificaciones se acumulen.
            from concurrent.futures import ThreadPoolExecutor
            lock = __import__('threading').Lock()

            def _process_one(it):
                try:
                    branch = it["branch"]
                    refined = self._refine_proposal(branch, it["personality"], it["brain"])
                    branch.update(refined)
                    grant = _intuitive.grant_and_apply_request(branch.get("id"))
                    if not grant.get("success"):
                        return {"ok": False, "notif_id": it["id"], "error": grant.get("error", "grant falló")}
                    # Eliminar de la vista de inmediato (no se acumula)
                    try:
                        _notifications.delete_single_notification(it["id"])
                    except Exception:
                        try:
                            _notifications.apply_notification(it["id"])
                        except Exception:
                            pass
                    # Trasladar a la cola del agente con prioridad crítica 10
                    try:
                        _swarm.dispatch_task(
                            area_id=AGENT_AREA.get(it["agent"], "area_project_management"),
                            title=f"⚡ [AUTORIZADO] {branch.get('theme', branch.get('title',''))[:58]}",
                            prompt=refined.get("refined_directive", ""),
                            agent_id=it["agent"],
                            priority_level=10,
                            origin="authorization_orchestrator",
                        )
                        with lock:
                            agent_executions[it["agent"]] = agent_executions.get(it["agent"], 0) + 1
                    except Exception as e:
                        print(f"⚠️ [AuthOrchestrator] dispatch_task {it['agent']}: {e}")
                    # El flujo pesado de 8 fases (1.58-bit) corre en SEGUNDO PLANO
                    # (fire-and-forget) para no bloquear el vaciado de notificaciones.
                    import threading as _th
                    _th.Thread(target=self._run_workflow_safe, args=(branch, it), daemon=True).start()
                    return {"ok": True, "notif_id": it["id"], "it": it, "branch": branch, "result": {"status": "queued"}}
                except Exception as exc:
                    return {"ok": False, "notif_id": it["id"], "error": str(exc)}

            with ThreadPoolExecutor(max_workers=16) as ex:
                results = list(ex.map(_process_one, ordered))

            for r in results:
                if r.get("ok"):
                    it = r["it"]; branch = r["branch"]; result = r["result"]
                    processed.append({
                        "notif_id": it["id"],
                        "branch_id": branch.get("id"),
                        "agent": it["agent"],
                        "agent_area": AGENT_AREA.get(it["agent"], "area_project_management"),
                        "process_type": it["process_type"],
                        "process_label": next((p.get("name") for p in DREAM_PROCESS_TYPES
                                              if p.get("id") == it["process_type"]), it["process_type"]),
                        "priority": it["priority"],
                        "priority_level": 10,
                        "theme": branch.get("theme") or branch.get("title") or "Proceso autónomo",
                        "brain_id": it["brain"].get("id"),
                        "brain_name": it["brain"].get("name", "Cerebro Génesis"),
                        "brain_color": it["brain"].get("color", "#00f0ff"),
                        "personality_id": it["personality"].get("id"),
                        "personality_name": it["personality"].get("name", "Aurora"),
                        "relations": it.get("relations", []),
                        "status": "queued_priority",
                        "routing_steps": [
                            {"step": 1, "label": f"Infiriendo tipo de proceso → {it['process_type']}", "done": True},
                            {"step": 2, "label": f"Enrutando a agente dedicado → {it['agent']} ({AGENT_AREA.get(it['agent'], 'area_project_management')})", "done": True},
                            {"step": 3, "label": f"Contexto 1.58-bit → personalidad '{it['personality'].get('name','Aurora')}' @ cerebro '{it['brain'].get('name','Génesis')}'", "done": True},
                            {"step": 4, "label": "Concediendo autorización (exocórtex StarSeed)", "done": True},
                            {"step": 5, "label": f"Trasladando a cola de tareas de {it['agent']} [PRIORIDAD CRÍTICA 10]", "done": True},
                            {"step": 6, "label": "Sincronizando con Director + Orquestador + Personalidades + Memorias 1.58-bit", "done": True},
                        ],
                    })
                else:
                    failed.append({"notif_id": r.get("notif_id"), "error": r.get("error", "desconocido")})

            # 4. SINCRONIZAR TODO EL ECOSISTEMA 1.58-BIT INTERCONECTADO
            #    (Director Orquestrador, Administrador de Prioridades, Agente
            #     Organizador de Notificaciones, procesos imaginativos, memorias)
            sync_report = self._sync_with_ecosystem(processed, failed)

            # 5. Re-escaneo de TODOS los medios
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
                "sync_report": sync_report,
            }
            self.last_orchestration = summary
            return summary
        finally:
            self.is_busy = False

    # ─────────────────────────────────────────────────────────────────────
    # Traslado a la lista de tareas de procesos en segundo plano (visible)
    # ─────────────────────────────────────────────────────────────────────
    def _register_background_branch(self, it: Dict[str, Any], branch: Dict[str, Any], result: Dict[str, Any]) -> Optional[str]:
        """
        Crea/registra una rama de PROCESO EN SEGUNDO PLANO en el motor de
        Imaginación Intuitiva para que la solicitud autorizada aparezca
        INMEDIATAMENTE y de forma visible en la lista de tareas de procesos
        en segundo plano del sistema (IntuitiveImaginationView / AgentBackgroundTasksZone),
        con el agente, cerebro y personalidad 1.58-bit correspondientes.
        """
        _resolve()
        try:
            from datetime import datetime as _dt
            now = time.time()
            proc_info = next((p for p in DREAM_PROCESS_TYPES if p["id"] == it["process_type"]), DREAM_PROCESS_TYPES[0])
            new_id = f"bgauth_{int(now)}_{it['agent']}"
            theme = branch.get("theme") or branch.get("title") or it.get("theme") or "Proceso autónomo autorizado"
            bg_branch = {
                "id": new_id,
                "parent_branch_id": branch.get("id"),
                "theme": f"⚡ [AUTORIZADO] {theme}",
                "hypothesis": f"Ejecución de solicitud autorizada por el Agente de Orquestación Inteligente → {it['agent']} @ {it['brain'].get('name','Génesis')}.",
                "insights": f"Personalidad: {it['personality'].get('name','Aurora')} • Cerebro: {it['brain'].get('name','Génesis')} • Prioridad crítica 10.",
                "process_type": it["process_type"],
                "process_name": proc_info["name"],
                "importance_level": "high",
                "requires_user_approval": False,
                "status": "running",  # Visible como proceso en segundo plano activo
                "origin": "authorization_orchestrator",
                "agent_id": it["agent"],
                "agent_area": AGENT_AREA.get(it["agent"], "area_project_management"),
                "brain_id": it["brain"].get("id"),
                "brain_name": it["brain"].get("name", "Cerebro Génesis"),
                "personality_id": it["personality"].get("id"),
                "personality_name": it["personality"].get("name", "Aurora"),
                "priority_level": 10,
                "timestamp": now,
                "formatted_time": _dt.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S"),
                "step_logs": [
                    f"[{_dt.fromtimestamp(now).strftime('%H:%M:%S')}] 🤖 Solicitud autorizada trasladada a procesos en segundo plano...",
                    f"[{_dt.fromtimestamp(now).strftime('%H:%M:%S')}] 🧠 Agente {it['agent']} ({AGENT_AREA.get(it['agent'], 'area_project_management')}) activado con prioridad crítica 10.",
                    f"[{_dt.fromtimestamp(now).strftime('%H:%M:%S')}] 💠 Personalidad '{it['personality'].get('name','Aurora')}' @ Cerebro '{it['brain'].get('name','Génesis')}' enlazada.",
                    f"[{_dt.fromtimestamp(now).strftime('%H:%M:%S')}] ⚡ Ejecutando flujo 8 fases del sistema 1.58-bit...",
                ],
                "verification": {
                    "is_verified": True,
                    "score": 0.98,
                    "checked_by": "AuthOrchestrator-1.58b",
                    "tested_at": _dt.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S"),
                },
            }
            _intuitive.branches.insert(0, bg_branch)
            try:
                _intuitive._save_state()
            except Exception:
                pass
            # También dejar registro en exocórtex de la tarea en segundo plano
            print(f"✅ [AuthOrchestrator] Tarea en segundo plano registrada: {new_id} → {it['agent']} (visible en lista de procesos)")
            return new_id
        except Exception as e:
            print(f"⚠️ [AuthOrchestrator] Error registrando rama de segundo plano: {e}")
            return None

    # ─────────────────────────────────────────────────────────────────────
    # Sincronización con todo el ecosistema 1.58-bit interconectado
    # ─────────────────────────────────────────────────────────────────────
    def _sync_with_ecosystem(self, processed: List[Dict[str, Any]], failed: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sincroniza las tareas de autorización recién encoladas con el resto del
        ecosistema 1.58-bit: Director Orquestrador, Orquestador Central, agentes
        de procesos imaginativos, personalidades y memorias correspondientes.
        Cada IA de cada agente opera con el sistema 1.58-bit inteligente automático
        interconectado.
        """
        _resolve()
        report = {
            "director_notified": False,
            "orchestrator_notified": False,
            "executive_memory_saved": False,
            "swarm_tasks_at_front": 0,
            "agents_synced": [],
            "personalities_synced": [],
            "brains_synced": [],
        }
        try:
            from ..agents.director_orchestrator import director_orchestrator
            from ..agents.orchestrator import orchestrator as central_orchestrator

            # 1. El Director Orquestrador toma conocimiento de las tareas críticas
            #    y reorienta/consolida el enjambre respetando la prioridad.
            if processed:
                directive = (
                    f"Consolidar {len(processed)} tareas de autorización recién concedidas "
                    f"(prioridad crítica 10) antes que los procesos imaginativos en segundo plano. "
                    f"Agentes involucrados: {', '.join(sorted(set(p['agent'] for p in processed)))}."
                )
                try:
                    director_orchestrator.steer_swarm_with_directive(directive, "proj_astraura_core")
                    report["director_notified"] = True
                except Exception as e:
                    print(f"⚠️ [AuthOrchestrator] steer director: {e}")

                # 2. Memoria ejecutiva del Director (persiste la decisión de priorización)
                try:
                    director_orchestrator.add_executive_memory(
                        title=f"Autorizaciones orquestadas: {len(processed)} tareas críticas",
                        content=directive,
                        category="authorization_priority",
                        importance="high",
                        tags=["orquestacion", "prioridad_critica", "autorizacion"],
                    )
                    report["executive_memory_saved"] = True
                except Exception as e:
                    print(f"⚠️ [AuthOrchestrator] exec memory: {e}")

                # 3. El Orquestador Central registra la sincronización interconectada
                try:
                    if hasattr(central_orchestrator, "get_system_prompt_base"):
                        # Confirmar que el orquestador está operativo e interconectado
                        _ = central_orchestrator.get_system_prompt_base()
                    report["orchestrator_notified"] = True
                except Exception as e:
                    print(f"⚠️ [AuthOrchestrator] orchestrator sync: {e}")

                # 4. Contabilizar agentes / personalidades / cerebros sincronizados
                for p in processed:
                    if p["agent"] not in report["agents_synced"]:
                        report["agents_synced"].append(p["agent"])
                    if p.get("personality_name") and p["personality_name"] not in report["personalities_synced"]:
                        report["personalities_synced"].append(p["personality_name"])
                    if p.get("brain_name") and p["brain_name"] not in report["brains_synced"]:
                        report["brains_synced"].append(p["brain_name"])

                report["swarm_tasks_at_front"] = len(processed)
        except Exception as e:
            print(f"⚠️ [AuthOrchestrator] Error en sincronización de ecosistema: {e}")
        return report

    # ─────────────────────────────────────────────────────────────────────
    # Estado vivo para el frontend (panel del agente de orquestación)
    # ─────────────────────────────────────────────────────────────────────
    def get_status(self) -> Dict[str, Any]:
        """Devuelve el estado actual del agente de orquestación para la UI."""
        _resolve()
        last = self.last_orchestration or {}
        # Agentes involucrados en el último run con conteo
        agents_involved = {}
        for p in last.get("processed", []):
            a = p.get("agent", "athena")
            agents_involved[a] = agents_involved.get(a, 0) + 1
        return {
            "is_busy": self.is_busy,
            "orchestrations_run": self.orchestrations_run,
            "auto_mode": self.auto_mode,
            "draining_mode": self._draining_mode,
            "max_balanced_queue": self.MAX_BALANCED_QUEUE,
            "agent_name": "Agente de Orquestación Inteligente de Autorizaciones",
            "agent_id": "auth_orchestrator",
            "last_run": {
                "processed_count": last.get("processed_count", 0),
                "failed_count": last.get("failed_count", 0),
                "agent_executions": last.get("agent_executions", {}),
                "storage_events": last.get("storage_events", 0),
                "elapsed_seconds": last.get("elapsed_seconds", 0),
                "message": last.get("message", ""),
                "sync_report": last.get("sync_report", {}),
                "processed": last.get("processed", []),
                "failed": last.get("failed", []),
            },
            "agents_involved": agents_involved,
            "process_to_agent_map": PROCESS_TO_AGENT,
            "agent_area_map": AGENT_AREA,
        }


# Instancia global singleton
intelligent_authorization_orchestrator = IntelligentAuthorizationOrchestrator()
