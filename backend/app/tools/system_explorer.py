import os
import stat
import mimetypes
import subprocess
import platform
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Optional
import pypdf

class SystemExplorer:
    """
    Computer-wide file system explorer and indexing utility.
    Allows navigating, inspecting, reading, and indexing any accessible directory 
    or drive on the computer (e.g. /Users/alex, /, /Volumes, external storage).
    """
    def __init__(self, default_root: Optional[str] = None):
        self.home_dir = Path.home()
        self.current_root = Path(default_root) if default_root else self.home_dir

    def list_directory(self, target_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Lists files and subdirectories for any path on the computer.
        """
        path = Path(target_path).expanduser().resolve() if target_path else self.home_dir
        
        if not path.exists():
            return {
                "success": False,
                "error": f"El directorio no existe: {str(path)}",
                "path": str(path),
                "items": []
            }

        if not path.is_dir():
            return {
                "success": False,
                "error": f"La ruta especificada es un archivo, no un directorio: {str(path)}",
                "path": str(path),
                "items": []
            }

        items = []
        try:
            # Common shortcuts
            shortcuts = [
                {"name": "Home (~)", "path": str(self.home_dir)},
                {"name": "Documentos", "path": str(self.home_dir / "Documents")},
                {"name": "Descargas", "path": str(self.home_dir / "Downloads")},
                {"name": "Escritorio", "path": str(self.home_dir / "Desktop")},
                {"name": "Raíz del Sistema (/)", "path": "/"},
                {"name": "Volúmenes (/Volumes)", "path": "/Volumes"}
            ]

            # Generate breadcrumbs
            parts = list(path.parts)
            breadcrumbs = []
            curr_build = ""
            for p in parts:
                if p == "/":
                    curr_build = "/"
                else:
                    curr_build = os.path.join(curr_build, p)
                breadcrumbs.append({"name": p if p != "/" else "Root", "path": curr_build})

            for entry in os.scandir(path):
                # Skip hidden files in top views unless requested
                is_hidden = entry.name.startswith(".")
                try:
                    entry_stat = entry.stat(follow_symlinks=False)
                    is_directory = stat.S_ISDIR(entry_stat.st_mode)
                    size_bytes = entry_stat.st_size if not is_directory else None
                    readable = os.access(entry.path, os.R_OK)
                    writable = os.access(entry.path, os.W_OK)
                    
                    mime, _ = mimetypes.guess_type(entry.name)
                    extension = Path(entry.name).suffix.lower()

                    items.append({
                        "name": entry.name,
                        "path": entry.path,
                        "is_dir": is_directory,
                        "is_hidden": is_hidden,
                        "size_bytes": size_bytes,
                        "size_formatted": self._format_size(size_bytes) if size_bytes is not None else "Directorio",
                        "extension": extension,
                        "mime_type": mime or ("directory" if is_directory else "unknown"),
                        "readable": readable,
                        "writable": writable,
                        "modified_timestamp": entry_stat.st_mtime
                    })
                except (PermissionError, FileNotFoundError):
                    items.append({
                        "name": entry.name,
                        "path": entry.path,
                        "is_dir": True,
                        "is_hidden": is_hidden,
                        "size_bytes": None,
                        "size_formatted": "Sin acceso",
                        "extension": "",
                        "mime_type": "restricted",
                        "readable": False,
                        "writable": False,
                        "modified_timestamp": 0
                    })

            # Sort: directories first, then files alphabetically
            items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))

            return {
                "success": True,
                "current_path": str(path),
                "parent_path": str(path.parent) if path.parent != path else None,
                "breadcrumbs": breadcrumbs,
                "shortcuts": shortcuts,
                "total_items": len(items),
                "items": items
            }
        except PermissionError:
            return {
                "success": False,
                "error": f"Permiso denegado al acceder a: {str(path)}",
                "current_path": str(path),
                "items": []
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "current_path": str(path),
                "items": []
            }

    def read_file_content(self, file_path: str, max_chars: int = 50000) -> Dict[str, Any]:
        """
        Reads text or PDF content from any file on the system.
        """
        p = Path(file_path).expanduser().resolve()
        if not p.exists():
            return {"success": False, "error": f"Archivo no encontrado: {file_path}"}
        if not p.is_file():
            return {"success": False, "error": f"La ruta no es un archivo: {file_path}"}
        if not os.access(p, os.R_OK):
            return {"success": False, "error": f"Sin permisos de lectura para: {file_path}"}

        try:
            suffix = p.suffix.lower()
            if suffix == ".pdf":
                reader = pypdf.PdfReader(str(p))
                text_parts = []
                for i, page in enumerate(reader.pages):
                    pt = page.extract_text() or ""
                    text_parts.append(f"[Página {i+1}]\n{pt}")
                content = "\n\n".join(text_parts)
            else:
                try:
                    with open(p, "r", encoding="utf-8", errors="replace") as f:
                        content = f.read(max_chars)
                except Exception:
                    with open(p, "r", encoding="latin-1", errors="replace") as f:
                        content = f.read(max_chars)

            return {
                "success": True,
                "path": str(p),
                "filename": p.name,
                "size_bytes": p.stat().st_size,
                "size_formatted": self._format_size(p.stat().st_size),
                "extension": suffix,
                "content": content,
                "truncated": len(content) >= max_chars
            }
        except Exception as e:
            return {"success": False, "error": f"Error al leer archivo: {str(e)}"}

    def search_files(self, root_path: str, query: str, max_results: int = 40) -> Dict[str, Any]:
        """
        Searches for files by name matching query across any folder.
        """
        root = Path(root_path).expanduser().resolve()
        if not root.exists() or not root.is_dir():
            return {"success": False, "error": "Ruta de búsqueda inválida"}

        q_lower = query.lower()
        results = []
        
        try:
            for dirpath, dirnames, filenames in os.walk(root):
                # Skip heavy directories
                if any(ignored in dirpath for ignored in [".git", "node_modules", ".Trash", "Library/Caches"]):
                    continue
                for f in filenames:
                    if q_lower in f.lower():
                        full_path = os.path.join(dirpath, f)
                        try:
                            st = os.stat(full_path)
                            results.append({
                                "name": f,
                                "path": full_path,
                                "size_bytes": st.st_size,
                                "size_formatted": self._format_size(st.st_size),
                                "modified_timestamp": st.st_mtime
                            })
                            if len(results) >= max_results:
                                break
                        except Exception:
                            pass
                if len(results) >= max_results:
                    break

            return {
                "success": True,
                "query": query,
                "root_searched": str(root),
                "results_count": len(results),
                "results": results
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def open_native_path(self, target_path: str, reveal: bool = True) -> Dict[str, Any]:
        """
        Abre o revela el archivo/carpeta en el explorador de archivos nativo del sistema operativo (Finder en macOS).
        """
        try:
            p = Path(target_path).expanduser().resolve()
            if not p.exists():
                # If path does not exist, try finding workspace relative path
                workspace_p = (Path("/Users/alex/Documents/IA 1.58 bit") / target_path).resolve()
                if workspace_p.exists():
                    p = workspace_p
                else:
                    # Fallback to nearest existing parent
                    parent = p.parent
                    while not parent.exists() and parent != parent.parent:
                        parent = parent.parent
                    p = parent if parent.exists() else self.home_dir

            system_name = platform.system()
            if system_name == "Darwin":  # macOS
                if reveal and p.is_file():
                    subprocess.Popen(["open", "-R", str(p)])
                else:
                    subprocess.Popen(["open", str(p)])
            elif system_name == "Windows":
                if reveal and p.is_file():
                    subprocess.Popen(["explorer", "/select,", str(p)])
                else:
                    os.startfile(str(p))
            else:  # Linux / Unix
                subprocess.Popen(["xdg-open", str(p if p.is_dir() else p.parent)])

            return {
                "success": True,
                "path": str(p),
                "original_requested": target_path,
                "system": system_name,
                "message": f"Abierto en el gestor nativo del sistema ({system_name})"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"No se pudo abrir la ruta nativa: {str(e)}",
                "path": target_path
            }

    def get_item_details(self, target_path: str) -> Dict[str, Any]:
        """
        Obtiene información completa para visualización in-app (previsualización, código, SHA-256, hijos si es carpeta).
        """
        try:
            p = Path(target_path).expanduser().resolve()
            if not p.exists():
                workspace_p = (Path("/Users/alex/Documents/IA 1.58 bit") / target_path).resolve()
                if workspace_p.exists():
                    p = workspace_p
                else:
                    return {
                        "success": False,
                        "exists": False,
                        "path": str(p),
                        "error": f"Ruta no encontrada en disco: {target_path}"
                    }

            is_dir = p.is_dir()
            stat_info = p.stat()

            # Breadcrumbs
            parts = list(p.parts)
            breadcrumbs = []
            curr_build = ""
            for pt in parts:
                curr_build = "/" if pt == "/" else os.path.join(curr_build, pt)
                breadcrumbs.append({"name": pt if pt != "/" else "Raíz", "path": curr_build})

            # Storage tier categorization
            path_str = str(p)
            storage_tier = "Host Local (Apple Silicon M1)"
            if "vault/memories" in path_str:
                storage_tier = "🧠 StarSeed Memory Vault (Bóveda Sináptica)"
            elif "vault/projects" in path_str:
                storage_tier = "📁 Bóveda Soberana de Proyectos"
            elif "vault/artifacts" in path_str:
                storage_tier = "⚡ Bóveda de Artefactos de Agentes"
            elif "vault/creations" in path_str:
                storage_tier = "🎨 Bóveda de Creaciones & Shaders"
            elif "data/research" in path_str:
                storage_tier = "🌐 Exocórtex de Investigación arXiv"
            elif "backend/app" in path_str:
                storage_tier = "🛠️ Kernel & Backend Engine"
            elif "frontend/src" in path_str:
                storage_tier = "🖥️ Interfaz Soberana (React / WebGL)"

            if is_dir:
                dir_res = self.list_directory(str(p))
                return {
                    "success": True,
                    "exists": True,
                    "is_dir": True,
                    "name": p.name or "Raíz",
                    "path": str(p),
                    "parent_path": str(p.parent) if p.parent != p else None,
                    "breadcrumbs": breadcrumbs,
                    "storage_tier": storage_tier,
                    "total_items": dir_res.get("total_items", 0),
                    "items": dir_res.get("items", []),
                    "modified_timestamp": stat_info.st_mtime,
                    "readable": os.access(p, os.R_OK),
                    "writable": os.access(p, os.W_OK)
                }
            else:
                file_res = self.read_file_content(str(p))
                sha256_hash = ""
                try:
                    with open(p, "rb") as f:
                        sha256_hash = hashlib.sha256(f.read(1024 * 1024 * 5)).hexdigest()
                except Exception:
                    pass

                mime, _ = mimetypes.guess_type(p.name)
                ext = p.suffix.lower()

                return {
                    "success": True,
                    "exists": True,
                    "is_dir": False,
                    "name": p.name,
                    "path": str(p),
                    "parent_path": str(p.parent),
                    "breadcrumbs": breadcrumbs,
                    "storage_tier": storage_tier,
                    "size_bytes": stat_info.st_size,
                    "size_formatted": self._format_size(stat_info.st_size),
                    "extension": ext,
                    "mime_type": mime or "text/plain",
                    "sha256": sha256_hash,
                    "content": file_res.get("content", ""),
                    "truncated": file_res.get("truncated", False),
                    "modified_timestamp": stat_info.st_mtime,
                    "readable": os.access(p, os.R_OK),
                    "writable": os.access(p, os.W_OK)
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "path": target_path
            }

    @staticmethod
    def _format_size(num_bytes: Optional[int]) -> str:
        if num_bytes is None:
            return "0 B"
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if abs(num_bytes) < 1024.0:
                return f"{num_bytes:.1f} {unit}"
            num_bytes /= 1024.0
        return f"{num_bytes:.1f} PB"

system_explorer = SystemExplorer()
