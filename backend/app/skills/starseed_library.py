import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from ..core.config import settings

class StarSeedLibraryEngine:
    """
    Manages the complete catalog of skills, abilities, and packages from StarSeed OS (https://starseed-os.vercel.app/library).
    Provides default active abilities for computer access, sensory telemetry, 
    web extraction, terminal execution, 1.58-bit cognition, and memory consolidation.
    """
    def __init__(self):
        self.persistence_file = settings.data_path / "starseed_skills.json"
        self.skills: Dict[str, Dict[str, Any]] = {}
        self._initialize_default_catalog()

    def _initialize_default_catalog(self):
        # Full StarSeed Library default catalog with all real capabilities
        default_catalog = [
            {
                "id": "starseed-auto-update",
                "name": "Auto-Actualización & Auto-Afinación",
                "category": "Autonomía & Optimización",
                "icon": "RefreshCw",
                "blurb": "Sincroniza y optimiza continuamente los parámetros de inferencia y la memoria en segundo plano.",
                "enabled": True,
                "is_builtin": True
            },
            {
                "id": "computer-fs-access",
                "name": "Acceso Universal al Sistema de Archivos",
                "category": "Control del Dispositivo",
                "icon": "FolderTree",
                "blurb": "Navega, lee e indexa cualquier archivo o directorio en toda la computadora (/Users, /, /Volumes).",
                "enabled": True,
                "is_builtin": True
            },
            {
                "id": "terminal-exec",
                "name": "Consola & Ejecución de Terminal",
                "category": "Control del Dispositivo",
                "icon": "Terminal",
                "blurb": "Ejecución real de comandos de shell y diagnósticos del sistema con permisos nativos.",
                "enabled": True,
                "is_builtin": True
            },
            {
                "id": "system-senses",
                "name": "Sentidos del Dispositivo & Hardware",
                "category": "Percepción Sensorial",
                "icon": "Activity",
                "blurb": "Lectura en tiempo real de batería, carga de CPU por núcleo, RAM unificada, almacenamiento y red.",
                "enabled": True,
                "is_builtin": True
            },
            {
                "id": "aurora-web-access",
                "name": "Web Scraping & Lector de URLs (Crawl4AI)",
                "category": "Conocimiento & Web",
                "icon": "Globe",
                "blurb": "Extracción limpia de texto y markdown desde cualquier enlace web en tiempo real.",
                "enabled": True,
                "is_builtin": True
            },
            {
                "id": "research-open-notebook",
                "name": "Investigación Profunda & RAG Sintético",
                "category": "Conocimiento & Web",
                "icon": "BookOpen",
                "blurb": "Búsqueda vectorial local y síntesis de documentos fundacionales del workspace y la comunidad.",
                "enabled": True,
                "is_builtin": True
            },
            {
                "id": "knowledge-graph-engine",
                "name": "Grafo Semántico Asociativo (Exocórtex)",
                "category": "Memoria & Cognición",
                "icon": "Network",
                "blurb": "Construcción y consolidación continua de conceptos y relaciones interconectadas.",
                "enabled": True,
                "is_builtin": True
            },
            {
                "id": "bitnet-158-engine",
                "name": "Motor de Inferencia de 1.58 Bits (BitNet b1.58)",
                "category": "Cómputo Ternario",
                "icon": "Cpu",
                "blurb": "Inferencia matricial basada en pesos {-1, 0, 1} con aceleración SIMD/NEON y compresión 8x.",
                "enabled": True,
                "is_builtin": True
            },
            {
                "id": "code-sandbox",
                "name": "Sandbox de Ejecución de Código Python",
                "category": "Desarrollo",
                "icon": "Code",
                "blurb": "Ejecuta scripts y análisis de datos en el entorno local con retorno de resultados.",
                "enabled": True,
                "is_builtin": True
            },
            {
                "id": "hugging-bay",
                "name": "Hugging Bay (Descubrimiento de Modelos)",
                "category": "Modelos & IA",
                "icon": "DownloadCloud",
                "blurb": "Registro y descarga de modelos cuantizados GGUF de Microsoft y la comunidad.",
                "enabled": True,
                "is_builtin": True
            },
            {
                "id": "audiomorphic-voice",
                "name": "Síntesis de Voz Audiomórfica",
                "category": "Multimedia",
                "icon": "Volume2",
                "blurb": "Articulación de voz natural y lectura interactiva de respuestas.",
                "enabled": True,
                "is_builtin": True
            },
            {
                "id": "taste-skill",
                "name": "Taste Skill (Evaluación de Diseño & UI)",
                "category": "Diseño",
                "icon": "Sparkles",
                "blurb": "Criterios de estética Cyberpunk, Glassmorphism y diseño fluido estilo Hermes.",
                "enabled": True,
                "is_builtin": True
            }
        ]

        if self.persistence_file.exists():
            try:
                with open(self.persistence_file, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                    self.skills = {s["id"]: s for s in default_catalog}
                    for k, v in saved.items():
                        if k in self.skills:
                            self.skills[k]["enabled"] = v.get("enabled", True)
                return
            except Exception:
                pass

        self.skills = {s["id"]: s for s in default_catalog}
        self.save()

    def save(self):
        self.persistence_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.persistence_file, "w", encoding="utf-8") as f:
            json.dump(self.skills, f, indent=2, ensure_ascii=False)

    def get_all_skills(self) -> List[Dict[str, Any]]:
        return list(self.skills.values())

    def toggle_skill(self, skill_id: str, enabled: bool) -> Dict[str, Any]:
        if skill_id in self.skills:
            self.skills[skill_id]["enabled"] = enabled
            self.save()
            return {"success": True, "skill": self.skills[skill_id]}
        return {"success": False, "error": "Skill no encontrada"}

    def is_skill_enabled(self, skill_id: str) -> bool:
        return self.skills.get(skill_id, {}).get("enabled", True)

starseed_library = StarSeedLibraryEngine()
