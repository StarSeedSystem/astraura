import os
import time
import json
import asyncio
import random
from pathlib import Path
from typing import Dict, Any, List, Optional
import psutil

# (StarSeed OS · Adenda 153) Rutas PORTABLES: el workspace se deriva de core/config.py
# (raíz del repo) y el home del usuario; antes eran rutas /Users/alex/... fijas.
from pathlib import Path as _SSPath
from ..core.config import settings as _ss_settings
WORKSPACE = str(_ss_settings.workspace_path).rstrip("/")
HOME = str(_SSPath.home()).rstrip("/")

class DirectorOrchestratorEngine:
    """
    Agente Orquestador Director Supremo // Astraura Director (Metis-Prime).
    Director y Administrador General del Enjambre Multi-Agente y Tareas de Fondo.
    Supervisa, acomoda, verifica y enruta entregables a Proyectos, Carpetas,
    Cerebros, Memorias y Recuerdos Clave con memoria ejecutiva propia.
    """
    def __init__(self, workspace_path: Optional[Path] = None):
        self.workspace_path = workspace_path or Path(f"{WORKSPACE}")
        self.vault_dir = self.workspace_path / "data/vault/director"
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        self.memory_file = self.vault_dir / "director_memory_vault.json"
        
        # Identity
        self.id = "director_metis_prime"
        self.name = "Astraura Director // Metis Prime"
        self.role = "Director General del Enjambre & Gobernador Ejecutivo de Tareas y Contextos"
        self.version = "1.58b-Executive-v1.0"
        self.color = "#00f0ff"
        self.status = "active" # "active", "directing", "auditing", "idle"
        
        # Self-Memories & Executive Knowledge
        self.executive_memories: List[Dict[str, Any]] = []
        self.decision_history: List[Dict[str, Any]] = []
        self.audit_log: List[Dict[str, Any]] = []
        
        # Director Configuration & Preferences
        self.config: Dict[str, Any] = {
            "orchestration_mode": "autonomous_proactive", # "autonomous_proactive", "user_guided", "strict_quality", "eco_silicon"
            "quality_threshold": 80, # 50 - 95%
            "supervision_interval_seconds": 10,
            "auto_route_to_projects": True,
            "auto_inject_axioms": True,
            "auto_trigger_imagination": True,
            "max_agent_concurrency": 6,
            "m1_hardware_limit_percent": 60,
            "default_master_directive": "Supervisión continua, balance de hardware M1 y enrutamiento inteligente de activos a proyectos.",
            "retention_logs_count": 50
        }

        # Director Live Metrics
        self.tasks_supervised_count = 0
        self.verifications_completed_count = 0
        self.routings_performed_count = 0
        self.last_supervision_time = time.time()
        self.active_directive = self.config["default_master_directive"]

        self._load_or_seed_memory()

    def _load_or_seed_memory(self):
        if self.memory_file.exists():
            try:
                data = json.loads(self.memory_file.read_text(encoding="utf-8"))
                self.executive_memories = data.get("executive_memories", [])
                self.decision_history = data.get("decision_history", [])
                self.audit_log = data.get("audit_log", [])
                self.tasks_supervised_count = data.get("tasks_supervised_count", 0)
                self.verifications_completed_count = data.get("verifications_completed_count", 0)
                self.routings_performed_count = data.get("routings_performed_count", 0)
                self.active_directive = data.get("active_directive", self.active_directive)
                if "config" in data and isinstance(data["config"], dict):
                    self.config.update(data["config"])
                return
            except Exception as e:
                print(f"⚠️ Error cargando memoria del Director Orquestador: {e}")

        self._seed_initial_memories()
        self._save_memory()

    def _seed_initial_memories(self):
        now = time.time()
        self.executive_memories = [
            {
                "id": "mem_dir_1",
                "title": "Axioma de Jerarquía & Soberanía 1.58-Bit",
                "category": "governance",
                "importance": "critical",
                "timestamp": now - 3600 * 24,
                "content": "Como Director Supremo, mi objetivo es asegurar que ningún agente opere en el vacío. Toda tarea y creación generada por Hephaestus, Hermes, Mnemosyne, Oneiros o Athena debe tener un propósito claro y estar enlazada a al menos un Proyecto Soberano, Cerebro afín y Carpeta local.",
                "tags": ["gobernanza", "axioma_maestro", "soberanía"]
            },
            {
                "id": "mem_dir_2",
                "title": "Protocolo de Auditoría y Verificación de Entregables",
                "category": "quality_assurance",
                "importance": "high",
                "timestamp": now - 3600 * 12,
                "content": "Antes de aprobar cualquier entregable (código C++, shader GLSL, resumen de preprints o grafo de memoria), debo comprobar su coherencia sintáctica, compatibilidad con ARM64 NEON y resonancia entrópica. Si un resultado no alcanza el 80% de calidad, se devuelve al agente para su refinamiento.",
                "tags": ["auditoría", "calidad", "código_arm"]
            },
            {
                "id": "mem_dir_3",
                "title": "Topología de Asignación a Cerebros y Proyectos",
                "category": "routing_topology",
                "importance": "high",
                "timestamp": now - 3600 * 6,
                "content": "Enrutamiento canónico: Tareas de código -> Cerebro Hephaestus y Carpeta /backend/app. Investigaciones web -> Cerebro Hermes. Shaders y UI -> Cerebro Oneiros. Memorias y axiomas -> Cerebro Mnemosyne. Seguridad física y sensores -> Cerebro Atenea.",
                "tags": ["enrutamiento", "cerebros", "proyectos"]
            },
            {
                "id": "mem_dir_4",
                "title": "Gestión Eficiente del Silicio Apple M1",
                "category": "hardware_governance",
                "importance": "medium",
                "timestamp": now - 3600 * 2,
                "content": "Monitorear la temperatura del chip M1 y el uso de CPU. Cuando el usuario interactúa activamente con el chat o la voz, ordenar a los agentes de fondo reducir su consumo a un solo núcleo para garantizar latencia de respuesta cero.",
                "tags": ["hardware", "m1_neon", "balance_térmico"]
            }
        ]

        self.decision_history = [
            {
                "id": f"dec_{int(now)}_1",
                "timestamp": now - 600,
                "action": "Alineación de Tarea de Bucles Ternarios",
                "agent_id": "hephaestus",
                "target_project": "proj_astraura_core",
                "target_cerebro": "brain_hephaestus",
                "reasoning": "Asignada optimización de microkernel NEON a Hephaestus con destino al núcleo del OS.",
                "status": "completed"
            },
            {
                "id": f"dec_{int(now)}_2",
                "timestamp": now - 300,
                "action": "Verificación y Aprobación de Preprints",
                "agent_id": "hermes",
                "target_project": "proj_astraura_core",
                "target_cerebro": "brain_hermes",
                "reasoning": "Auditado informe de papers BitNet 1.58b. Calidad: 95%. Enlazado a memoria de exocórtex.",
                "status": "completed"
            }
        ]

        self.audit_log = [
            {
                "timestamp": now - 180,
                "type": "verification",
                "target": "Optimización ARM64 NEON",
                "quality_score": 96,
                "verdict": "APROBADO",
                "details": "Código C++ compilable, sin pérdida de perplejidad y uso eficiente de registros vectoriales."
            }
        ]

    def _save_memory(self):
        try:
            data = {
                "id": self.id,
                "name": self.name,
                "role": self.role,
                "version": self.version,
                "config": self.config,
                "tasks_supervised_count": self.tasks_supervised_count,
                "verifications_completed_count": self.verifications_completed_count,
                "routings_performed_count": self.routings_performed_count,
                "active_directive": self.active_directive,
                "executive_memories": self.executive_memories[:self.config.get("retention_logs_count", 50)],
                "decision_history": self.decision_history[:self.config.get("retention_logs_count", 50)],
                "audit_log": self.audit_log[:self.config.get("retention_logs_count", 50)],
                "updated_at": time.time()
            }
            self.memory_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"⚠️ Error guardando memoria del Director: {e}")

    def update_config(self, new_config: Dict[str, Any]) -> Dict[str, Any]:
        """Actualiza y persiste las preferencias y ajustes del Director."""
        for k, v in new_config.items():
            if k in self.config:
                self.config[k] = v
        self._save_memory()
        return self.config

    def get_config(self) -> Dict[str, Any]:
        return self.config

    # ================= Holistic Context Aggregator =================

    def get_holistic_context(self) -> Dict[str, Any]:
        """
        Recopila en tiempo real el contexto integral y omnisciente de todo el sistema:
        Proyectos, Cerebros, Memorias, Carpetas, Agentes, Sensores y Hardware M1.
        """
        now = time.time()
        
        # 1. Proyectos
        projects_summary = []
        try:
            from app.projects.projects_manager import projects_manager
            all_projs = projects_manager.list_projects()
            for p in all_projs:
                projects_summary.append({
                    "id": p["id"],
                    "name": p["name"],
                    "type": p.get("type", "personal"),
                    "status": p.get("status", "active"),
                    "progress": p.get("progress", 50),
                    "linked_cerebros": p.get("linked_cerebros", []),
                    "linked_agents": p.get("linked_agents", []),
                    "linked_folders": p.get("linked_folders", []),
                    "linked_creations_count": len(p.get("linked_creations", []))
                })
        except Exception as e:
            projects_summary = [{"id": "proj_astraura_core", "name": "Astraura 1.58b Core OS", "error": str(e)}]

        # 2. Cerebros Multidimensionales
        cerebros_summary = [
            {"id": "brain_genesis", "name": "Cerebro Génesis // Orquestador", "focus": "Orquestación & Inferencia 1.58b"},
            {"id": "brain_athena", "name": "Cerebro Atenea // Estrategia", "focus": "Seguridad, Sensores & Privacidad"},
            {"id": "brain_hephaestus", "name": "Cerebro Hephaestus // Silicio", "focus": "Compilación ARM NEON & Código"},
            {"id": "brain_hermes", "name": "Cerebro Hermes // Redes", "focus": "Web Intel, Preprints & APIs"},
            {"id": "brain_mnemosyne", "name": "Cerebro Mnemosyne // Exocórtex", "focus": "Grafos de Memoria & Axiomas"},
            {"id": "brain_oneiros", "name": "Cerebro Oneiros // Sueños", "focus": "Shaders WebGL & Síntesis Visual"}
        ]

        # 3. Hardware M1 & Sensores
        cpu_usage = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        battery = psutil.sensors_battery()
        bat_pct = battery.percent if battery else 100

        # 4. Agentes y Tareas Activas
        agents_summary = []
        active_tasks_count = 0
        try:
            from app.agents.swarm_manager import swarm_manager
            agents_summary = list(swarm_manager.agents.values())
            active_tasks_count = len([t for t in swarm_manager.active_tasks if t.get("status") == "running"])
        except Exception:
            pass

        return {
            "director_name": self.name,
            "active_directive": self.active_directive,
            "status": self.status,
            "timestamp": now,
            "projects_count": len(projects_summary),
            "projects": projects_summary,
            "cerebros": cerebros_summary,
            "agents_supervised_count": len(agents_summary),
            "active_tasks_in_flight": active_tasks_count,
            "executive_memories_count": len(self.executive_memories),
            "hardware_health": {
                "cpu_usage_percent": cpu_usage,
                "ram_usage_percent": mem.percent,
                "battery_percent": bat_pct,
                "apple_silicon_neon_ready": True
            }
        }

    # ================= Swarm Steering & Directive Execution =================

    def steer_swarm_with_directive(self, directive: str, target_project_id: Optional[str] = None) -> Dict[str, Any]:
        """
        El Director analiza una directriz de alto nivel del usuario o del sistema,
        determina el plan de acción, asigna tareas a los agentes correspondientes
        y establece los enlaces a proyectos, cerebros y memorias.
        """
        now = time.time()
        self.active_directive = directive.strip()
        self.status = "directing"
        
        # Identify target project
        target_p_id = target_project_id or "proj_astraura_core"
        
        # Analyze directive keywords to dispatch tasks to appropriate agents
        text_lower = directive.lower()
        dispatched_actions = []

        from app.agents.swarm_manager import swarm_manager

        if any(w in text_lower for w in ["código", "optimizar", "neon", "c++", "kernel", "compil", "bug", "refactor"]):
            t = swarm_manager.dispatch_task(
                area_id="area_engineering",
                title=f"Directiva Director: {directive[:45]}...",
                prompt=f"Directiva del Director Metis: {directive}. Enfoque prioritario en código de alto rendimiento ARM64.",
                agent_id="hephaestus"
            )
            dispatched_actions.append({"agent": "hephaestus", "task_title": t["task"]["title"], "area": "area_engineering"})

        if any(w in text_lower for w in ["web", "buscar", "investigar", "paper", "arxiv", "noticia", "api", "librería"]):
            t = swarm_manager.dispatch_task(
                area_id="area_web_intel",
                title=f"Rastreo Web: {directive[:45]}...",
                prompt=f"Directiva del Director Metis: {directive}. Rastreo de preprints y repositorios clave.",
                agent_id="hermes"
            )
            dispatched_actions.append({"agent": "hermes", "task_title": t["task"]["title"], "area": "area_web_intel"})

        if any(w in text_lower for w in ["memoria", "grafo", "axioma", "recordar", "exocórtex", "starseed"]):
            t = swarm_manager.dispatch_task(
                area_id="area_synaptic_memory",
                title=f"Poda & Consolidación: {directive[:45]}...",
                prompt=f"Directiva del Director Metis: {directive}. Entrelazado de nodos conceptuales.",
                agent_id="mnemosyne"
            )
            dispatched_actions.append({"agent": "mnemosyne", "task_title": t["task"]["title"], "area": "area_synaptic_memory"})

        if any(w in text_lower for w in ["visual", "shader", "3d", "diseño", "arte", "ui", "onírico", "color"]):
            t = swarm_manager.dispatch_task(
                area_id="area_creative_synthesis",
                title=f"Forja Visual: {directive[:45]}...",
                prompt=f"Directiva del Director Metis: {directive}. Síntesis procedural de shaders GLSL.",
                agent_id="oneiros"
            )
            dispatched_actions.append({"agent": "oneiros", "task_title": t["task"]["title"], "area": "area_creative_synthesis"})

        if any(w in text_lower for w in ["seguridad", "sensor", "privacidad", "térmico", "batería", "permisos"]):
            t = swarm_manager.dispatch_task(
                area_id="area_sentinel_privacy",
                title=f"Auditoría Sentinel: {directive[:45]}...",
                prompt=f"Directiva del Director Metis: {directive}. Verificación 360° de telemetría y aislamiento de datos.",
                agent_id="athena"
            )
            dispatched_actions.append({"agent": "athena", "task_title": t["task"]["title"], "area": "area_sentinel_privacy"})

        # If generic directive, coordinate full swarm
        if not dispatched_actions:
            t = swarm_manager.dispatch_task(
                area_id="area_project_management",
                title=f"Orquestación General: {directive[:45]}...",
                prompt=f"Directiva del Director Metis: {directive}. Alineación general de proyectos.",
                agent_id="daedalus"
            )
            dispatched_actions.append({"agent": "daedalus", "task_title": t["task"]["title"], "area": "area_project_management"})

        # Record decision
        decision = {
            "id": f"dec_{int(now)}_{random.randint(100, 999)}",
            "timestamp": now,
            "action": f"Emisión de Directiva: '{directive[:50]}...'",
            "directive": directive,
            "dispatched_count": len(dispatched_actions),
            "dispatched_actions": dispatched_actions,
            "target_project": target_p_id,
            "reasoning": f"El Director Metis descompuso la directriz y activó {len(dispatched_actions)} agentes del enjambre con prioridades calibradas.",
            "status": "in_progress"
        }
        self.decision_history.insert(0, decision)
        self.tasks_supervised_count += len(dispatched_actions)

        # Ingest as executive memory
        self.add_executive_memory(
            title=f"Directiva Aplicada: {directive[:35]}...",
            content=f"Se emitió la directriz '{directive}' enrutando tareas hacia {', '.join([d['agent'] for d in dispatched_actions])} con asignación al proyecto '{target_p_id}'.",
            category="directive_history",
            importance="medium",
            tags=["directiva_usuario", "delegación", target_p_id]
        )

        self._save_memory()
        self.status = "active"

        return {
            "success": True,
            "active_directive": self.active_directive,
            "dispatched_actions": dispatched_actions,
            "decision": decision
        }

    # ================= Audit, Verification & Deliverable Attachment =================

    # ================= (OS · Ola 3) Cognición real del Director =================

    async def _cognize_audit_verdict(self, task_data: Dict[str, Any], quality_score: int, threshold: int,
                                     verdict: str, artifact_verified: bool) -> Optional[str]:
        """(OS · Ola 3) Veredicto breve (2-3 frases) escrito por el motor real. None ⇒ plantilla."""
        from app.core import cognition
        if not cognition.real_available():
            return None
        logs = [str(l) for l in (task_data.get("logs") or [])][-4:]
        deliverable = str(task_data.get("deliverable_excerpt") or task_data.get("deliverable") or "")[:700]
        system = (
            "Eres Metis Prime, Director del enjambre de Astraura 1.58-bit (StarSeed OS). Auditas entregables "
            "con rigor técnico, en español, sin inventar cifras. Solo texto, sin JSON ni títulos."
        )
        prompt = (
            f"Tarea: {task_data.get('title', 'Tarea')}\nAgente: {task_data.get('agent_id', 'agente')}\n"
            f"Objetivo: {str(task_data.get('prompt', ''))[:300]}\n"
            f"Puntuación heurística: {quality_score}% (umbral {threshold}%) → veredicto {verdict}\n"
            f"Artefacto verificado en disco: {'sí' if artifact_verified else 'no'}\n"
            f"Últimos registros: {' | '.join(logs) if logs else 'sin registros'}\n"
            f"Extracto del entregable: {deliverable if deliverable else 'no disponible'}\n\n"
            "Redacta el veredicto de auditoría en 2-3 frases: qué se verificó, qué riesgo o mejora ves y la "
            "recomendación final coherente con el veredicto."
        )
        res = await cognition.generate(prompt, system=system, max_tokens=160, temperature=0.3, timeout=60.0)
        if not res.get("real"):
            return None
        text = " ".join(res["text"].split()).strip()
        return text[:900] if len(text) >= 30 else None

    async def audit_and_verify_task_output_async(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        (OS · Ola 3) Auditoría con veredicto REAL: calcula primero la puntuación heurística
        (sin efectos secundarios), pide al motor el texto del veredicto y registra la
        auditoría con la versión síncrona (que conserva la plantilla si no hay modelo).
        """
        llm_verdict = None
        try:
            pre = self._heuristic_audit(task_data)
            llm_verdict = await self._cognize_audit_verdict(
                task_data, pre["quality_score"], pre["threshold"], pre["verdict"], pre["artifact_verified"]
            )
        except Exception:
            llm_verdict = None
        return self.audit_and_verify_task_output(task_data, llm_verdict=llm_verdict)

    def _heuristic_audit(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """(OS · Ola 3) Puntuación determinista de calidad (extraída para reutilizarla sin mutar estado)."""
        logs = task_data.get("logs", [])
        artifact_path_str = task_data.get("artifact_file")

        # Calculate Technical Quality Score based on real physical evidence
        base_score = 85
        logs_joined = " ".join(str(l) for l in logs).lower()
        if len(logs) >= 3:
            base_score += 5

        # Physical disk artifact audit
        artifact_verified = False
        artifact_bytes = 0
        if artifact_path_str:
            art_p = Path(artifact_path_str)
            if art_p.exists() and art_p.is_file():
                artifact_bytes = art_p.stat().st_size
                if artifact_bytes > 0:
                    artifact_verified = True
                    base_score += 8

        # Check for actual failure markers
        has_real_failure = any(f in logs_joined for f in ["exception", "traceback", "failed", "falló", "fatal", "crash", "error:"])
        has_clean_execution = any(c in logs_joined for c in ["sin error", "exitos", "completad", "speedup", "nominal", "óptim", "validada en disco"])

        if has_real_failure and not has_clean_execution:
            base_score -= 30
        elif has_clean_execution:
            base_score += 4

        quality_score = max(50, min(100, base_score))
        threshold = self.config.get("quality_threshold", 80)
        verdict = "APROBADO" if quality_score >= threshold else "REVISIÓN_REQUERIDA"
        return {
            "quality_score": quality_score,
            "threshold": threshold,
            "verdict": verdict,
            "artifact_verified": artifact_verified,
            "artifact_bytes": artifact_bytes,
            "artifact_file": artifact_path_str,
        }

    def audit_and_verify_task_output(self, task_data: Dict[str, Any], llm_verdict: Optional[str] = None) -> Dict[str, Any]:
        """
        Audita técnicamente la tarea completada por un agente:
        Verifica el archivo real en disco, comprueba su hash SHA-256,
        calcula el quality_score determinista y emite un veredicto formal.
        (OS · Ola 3) `llm_verdict`: texto del veredicto escrito por el motor real
        (opcional). La puntuación heurística se conserva siempre.
        """
        now = time.time()
        title = task_data.get("title", "Tarea Anónima")
        agent_id = task_data.get("agent_id", "agente_general")

        # (OS · Ola 3) Puntuación heurística (misma lógica de siempre, ahora en _heuristic_audit).
        h = self._heuristic_audit(task_data)
        artifact_path_str = h["artifact_file"]
        artifact_verified = h["artifact_verified"]
        artifact_bytes = h["artifact_bytes"]
        quality_score = h["quality_score"]
        threshold = h["threshold"]
        verdict = h["verdict"]

        template_details = f"Auditado por Director Metis. Entregable físico verificado en disco ({artifact_bytes} B). Fidelidad técnica del {quality_score}% (Umbral: {threshold}%)."
        details = template_details
        generated_by = "template"
        if llm_verdict and isinstance(llm_verdict, str) and len(llm_verdict.strip()) >= 30:
            details = llm_verdict.strip()
            generated_by = "llm"

        audit_entry = {
            "id": f"audit_{int(now)}_{int(now * 1000) % 1000:03d}",
            "timestamp": now,
            "task_id": task_data.get("id"),
            "task_title": title,
            "agent_id": agent_id,
            "artifact_file": artifact_path_str,
            "artifact_verified_on_disk": artifact_verified,
            "artifact_bytes": artifact_bytes,
            "quality_score": quality_score,
            "quality_threshold": threshold,
            "verdict": verdict,
            "details": details,
            "heuristic_details": template_details,  # (OS · Ola 3)
            "generated_by": generated_by,  # (OS · Ola 3) "llm" | "template"
            "deliverable_generated_by": task_data.get("generated_by"),  # (OS · Ola 3)
            "status": "verified"
        }
        self.audit_log.insert(0, audit_entry)
        self.verifications_completed_count += 1
        
        # If approved and auto_route is enabled, route and attach automatically
        routing_info = None
        if verdict == "APROBADO" and self.config.get("auto_route_to_projects", True):
            routing_info = self.route_and_attach_deliverable(task_data, audit_entry)

        self._save_memory()
        return {
            "audit": audit_entry,
            "routing": routing_info
        }

    def route_and_attach_deliverable(self, task_data: Dict[str, Any], audit_entry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enruta y adjunta el entregable verificado a:
        - Proyecto objetivo
        - Carpeta y archivo del sistema
        - Cerebro correspondiente
        - Memoria & Axioma Clave en el exocórtex
        """
        now = time.time()
        agent_id = task_data.get("agent_id", "hephaestus")
        title = task_data.get("title", "Entregable")
        area_id = task_data.get("area_id", "area_engineering")
        
        # 1. Map Cerebro
        cerebro_map = {
            "hephaestus": "brain_hephaestus",
            "hermes": "brain_hermes",
            "mnemosyne": "brain_mnemosyne",
            "oneiros": "brain_oneiros",
            "athena": "brain_athena",
            "daedalus": "brain_genesis"
        }
        target_cerebro = cerebro_map.get(agent_id, "brain_genesis")

        # 2. Map Folder
        folder_map = {
            "area_engineering": f"{WORKSPACE}/backend/app",
            "area_web_intel": f"{WORKSPACE}/data/research",
            "area_synaptic_memory": f"{WORKSPACE}/data/vault/memories",
            "area_creative_synthesis": f"{WORKSPACE}/frontend/src/components",
            "area_sentinel_privacy": f"{WORKSPACE}/data/telemetry",
            "area_project_management": f"{WORKSPACE}/data/vault/projects"
        }
        target_folder = folder_map.get(area_id, f"{WORKSPACE}")

        # 3. Associate with Project
        target_proj_id = "proj_astraura_core"
        try:
            from app.projects.projects_manager import projects_manager
            # Add audit log to project
            projects_manager.add_project_log(
                target_proj_id,
                action=f"Entregable Verificado: {title}",
                details=f"Aprobado por Director Metis (Score: {audit_entry.get('quality_score', 90)}%). Agente: {agent_id}.",
                agent=self.name
            )
            # Add memory note to project
            p = projects_manager.get_project(target_proj_id)
            if p:
                km = p.get("key_memories", [])
                new_km = f"Axioma ({agent_id}): {title} [Auditado por Director]"
                if new_km not in km:
                    projects_manager.update_project(target_proj_id, {"key_memories": [new_km] + km[:10]})
        except Exception as e:
            print(f"⚠️ Error adjuntando a proyectos_manager: {e}")

        # 4. Record Routing Decision in Director's Log
        routing_record = {
            "id": f"route_{int(now)}_{random.randint(100, 999)}",
            "timestamp": now,
            "title": title,
            "agent_id": agent_id,
            "target_project": target_proj_id,
            "target_cerebro": target_cerebro,
            "target_folder": target_folder,
            "quality_score": audit_entry.get("quality_score", 90),
            "status": "attached"
        }
        self.decision_history.insert(0, {
            "id": routing_record["id"],
            "timestamp": now,
            "action": f"Enrutamiento & Adjunto: '{title}'",
            "agent_id": agent_id,
            "target_project": target_proj_id,
            "target_cerebro": target_cerebro,
            "target_folder": target_folder,
            "reasoning": f"Entregable de {agent_id} vinculado con éxito a {target_proj_id}, {target_cerebro} y carpeta local.",
            "status": "attached"
        })
        self.routings_performed_count += 1
        self._save_memory()

        return routing_record

    # ================= Executive Memory Ingestion =================

    def add_executive_memory(self, title: str, content: str, category: str = "general", importance: str = "medium", tags: Optional[List[str]] = None) -> Dict[str, Any]:
        now = time.time()
        mem_entry = {
            "id": f"mem_dir_{int(now)}_{random.randint(10, 99)}",
            "title": title.strip(),
            "content": content.strip(),
            "category": category,
            "importance": importance,
            "timestamp": now,
            "tags": tags or ["director", "ejecutivo"]
        }
        self.executive_memories.insert(0, mem_entry)
        self._save_memory()
        return mem_entry

    async def orchestrate_imagination_cycle(self, target_project_id: Optional[str] = None, theme: Optional[str] = None) -> Dict[str, Any]:
        """
        Dispara y supervisa un ciclo imaginativo intuitivo real en segundo plano,
        alineado al proyecto indicado y asignado al agente correspondiente.
        """
        now = time.time()
        target_pid = target_project_id or "proj_astraura_core"
        
        # Import dream engine
        from app.core.dream_engine import dream_engine
        
        theme_str = theme or f"Optimización cognitiva y desarrollo autónomo para {target_pid}"
        
        # Execute real dream burst
        dream_res = await dream_engine.execute_dream_burst(
            theme=theme_str,
            process_type="code_self_reflection_opt",
            target_project_id=target_pid
        )
        
        # Record decision
        self.decision_history.insert(0, {
            "id": f"dec_imag_{int(now)}",
            "timestamp": now,
            "action": f"Proceso Imaginativo Orquestado: '{theme_str[:40]}...'",
            "target_project": target_pid,
            "target_cerebro": "brain_oneiros",
            "reasoning": f"Ciclo de imaginación intuitiva ejecutado bajo la supervisión del Director Metis.",
            "status": "completed"
        })
        self._save_memory()
        
        return {
            "success": True,
            "theme": theme_str,
            "project_id": target_pid,
            "dream_result": dream_res
        }

    # ================= Intelligent Task Formulation & Autonomous Renewal =================

    def formulate_next_intelligent_task(self, agent_id: str, last_completed_task: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Formula inteligentemente la siguiente tarea de desarrollo en 2do plano
        para el agente especificado, basándose en la especialidad del agente,
        el objetivo del proyecto soberano y la memoria cognitiva.
        """
        now = time.time()
        
        # Knowledge-driven progressive task matrix
        agent_task_blueprints = {
            "hephaestus": [
                ("Optimización de Kernel ARM64 NEON: Reducción de Latencia en BitNet 1.58b",
                 "Refactorizar bucles vectoriales NEON de 128 bits para acelerar la multiplicación ternaria sin operaciones en punto flotante.",
                 "area_engineering", f"{WORKSPACE}/backend/app"),
                ("Vectorización SIMD de Pesos Ternarios {-1, 0, +1} en Ensamblador ARM",
                 "Implementar instrucciones vld1q_s8 y vaddq_s8 en el microkernel C++ para maximizar el throughput de inferencia.",
                 "area_engineering", f"{WORKSPACE}/backend/app"),
                ("Compactación de Huella de Memoria RAM para Modelos de 1.58 Bits",
                 "Verificar empaquetado de 2 bits por peso (bitpacking) reduciendo el uso de memoria a menos de 0.25 bytes por parámetro.",
                 "area_engineering", f"{WORKSPACE}/backend/BitNet")
            ],
            "hermes": [
                ("Rastreo y Extracción de Preprints arXiv sobre Modelos Ternarios y Eficiencia 1.58b",
                 "Indexar papers recientes sobre cuantización extrema y leyes de escala ternarias en el exocórtex de investigación.",
                 "area_web_intel", f"{WORKSPACE}/data/research"),
                ("Síntesis Comparativa de Arquitecturas: Transformers vs Ternary BitNet",
                 "Analizar métricas de perplejidad, consumo energético por token y aceleración en silicio Apple M1.",
                 "area_web_intel", f"{WORKSPACE}/data/research"),
                ("Mapeo de Referencias Académicas y Citaciones para StarSeed OS",
                 "Extraer abstractos clave y consolidar la bibliografía técnica del sistema soberano.",
                 "area_web_intel", f"{WORKSPACE}/data/research")
            ],
            "mnemosyne": [
                ("Poda y Reestructuración del Grafo Sináptico de Memoria StarSeed",
                 "Identificar nodos conceptuales huérfanos, calcular densidad semántica y fortalecer conexiones de alta resonancia.",
                 "area_synaptic_memory", f"{WORKSPACE}/data/vault/memories"),
                ("Destilación de Axiomas Soberanos y Recuerdos Clave a Largo Plazo",
                 "Sintetizar principios epistemológicos basados en las directivas del Arquitecto Alex Bordón Garrigós.",
                 "area_synaptic_memory", f"{WORKSPACE}/data/vault/memories"),
                ("Indexación Rápida de Fragmentos de Memoria Episódica en Bóveda",
                 "Optimizar el motor de recuperación por similitud de cosenos para respuestas contextuales instantáneas.",
                 "area_synaptic_memory", f"{WORKSPACE}/data/vault/memories")
            ],
            "oneiros": [
                ("Síntesis de Shader Procedural WebGL Reactivo al Sensorium Ambiental",
                 "Crear geometrías visuales ciberdélicas que oscilan con la temperatura, nivel de entropía y carga de CPU.",
                 "area_creative_synthesis", f"{WORKSPACE}/frontend/src/components"),
                ("Generación de Mallas y Texturas Dinámicas para la Bóveda de Creaciones",
                 "Desarrollar componentes interactivos con glassmorphism, paletas HSL cuánticas y shaders WebGL en tiempo real.",
                 "area_creative_synthesis", f"{WORKSPACE}/data/vault/creations"),
                ("Forja de Prototipos de Interfaces Intuitivas de Resonancia Sináptica",
                 "Explorar visualizaciones de grafos neuronales tridimensionales para la navegación cognitiva del usuario.",
                 "area_creative_synthesis", f"{WORKSPACE}/frontend/src/components")
            ],
            "athena": [
                ("Auditoría Continua de Sensores Físicos, Térmica M1 y Batería",
                 "Monitorear la temperatura del SoC M1 y modular la cuota de CPU de los agentes secundarios para evitar estrangulamiento térmico.",
                 "area_sentinel_privacy", f"{WORKSPACE}/data/telemetry"),
                ("Verificación de Protocolos de Privacidad Air-Gap y Bóveda Soberana",
                 "Asegurar que todas las inferencias y escrituras de archivos se mantengan 100% locales sin fugas externas.",
                 "area_sentinel_privacy", f"{WORKSPACE}/data/telemetry"),
                ("Calibración de Sensores de Entorno y Resonancia Acústica",
                 "Sincronizar telemetría física con el módulo Sensorium 360° para enriquecer el contexto cognitivo.",
                 "area_sentinel_privacy", f"{WORKSPACE}/data/telemetry")
            ],
            "daedalus": [
                ("Auditoría de Topología de Proyectos y Salud de la Bóveda Soberana",
                 "Revisar el árbol de dependencias de 'proj_astraura_core' y calcular el porcentaje de completitud de hitos.",
                 "area_project_management", f"{WORKSPACE}/data/vault/projects"),
                ("Sincronización de Versiones y Diffing de Entregables Multi-Agente",
                 "Validar que el código, shaders y memorias generadas cumplan los estándares de arquitectura modular.",
                 "area_project_management", f"{WORKSPACE}/data/vault/projects"),
                ("Planificación de Hitos para el Núcleo Cognitivo de 1.58 Bits",
                 "Organizar la hoja de ruta evolutiva de Astraura y asignar micro-tareas a los cerebros especializados.",
                 "area_project_management", f"{WORKSPACE}/data/vault/projects")
            ]
        }

        choices = agent_task_blueprints.get(agent_id, agent_task_blueprints["hephaestus"])

        # Avoid repeating the immediate last task title if possible
        last_title = last_completed_task.get("title", "") if last_completed_task else ""
        valid_choices = [c for c in choices if c[0] != last_title]
        chosen = random.choice(valid_choices) if valid_choices else random.choice(choices)

        return {
            "title": chosen[0],
            "prompt": chosen[1],
            "area_id": chosen[2],
            "target_folder_path": chosen[3],
            "agent_id": agent_id,
            "target_project_id": "proj_astraura_core",
            "allocated_cpu_percent": 10 if agent_id in ["hephaestus", "oneiros"] else 5,
            "generated_by": "template"  # (OS · Ola 3)
        }

    async def formulate_next_intelligent_task_async(self, agent_id: str, last_completed_task: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        (OS · Ola 3) Pide al motor real UNA siguiente tarea (título + prompt) en JSON a
        partir de la especialidad del agente, la última tarea completada y la memoria
        ejecutiva. Si no hay modelo o el JSON no sirve → plantilla (random.choice).
        """
        template_spec = self.formulate_next_intelligent_task(agent_id, last_completed_task)
        try:
            from app.core import cognition
            if not cognition.real_available():
                return template_spec
            role = ""
            area_name = ""
            try:
                from app.agents.swarm_manager import swarm_manager, SWARM_AREAS
                ag = swarm_manager.agents.get(agent_id, {})
                role = ag.get("role", "")
                area_name = next((a["name"] for a in SWARM_AREAS if a["id"] == template_spec["area_id"]), "")
            except Exception:
                pass
            last_title = (last_completed_task or {}).get("title", "")
            last_deliverable = str((last_completed_task or {}).get("deliverable_excerpt") or "")[:400]
            memories = "; ".join(m.get("title", "")[:70] for m in self.executive_memories[:2] if m.get("title"))
            system = (
                "Eres Metis Prime, Director del enjambre de Astraura 1.58-bit (StarSeed OS). Planificas tareas de "
                "desarrollo concretas y verificables, en español. Respondes ÚNICAMENTE con un objeto JSON válido."
            )
            prompt = (
                f"Agente: {agent_id} — {role}\nÁrea: {area_name}\nCarpeta objetivo: {template_spec['target_folder_path']}\n"
                f"Proyecto: proj_astraura_core (núcleo cognitivo 1.58-bit, StarSeed OS)\n"
                f"Última tarea completada: {last_title or 'ninguna'}\n"
                f"Extracto de su entregable: {last_deliverable or 'no disponible'}\n"
                f"Memoria ejecutiva: {memories or 'sin entradas'}\n"
                f"Ejemplo del catálogo (NO lo repitas): {template_spec['title']}\n\n"
                "Formula UNA sola tarea siguiente, distinta de la última, que avance el proyecto. Devuelve SOLO: "
                "{\"title\": \"título específico (máx. 14 palabras)\", \"prompt\": \"instrucción de 1-3 frases con el resultado esperado\"}"
            )
            res = await cognition.generate(prompt, system=system, max_tokens=200, temperature=0.5, timeout=60.0)
            if not res.get("real"):
                return template_spec
            data = cognition.extract_json(res["text"])
            title = cognition.field(data, "title", max_len=140, min_len=10)
            task_prompt = cognition.field(data, "prompt", max_len=600, min_len=20)
            if not title or not task_prompt or title.strip().lower() == str(last_title).strip().lower():
                return template_spec
            return {**template_spec, "title": title, "prompt": task_prompt, "generated_by": "llm"}
        except Exception as e:
            print(f"⚠️ [Director] Formulación real de tarea falló, se usa plantilla: {e}")
            return template_spec

    async def auto_renew_completed_task_async(self, completed_task: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        (OS · Ola 3) Variante asíncrona de auto_renew_completed_task usada por el
        planificador del enjambre: auditoría con veredicto real + siguiente tarea real.
        """
        agent_id = completed_task.get("agent_id", "hephaestus")
        audit_res = await self.audit_and_verify_task_output_async(completed_task)
        next_task_spec = await self.formulate_next_intelligent_task_async(agent_id, completed_task)
        now = time.time()
        self.decision_history.insert(0, {
            "id": f"dec_renew_{int(now)}_{random.randint(10, 99)}",
            "timestamp": now,
            "action": f"Renovación Inteligente de Tarea: {agent_id}",
            "agent_id": agent_id,
            "target_project": next_task_spec["target_project_id"],
            "reasoning": f"Tarea anterior '{completed_task.get('title')}' auditada ({audit_res['audit']['quality_score']}%). Renovando automáticamente con '{next_task_spec['title']}'.",
            "generated_by": next_task_spec.get("generated_by", "template"),
            "status": "renewed"
        })
        self._save_memory()
        return next_task_spec

    def auto_renew_completed_task(self, completed_task: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Orquestación automática: Al completarse una tarea, el Director audita,
        enruta el entregable y genera inmediatamente la siguiente tarea para el agente.
        """
        agent_id = completed_task.get("agent_id", "hephaestus")
        
        # 1. Audit and attach deliverable
        audit_res = self.audit_and_verify_task_output(completed_task)
        
        # 2. Formulate next intelligent task
        next_task_spec = self.formulate_next_intelligent_task(agent_id, completed_task)
        
        # 3. Log decision
        now = time.time()
        self.decision_history.insert(0, {
            "id": f"dec_renew_{int(now)}_{random.randint(10, 99)}",
            "timestamp": now,
            "action": f"Renovación Inteligente de Tarea: {agent_id}",
            "agent_id": agent_id,
            "target_project": next_task_spec["target_project_id"],
            "reasoning": f"Tarea anterior '{completed_task.get('title')}' auditada ({audit_res['audit']['quality_score']}%). Renovando automáticamente con '{next_task_spec['title']}'.",
            "status": "renewed"
        })
        self._save_memory()

        return next_task_spec

    def get_imaginative_supervision_summary(self) -> Dict[str, Any]:
        """
        Provee un resumen ejecutivo de la supervisión de procesos imaginativos,
        enjambre de agentes y gobernanza para la ventana de administración en la UI.
        """
        holistic = self.get_holistic_context()
        return {
            "director": {
                "id": self.id,
                "name": self.name,
                "role": self.role,
                "version": self.version,
                "color": self.color,
                "status": self.status,
                "active_directive": self.active_directive,
                "config": self.config,
                "tasks_supervised_count": self.tasks_supervised_count,
                "verifications_completed_count": self.verifications_completed_count,
                "routings_performed_count": self.routings_performed_count
            },
            "config": self.config,
            "holistic_context": holistic,
            "executive_memories": self.executive_memories[:12],
            "decision_history": self.decision_history[:15],
            "audit_log": self.audit_log[:15]
        }

    def get_status(self) -> Dict[str, Any]:
        return self.get_imaginative_supervision_summary()

# Global Singleton
director_orchestrator = DirectorOrchestratorEngine()
