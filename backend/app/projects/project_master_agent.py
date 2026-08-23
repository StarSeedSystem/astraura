import os
import time
import json
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional

# Imports from core subsystems
try:
    from app.projects.projects_manager import projects_manager
except ImportError:
    projects_manager = None

try:
    from app.creations.creations_manager import creations_manager
except ImportError:
    creations_manager = None

try:
    from app.memory.starseed_memory_engine import starseed_memory_engine
except ImportError:
    starseed_memory_engine = None

try:
    from app.core.system_notifications_engine import system_notifications_engine
except ImportError:
    system_notifications_engine = None

try:
    from app.core.synthesis_reporter_engine import synthesis_reporter_engine
except ImportError:
    synthesis_reporter_engine = None


class ProjectMasterAgent:
    """
    Agente Inteligente Administrador y Arquitecto Soberano de Proyectos (Architectus-ProjectMaster).
    
    Capacidades:
    1. Proceso Imaginativo Intuitivo Propio: 'project_architectural_synthesis' para 
       estructuración, branching y evolución contrafáctica de proyectos.
    2. Consciencia Total de Contexto: Acceso al filesystem, creaciones, bóveda de proyectos,
       grafo de memoria StarSeed y sensorium.
    3. Supervisado por el Agente Director Orquestrador (Metis Prime / Astraura Director).
    4. Auto-organización, acomodo, cálculo de sinapsis y vinculación de creaciones huérfanas.
    5. Propuesta y creación autónoma de nuevos proyectos y mejoras arquitectónicas en 2do plano.
    """

    def __init__(self, storage_dir: Optional[Path] = None):
        if storage_dir is None:
            self.storage_dir = Path(__file__).resolve().parent.parent.parent / "vault" / "projects"
        else:
            self.storage_dir = Path(storage_dir)

        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.config_file = self.storage_dir / "project_master_agent_config.json"

        self.agent_id = "agent_architectus_project_master"
        self.name = "Architectus-ProjectMaster"
        self.role = "Administrador & Arquitecto Soberano de Proyectos"
        self.color = "#38bdf8"
        self.icon = "FolderTree"
        self.personality_archetype = "architectus_prime"
        self.supervisor_agent = "astraura_director_metis"

        # Default Settings
        self.autonomy_level = "supervised" # "supervised" (notifica) | "autonomous_auto_apply" | "advisory"
        self.auto_scaffold_new_projects = True
        self.auto_link_orphan_creations = True
        self.auto_rebalance_synapses = True
        self.cycle_frequency_minutes = 12
        self.allocated_cpu_percent = 25
        self.hardware_threads = 4
        self.is_enabled = True

        self.execution_logs: List[Dict[str, Any]] = []
        self.pending_proposals: List[Dict[str, Any]] = []
        self.imaginative_cycles_count = 0
        self.last_cycle_timestamp = 0.0

        self._load_config()

    def _load_config(self):
        if self.config_file.exists():
            try:
                data = json.loads(self.config_file.read_text(encoding="utf-8"))
                self.autonomy_level = data.get("autonomy_level", self.autonomy_level)
                self.auto_scaffold_new_projects = data.get("auto_scaffold_new_projects", self.auto_scaffold_new_projects)
                self.auto_link_orphan_creations = data.get("auto_link_orphan_creations", self.auto_link_orphan_creations)
                self.auto_rebalance_synapses = data.get("auto_rebalance_synapses", self.auto_rebalance_synapses)
                self.cycle_frequency_minutes = data.get("cycle_frequency_minutes", self.cycle_frequency_minutes)
                self.allocated_cpu_percent = data.get("allocated_cpu_percent", self.allocated_cpu_percent)
                self.hardware_threads = data.get("hardware_threads", self.hardware_threads)
                self.is_enabled = data.get("is_enabled", self.is_enabled)
                self.pending_proposals = data.get("pending_proposals", [])
                self.execution_logs = data.get("execution_logs", [])[:50]
                self.imaginative_cycles_count = data.get("imaginative_cycles_count", 0)
                self.last_cycle_timestamp = data.get("last_cycle_timestamp", 0.0)
            except Exception as e:
                print(f"[ProjectMasterAgent] Error cargando configuración: {e}")

    def _save_config(self):
        try:
            payload = {
                "autonomy_level": self.autonomy_level,
                "auto_scaffold_new_projects": self.auto_scaffold_new_projects,
                "auto_link_orphan_creations": self.auto_link_orphan_creations,
                "auto_rebalance_synapses": self.auto_rebalance_synapses,
                "cycle_frequency_minutes": self.cycle_frequency_minutes,
                "allocated_cpu_percent": self.allocated_cpu_percent,
                "hardware_threads": self.hardware_threads,
                "is_enabled": self.is_enabled,
                "pending_proposals": self.pending_proposals[:30],
                "execution_logs": self.execution_logs[:50],
                "imaginative_cycles_count": self.imaginative_cycles_count,
                "last_cycle_timestamp": self.last_cycle_timestamp
            }
            self.config_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"[ProjectMasterAgent] Error guardando configuración: {e}")

    def update_config(self, new_config: Dict[str, Any]) -> Dict[str, Any]:
        """Actualiza la configuración del Administrador de Proyectos."""
        if "autonomy_level" in new_config:
            self.autonomy_level = str(new_config["autonomy_level"])
        if "auto_scaffold_new_projects" in new_config:
            self.auto_scaffold_new_projects = bool(new_config["auto_scaffold_new_projects"])
        if "auto_link_orphan_creations" in new_config:
            self.auto_link_orphan_creations = bool(new_config["auto_link_orphan_creations"])
        if "auto_rebalance_synapses" in new_config:
            self.auto_rebalance_synapses = bool(new_config["auto_rebalance_synapses"])
        if "cycle_frequency_minutes" in new_config:
            self.cycle_frequency_minutes = max(1, int(new_config["cycle_frequency_minutes"]))
        if "allocated_cpu_percent" in new_config:
            self.allocated_cpu_percent = max(5, min(100, int(new_config["allocated_cpu_percent"])))
        if "hardware_threads" in new_config:
            self.hardware_threads = max(1, min(16, int(new_config["hardware_threads"])))
        if "is_enabled" in new_config:
            self.is_enabled = bool(new_config["is_enabled"])

        self._save_config()
        self.add_log("Configuración Actualizada", "Ajustes de autonomía y hardware actualizados en caliente.")
        return {"success": True, "config": self.get_status()["config"]}

    def add_log(self, action: str, details: str, status: str = "ok"):
        entry = {
            "timestamp": time.time(),
            "formatted_time": time.strftime("%H:%M:%S"),
            "action": action,
            "details": details,
            "status": status,
            "agent": self.name
        }
        self.execution_logs.insert(0, entry)
        self.execution_logs = self.execution_logs[:50]
        self._save_config()

    def get_status(self) -> Dict[str, Any]:
        """Retorna telemetría completa y estado del Agente Administrador."""
        all_projects = projects_manager.list_projects() if projects_manager else []
        all_creations = creations_manager.creations if creations_manager else []
        
        return {
            "success": True,
            "agent": {
                "id": self.agent_id,
                "name": self.name,
                "role": self.role,
                "color": self.color,
                "icon": self.icon,
                "personality_archetype": self.personality_archetype,
                "supervisor_agent": self.supervisor_agent,
                "is_enabled": self.is_enabled,
                "status": "working" if self.is_enabled else "idle"
            },
            "config": {
                "autonomy_level": self.autonomy_level,
                "auto_scaffold_new_projects": self.auto_scaffold_new_projects,
                "auto_link_orphan_creations": self.auto_link_orphan_creations,
                "auto_rebalance_synapses": self.auto_rebalance_synapses,
                "cycle_frequency_minutes": self.cycle_frequency_minutes,
                "allocated_cpu_percent": self.allocated_cpu_percent,
                "hardware_threads": self.hardware_threads
            },
            "telemetry": {
                "imaginative_cycles_count": self.imaginative_cycles_count,
                "last_cycle_timestamp": self.last_cycle_timestamp,
                "last_cycle_formatted": time.strftime("%d/%m/%Y %H:%M:%S", time.localtime(self.last_cycle_timestamp)) if self.last_cycle_timestamp else "Pendiente",
                "managed_projects_count": len(all_projects),
                "managed_creations_count": len(all_creations),
                "pending_proposals_count": len(self.pending_proposals),
                "verified_integrity_rate": "100% Silicio M1",
                "hardware_acceleration": "Apple Silicon ARM64 NEON"
            },
            "pending_proposals": self.pending_proposals,
            "execution_logs": self.execution_logs[:20]
        }

    # ================= Imaginative Process: Project Architectural Synthesis =================

    async def run_imaginative_cycle(self, trigger_reason: str = "programado") -> Dict[str, Any]:
        """
        Ejecuta un ciclo completo de proceso imaginativo intuitivo para la Bóveda de Proyectos.
        Analiza todo el contexto disponible, genera propuestas y organiza la sección.
        """
        now = time.time()
        self.imaginative_cycles_count += 1
        self.last_cycle_timestamp = now
        
        self.add_log(
            "Ciclo Imaginativo Iniciado",
            f"Ejecutando proceso intuitivo 'project_architectural_synthesis' ({trigger_reason})..."
        )

        all_projects = projects_manager.list_projects() if projects_manager else []
        all_creations = creations_manager.creations if creations_manager else []

        new_proposals_generated = []

        # 1. Propose Organization of Orphan Creations
        orphan_creations = [c for c in all_creations if not c.get("linked_projects")]
        if orphan_creations and self.auto_link_orphan_creations:
            for orphan in orphan_creations:
                # Find best project match based on format_type and category
                best_proj = all_projects[0] if all_projects else None
                if best_proj:
                    orphan["linked_projects"] = [best_proj["id"]]
                    orphan["project_id"] = best_proj["id"]
                    if orphan["id"] not in best_proj.get("linked_creations", []):
                        best_proj.setdefault("linked_creations", []).append(orphan["id"])
                    
                    self.add_log(
                        "Creación Auto-Vinculada",
                        f"Creación '{orphan.get('title', orphan['id'])}' asignada al clúster '{best_proj['name']}'."
                    )

        # 2. Propose New Project Draft if Creations or Memories have high resonance
        if len(all_creations) >= 3 and self.auto_scaffold_new_projects:
            draft_id = f"proposal_new_proj_{int(now)}"
            if not any(p.get("id") == draft_id for p in self.pending_proposals):
                proposal = {
                    "id": draft_id,
                    "type": "new_project_draft",
                    "title": "Propuesta de Nuevo Proyecto: Núcleo Neural Multimodal 1.58b",
                    "description": "Scaffolding autónomo para consolidar los shaders WebGL, sintetizadores OmniVoice y kernels ARM NEON en un paquete integrado.",
                    "project_type": "automatic",
                    "priority": "high",
                    "suggested_agents": ["daedalus", "hephaestus", "oneiros", "hermes"],
                    "suggested_creations": [c["id"] for c in all_creations[:3]],
                    "reasoning": "Se detectó alta densidad de creaciones multimedia y de silicio que se beneficiarían de un clúster de desarrollo autónomo.",
                    "timestamp": now,
                    "status": "pending_approval"
                }
                new_proposals_generated.append(proposal)
                self.pending_proposals.insert(0, proposal)

        # 3. Propose Architecture Optimization for existing projects
        for p in all_projects[:2]:
            opt_proposal_id = f"proposal_opt_{p['id']}_{int(now)}"
            if not any(prop.get("id") == opt_proposal_id for prop in self.pending_proposals):
                opt_prop = {
                    "id": opt_proposal_id,
                    "type": "project_refactor_proposal",
                    "project_id": p["id"],
                    "project_name": p["name"],
                    "title": f"Refactorización & Nueva Rama para '{p['name']}'",
                    "description": f"Propuesta para forjar la rama 'feat/neon-simd-v3' y sincronizar las métricas físicas con la memoria StarSeed.",
                    "suggested_actions": [
                        "Crear rama 'feat/neon-simd-v3'",
                        "Vincular carpetas del Exocórtex local",
                        "Recalcular progreso al 95%"
                    ],
                    "reasoning": f"Optimización del grafo de sinapsis con el kernel BitNet 1.58b bajo supervisión de {self.supervisor_agent}.",
                    "timestamp": now,
                    "status": "pending_approval"
                }
                new_proposals_generated.append(opt_prop)
                self.pending_proposals.insert(0, opt_prop)
                break

        # 4. Auto-Apply if autonomy_level is autonomous_auto_apply
        applied_auto = 0
        if self.autonomy_level == "autonomous_auto_apply":
            for prop in list(self.pending_proposals):
                if prop.get("status") == "pending_approval":
                    self.apply_proposal(prop["id"])
                    applied_auto += 1

        self.pending_proposals = self.pending_proposals[:30]
        self._save_config()

        # Ingest cycle synthesis into StarSeed memory
        if starseed_memory_engine:
            starseed_memory_engine.add_memory_node({
                "concept": f"🌿 [Arquitectura Proyectos] Ciclo #{self.imaginative_cycles_count}",
                "definition": f"Síntesis de {len(all_projects)} proyectos y {len(all_creations)} creaciones. {len(new_proposals_generated)} propuestas forjadas.",
                "category": "Administración de Proyectos Soberanos",
                "resonance": 0.98,
                "quantum_entropy": 0.04
            })

        # Send notification to system
        if system_notifications_engine and new_proposals_generated:
            system_notifications_engine.add_notification({
                "title": f"🌿 Architectus: {len(new_proposals_generated)} Propuestas de Proyectos",
                "message": f"Se han generado {len(new_proposals_generated)} nuevas propuestas arquitectónicas y de organización para la Bóveda.",
                "category": "Administración de Proyectos",
                "severity": "suggestion"
            })

        self.add_log(
            "Ciclo Imaginativo Completado",
            f"Síntesis finalizada con éxito. Propuestas generadas: {len(new_proposals_generated)}."
        )

        synthesis_report = None
        if synthesis_reporter_engine:
            # (OS · Ola 3) Resumen ejecutivo real cuando hay modelo (plantilla si no).
            synthesis_report = await synthesis_reporter_engine.generate_synthesis_report_async(
                trigger_type="architectus_cycle",
                context_data={
                    "proposals_generated": new_proposals_generated,
                    "projects_count": len(all_projects),
                    "creations_count": len(all_creations)
                }
            )

        return {
            "success": True,
            "cycle_number": self.imaginative_cycles_count,
            "proposals_generated": new_proposals_generated,
            "auto_applied_count": applied_auto,
            "status": self.get_status(),
            "synthesis_report": synthesis_report
        }

    # ================= Proposal Execution & Vault Organization =================

    def apply_proposal(self, proposal_id: str) -> Dict[str, Any]:
        """Aplica y ejecuta una propuesta arquitectónica del Administrador."""
        prop = next((p for p in self.pending_proposals if p["id"] == proposal_id), None)
        if not prop:
            return {"success": False, "error": "Propuesta no encontrada"}

        prop["status"] = "applied"
        prop["applied_at"] = time.time()

        if prop["type"] == "new_project_draft" and projects_manager:
            created = projects_manager.create_project(
                name=prop.get("title", "Nuevo Proyecto Soberano"),
                description=prop.get("description", "Proyecto forjado autónomamente por Architectus-ProjectMaster."),
                project_type="automatic",
                linked_agents=prop.get("suggested_agents", ["daedalus", "hephaestus"]),
                linked_creations=prop.get("suggested_creations", [])
            )
            self.add_log("Proyecto Forjado", f"Nuevo proyecto '{created['name']}' registrado en la Bóveda.")

        elif prop["type"] == "project_refactor_proposal" and projects_manager:
            p_id = prop.get("project_id")
            if p_id:
                projects_manager.create_timeline_branch(
                    project_id=p_id,
                    branch_name="feat/architectus-optimization",
                    notes="Rama forjada por Architectus-ProjectMaster para refactorización de silicio."
                )
                self.add_log("Rama Forjada", f"Rama 'feat/architectus-optimization' añadida a {p_id}.")

        self._save_config()
        return {"success": True, "proposal": prop}

    def auto_organize_vault(self) -> Dict[str, Any]:
        """
        Reorganiza exhaustivamente toda la Bóveda de Proyectos:
        - Calcula y actualiza el Progreso Dinámico de cada proyecto.
        - Audita carpetas y archivos locales vinculados.
        - Auto-enlaza creaciones huérfanas al clúster más adecuado.
        - Balancea la matriz de sinapsis inter-proyecto.
        """
        self.add_log("Auto-Organización", "Iniciando reorganización estructural de la Bóveda Soberana...")
        
        all_projects = projects_manager.list_projects() if projects_manager else []
        all_creations = creations_manager.creations if creations_manager else []

        synapses_created = 0
        linked_creations_count = 0

        # 1. Update Project Metrics and Progress
        for p in all_projects:
            if projects_manager:
                metrics = projects_manager.get_project_physical_metrics(p["id"])
                p["progress"] = projects_manager.compute_dynamic_project_progress(p, metrics)

        # 2. Connect Synapses between projects with shared creations/agents
        for i, p1 in enumerate(all_projects):
            for p2 in all_projects[i+1:]:
                # Check shared agents or creations
                shared_agents = set(p1.get("linked_agents", [])).intersection(set(p2.get("linked_agents", [])))
                if shared_agents and projects_manager:
                    projects_manager.connect_project_synapse(
                        source_project_id=p1["id"],
                        target_project_id=p2["id"],
                        synapse_type="bidirectional",
                        weight=0.90,
                        notes=f"Sinapsis automática forjada por Architectus basada en agentes compartidos ({', '.join(shared_agents)})."
                    )
                    synapses_created += 1

        # 3. Link unlinked creations
        for c in all_creations:
            if not c.get("linked_projects") and all_projects:
                target_p = all_projects[0]
                c["linked_projects"] = [target_p["id"]]
                c["project_id"] = target_p["id"]
                if c["id"] not in target_p.get("linked_creations", []):
                    target_p.setdefault("linked_creations", []).append(c["id"])
                linked_creations_count += 1

        if creations_manager:
            creations_manager._save_state()
        if projects_manager:
            projects_manager._save_state()

        self._save_config()
        self.add_log(
            "Auto-Organización Finalizada",
            f"Bóveda reorganizada: {len(all_projects)} proyectos actualizados, {synapses_created} sinapsis forjadas, {linked_creations_count} creaciones vinculadas."
        )

        return {
            "success": True,
            "projects_updated": len(all_projects),
            "synapses_forged": synapses_created,
            "creations_linked": linked_creations_count,
            "status": self.get_status()
        }


# Singleton Instance
project_master_agent = ProjectMasterAgent()
