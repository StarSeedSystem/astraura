import os
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from ..memory.starseed_memory_engine import starseed_memory_engine
from ..memory.openviking_engine import openviking_memory

class ProjectVaultManager:
    """
    Gestor de Proyectos Multifacéticos y Desarrollos de Software para Astraura (StarSeed OS).
    Permite:
      1. Crear, guardar y versionar proyectos multi-archivo desarrollados en el chat.
      2. Vincular carpetas y archivos locales del sistema (/Users/alex/...).
      3. Exportar proyectos completos directamente al disco local en cualquier ruta o como ZIP.
      4. Registrar memorias y recuerdos inteligentes automáticos en StarSeed OS y OpenViking.
    """
    def __init__(self, vault_dir: Optional[Path] = None):
        self.vault_dir = vault_dir or Path(__file__).resolve().parent.parent.parent / "data" / "projects_vault"
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        self.projects_index_file = self.vault_dir / "projects_manifest.json"
        self.projects: List[Dict[str, Any]] = []
        self._load_projects()

    def _load_projects(self):
        if self.projects_index_file.exists():
            try:
                self.projects = json.loads(self.projects_index_file.read_text(encoding="utf-8"))
            except Exception as e:
                print(f"[ProjectVaultManager] Error loading index: {e}")
                self.projects = []
        else:
            self._create_seed_projects()

    def _create_seed_projects(self):
        self.projects = [
            {
                "id": "proj_genesis_158b",
                "name": "Astraura 1.58b Core Engine",
                "description": "Núcleo de computación ternaria y orquestación multiagéntica cuántica.",
                "language": "python",
                "category": "Cognitive System",
                "persona_id": "astraura_prime",
                "brain_id": "cerebro_genesis",
                "created_at": time.time() - 86400,
                "updated_at": time.time(),
                "linked_folder": "/Users/alex/Documents/IA 1.58 bit",
                "files": [
                    {
                        "filename": "main.py",
                        "path": "backend/app/main.py",
                        "language": "python",
                        "content": "# Servidor FastAPI y Rutas Cognitivas 1.58b\nimport asyncio\nprint('Astraura Online')\n"
                    },
                    {
                        "filename": "App.jsx",
                        "path": "frontend/src/App.jsx",
                        "language": "javascript",
                        "content": "// Interfaz Soberana StarSeed OS\nimport React from 'react';\n"
                    },
                    {
                        "filename": "README.md",
                        "path": "README.md",
                        "language": "markdown",
                        "content": "# Astraura 1.58-Bit\nEcosistema cognitivo ontocrático y multiagéntico.\n"
                    }
                ],
                "tags": ["1.58b", "StarSeed", "BitNet", "React", "FastAPI"]
            }
        ]
        self._save_index()

    def _save_index(self):
        try:
            self.projects_index_file.write_text(json.dumps(self.projects, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"[ProjectVaultManager] Error saving manifest: {e}")

    def list_projects(self) -> List[Dict[str, Any]]:
        return self.projects

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        for p in self.projects:
            if p["id"] == project_id:
                return p
        return None

    def save_project(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Saves or updates a project and triggers intelligent memory creation.
        """
        proj_id = project_data.get("id") or f"proj_{int(time.time())}"
        now = time.time()
        
        # Prepare files
        files = project_data.get("files", [])
        if not files and "code" in project_data:
            ext = project_data.get("language", "js")
            filename = f"index.{ext}" if ext in ["html", "js", "css"] else f"main.{ext}"
            files = [{
                "filename": filename,
                "path": filename,
                "language": project_data.get("language", "javascript"),
                "content": project_data.get("code", "")
            }]

        proj_record = {
            "id": proj_id,
            "name": project_data.get("name") or f"Desarrollo_{int(time.time())}",
            "description": project_data.get("description", "Proyecto desarrollado interactivamente en Astraura."),
            "language": project_data.get("language", "javascript"),
            "category": project_data.get("category", "Software Development"),
            "persona_id": project_data.get("persona_id", "astraura_prime"),
            "brain_id": project_data.get("brain_id", "cerebro_genesis"),
            "linked_folder": project_data.get("linked_folder", ""),
            "created_at": project_data.get("created_at", now),
            "updated_at": now,
            "files": files,
            "tags": project_data.get("tags", ["Chat Dev", "1.58b"])
        }

        # Update or insert
        idx = next((i for i, p in enumerate(self.projects) if p["id"] == proj_id), None)
        if idx is not None:
            self.projects[idx] = proj_record
        else:
            self.projects.insert(0, proj_record)

        self._save_index()

        # ================= INTELLIGENT AUTOMATIC MEMORY & RECALL =================
        try:
            # 1. Add to StarSeed Memory Documents
            doc_name = f"Proyecto // {proj_record['name']}"
            files_summary = ", ".join([f["filename"] for f in files[:5]])
            doc_md = (
                f"# [[{proj_record['name']}]]\n\n"
                f"**ID del Proyecto**: `{proj_id}`\n"
                f"**Lenguaje Principal**: `{proj_record['language']}`\n"
                f"**Personalidad Vinculada**: `{proj_record['persona_id']}`\n"
                f"**Archivos**: {files_summary}\n\n"
                f"### Propósito & Arquitectura\n"
                f"{proj_record['description']}\n\n"
                f"### Registro de Memoria Automático\n"
                f"Desarrollado en tiempo real en la sesión de chat con el usuario Alex Bordón Garrigós.\n"
            )

            starseed_memory_engine.create_or_update_document({
                "id": f"mem_proj_{proj_id}",
                "name": doc_name,
                "branch": "skills",
                "category": "Proyectos & Código",
                "markdown": doc_md,
                "tags": ["Proyecto", proj_record["language"], "Auto-Memoria"]
            })

            # 2. Add to OpenViking Working Memory
            openviking_memory.add_working_item(
                f"🚀 Proyecto guardado y recordado: '{proj_record['name']}' ({len(files)} archivos, {proj_record['language']})"
            )
        except Exception as e:
            print(f"[ProjectVaultManager] Memory registration notice: {e}")

        return proj_record

    def export_project_to_disk(self, project_id: str, target_directory: str) -> Dict[str, Any]:
        """
        Exports all project files to a real directory on the local filesystem.
        """
        proj = self.get_project(project_id)
        if not proj:
            return {"success": False, "error": f"Project {project_id} not found."}

        target_dir = Path(target_directory)
        target_dir.mkdir(parents=True, exist_ok=True)

        exported_files = []
        for f in proj.get("files", []):
            rel_path = f.get("path") or f.get("filename")
            file_dest = target_dir / rel_path
            file_dest.parent.mkdir(parents=True, exist_ok=True)
            file_dest.write_text(f.get("content", ""), encoding="utf-8")
            exported_files.append(str(file_dest))

        return {
            "success": True,
            "project_name": proj["name"],
            "target_directory": str(target_dir),
            "files_count": len(exported_files),
            "files": exported_files
        }

    def scan_and_link_local_folder(self, folder_path: str) -> Dict[str, Any]:
        """
        Reads local folder files to link with an interactive development session.
        """
        p = Path(folder_path).expanduser().resolve()
        if not p.exists() or not p.is_dir():
            return {"success": False, "error": f"Directory '{folder_path}' does not exist."}

        loaded_files = []
        valid_exts = [".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json", ".md", ".sh", ".c", ".cpp", ".rs", ".sql"]

        try:
            for root, dirs, files in os.walk(p):
                # ignore hidden and node_modules
                dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ["node_modules", "__pycache__", "dist", "build"]]
                for f in files:
                    ext = Path(f).suffix.lower()
                    if ext in valid_exts:
                        full_f = Path(root) / f
                        if full_f.stat().st_size < 150000: # max 150KB per file
                            try:
                                content = full_f.read_text(encoding="utf-8", errors="ignore")
                                rel = full_f.relative_to(p)
                                lang = ext.replace(".", "")
                                if lang in ["jsx", "tsx"]: lang = "javascript"
                                loaded_files.append({
                                    "filename": f,
                                    "path": str(rel),
                                    "language": lang,
                                    "size_bytes": full_f.stat().st_size,
                                    "content": content
                                })
                            except Exception:
                                pass
                        if len(loaded_files) >= 50:
                            break
                if len(loaded_files) >= 50:
                    break
        except Exception as e:
            return {"success": False, "error": str(e)}

        return {
            "success": True,
            "folder_path": str(p),
            "total_files": len(loaded_files),
            "files": loaded_files
        }

project_vault_manager = ProjectVaultManager()
