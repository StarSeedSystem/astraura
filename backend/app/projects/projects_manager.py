import os
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

class ProjectsManager:
    """
    Gestor de Proyectos (Propios y Automáticos) para organizar creaciones, 
    procesos imaginativos, agentes y memorias.
    """
    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or Path(__file__).resolve().parent.parent.parent / "vault" / "projects"
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.state_file = self.storage_dir / "projects_vault.json"
        
        self.projects: List[Dict[str, Any]] = []
        self._load_or_seed()

    def _load_or_seed(self):
        if self.state_file.exists():
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.projects = data.get("projects", [])
                    if self.projects:
                        return
            except Exception as e:
                print(f"[ProjectsManager] Error loading projects: {e}")

        self._seed_default_projects()
        self._save_state()

    def _seed_default_projects(self):
        now = time.time()
        self.projects = [
            {
                "id": "proj_astraura_core",
                "name": "Astraura 1.58b Core OS",
                "description": "Núcleo del sistema operativo cognitivo.",
                "type": "automatic", # "personal" or "automatic"
                "created_at": now - 86400 * 5,
                "updated_at": now,
                "linked_creations": ["creation_neon_kernel_v2", "creation_dataset_ternary_v2", "creation_spec_ontocracy_v3"],
                "linked_processes": [],
                "linked_agents": ["agent_hephaestus_forger", "agent_mnemosyne_archivist", "agent_genesis_orchestrator"],
                "linked_projects": ["proj_cyberdelic_arts"],
                "linked_personalities": ["astraura_prime"],
                "linked_cerebros": ["brain_genesis"]
            },
            {
                "id": "proj_cyberdelic_arts",
                "name": "Laboratorio Ciberdélico & Audio",
                "description": "Exploraciones artísticas, visuales y sonoras.",
                "type": "personal",
                "created_at": now - 86400 * 2,
                "updated_at": now,
                "linked_creations": ["creation_shader_cyberdelic_v3", "creation_omnico_voice_v1"],
                "linked_processes": [],
                "linked_agents": ["agent_oneiros_dreamer", "agent_hermes_messenger"],
                "linked_projects": ["proj_astraura_core"],
                "linked_personalities": ["lyra", "nova"],
                "linked_cerebros": []
            }
        ]

    def _save_state(self):
        try:
            data = {
                "projects": self.projects,
                "saved_at": time.time()
            }
            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[ProjectsManager] Error saving projects: {e}")

    def list_projects(self) -> List[Dict[str, Any]]:
        return self.projects

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        for p in self.projects:
            if p["id"] == project_id:
                return p
        return None

    def create_project(self, name: str, description: str, project_type: str = "personal") -> Dict[str, Any]:
        now = time.time()
        proj_id = f"proj_{int(now)}_{project_type[:3]}"
        new_project = {
            "id": proj_id,
            "name": name,
            "description": description,
            "type": project_type,
            "created_at": now,
            "updated_at": now,
            "linked_creations": [],
            "linked_processes": [],
            "linked_agents": [],
            "linked_projects": [],
            "linked_personalities": [],
            "linked_cerebros": []
        }
        self.projects.insert(0, new_project)
        self._save_state()
        return new_project

    def update_project(self, project_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        project = self.get_project(project_id)
        if not project:
            return None
        
        for k, v in updates.items():
            if k in ["name", "description", "type"]:
                project[k] = v
        
        project["updated_at"] = time.time()
        self._save_state()
        return project

    def link_item_to_project(self, project_id: str, item_type: str, item_id: str) -> bool:
        """
        item_type puede ser 'creation', 'process', 'agent'
        """
        project = self.get_project(project_id)
        if not project:
            return False
            
        list_key = f"linked_{item_type}s"
        if list_key not in project:
            project[list_key] = []
            
        if item_id not in project[list_key]:
            project[list_key].append(item_id)
            project["updated_at"] = time.time()
            self._save_state()
            return True
        return False

    def auto_assign_to_project(self, item_id: str, item_type: str, title: str, tags: List[str]) -> Dict[str, Any]:
        """
        Daedalus-Architect Agent Routing Logic:
        Analiza inteligentemente a qué proyecto automático enlazar el elemento.
        Si no hay coincidencia clara, crea un nuevo proyecto automático y establece vínculos de grafo 3D.
        """
        text_corpus = (title + " " + " ".join(tags)).lower()
        
        best_match = None
        best_score = 0
        
        # Daedalus evaluates existing automatic projects
        for p in self.projects:
            if p.get("type") == "automatic":
                p_text = (p.get("name", "") + " " + p.get("description", "")).lower()
                score = sum(1 for word in text_corpus.split() if len(word) > 3 and word in p_text)
                if score > best_score:
                    best_score = score
                    best_match = p["id"]
                    
        decision_log = {
            "agent": "Daedalus-Architect",
            "action": "",
            "project_id": "",
            "message": ""
        }

        if best_match and best_score > 0:
            self.link_item_to_project(best_match, item_type, item_id)
            # Daedalus proactively links the orchestrator agent to the updated project
            self.link_item_to_project(best_match, "agent", "daedalus")
            decision_log["action"] = "routed"
            decision_log["project_id"] = best_match
            decision_log["message"] = f"Daedalus enrutó el {item_type} al proyecto existente."
            return decision_log
            
        # Si no hay match, Daedalus crea uno nuevo basado en el tag principal o el título
        main_tag = tags[0] if tags else "General"
        new_proj_name = f"Proyecto Automático: {main_tag.capitalize()}"
        new_proj = self.create_project(
            name=new_proj_name,
            description=f"Proyecto orquestado por Daedalus para agrupar creaciones sobre {main_tag}.",
            project_type="automatic"
        )
        
        # Vincular el nuevo item y auto-asignar a Daedalus como agente vinculado
        self.link_item_to_project(new_proj["id"], item_type, item_id)
        self.link_item_to_project(new_proj["id"], "agent", "daedalus")
        
        # Cross-linking (Grafo 3D interconexiones aleatorias o temáticas simuladas)
        if self.projects and len(self.projects) > 1:
            # Enlazar al proyecto core para mantener la cohesión del grafo
            self.link_item_to_project(new_proj["id"], "project", "proj_astraura_core")
        
        decision_log["action"] = "created_and_routed"
        decision_log["project_id"] = new_proj["id"]
        decision_log["message"] = f"Daedalus forjó un nuevo proyecto y vinculó el {item_type}."
        return decision_log

# Singleton
projects_manager = ProjectsManager()
