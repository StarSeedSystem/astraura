import re
import os
import asyncio
from typing import Dict, Any, List, Optional
from ..tools.system_explorer import system_explorer
from ..tools.terminal_tool import terminal_tool
from ..tools.system_senses import system_senses
from ..tools.web_crawl_tool import web_crawl_tool
from ..tools.browser_tool import browser_agent
from ..core.auto_discovery import auto_discovery_engine

class AstrauraToolAgent:
    """
    Astraura Master Tool Execution Agent (Hephaestus).
    Equipped with real system permissions:
      - Live Browser Automation & Internet Search (Playwright / Browser-Use)
      - Full-computer Filesystem access (/Users/alex, /, /Volumes)
      - Native Terminal & Shell execution
      - Hardware Telemetry & Senses
      - Device & Context Auto-Discovery
    """
    def __init__(self):
        self.name = "Tool Agent (Hephaestus)"

    async def execute_tool_for_prompt(self, prompt: str, preferences: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Analyzes the user prompt and autonomously executes the relevant system tools.
        Honors user preferences for web data toggle and deep research duration.
        """
        prefs = preferences or {}
        p_lower = prompt.lower()
        tool_executions = []
        collected_data = {}
        agent_thoughts = []

        web_enabled = prefs.get("web_data_enabled", True)
        research_depth = prefs.get("deep_research_depth", "standard") # 'quick', 'standard', 'deep'
        research_mins = prefs.get("deep_research_mins", 1)

        # (OS · Ola 3) Air-Gap REAL: con el aislamiento activo se omiten TODAS las
        # herramientas web (navegación, búsqueda, investigación profunda). El chat
        # sigue funcionando con memoria, archivos y telemetría locales.
        air_gapped = False
        try:
            from ..core.privacy_manager import is_air_gapped
            air_gapped = is_air_gapped()
        except Exception:
            air_gapped = False
        if air_gapped and web_enabled:
            web_enabled = False
            agent_thoughts.append("🔒 Air-Gap Soberano activo: herramientas web omitidas (sin salida a internet).")
            tool_executions.append({
                "tool": "web_tools",
                "target": "internet",
                "success": False,
                "summary": "air-gap activo: navegación, búsqueda e investigación web deshabilitadas."
            })

        # 1. Web Browsing / URL Navigation / Live Internet Search
        urls = re.findall(r"https?://[^\s\)\"\'>]+", prompt)
        if urls and web_enabled:
            for url in urls[:3]:
                agent_thoughts.append(f"🌐 Navegación Autónoma Web: Conectando con '{url}'...")
                web_data = await browser_agent.navigate_and_extract(url, take_screenshot=False)
                if "web_content" not in collected_data:
                    collected_data["web_content"] = web_data
                else:
                    collected_data["web_content"]["content"] += f"\n\n--- FUENTE: {url} ---\n" + web_data.get("content", "")[:3000]

                tool_executions.append({
                    "tool": "browser_navigate",
                    "target": url,
                    "success": web_data.get("success", False),
                    "summary": f"Extraídos {web_data.get('length', 0)} caracteres de '{web_data.get('title', url)}'"
                })
        elif web_enabled and (
            any(w in p_lower for w in ["busca en internet", "buscar en la web", "search", "noticias", "google", "duckduckgo", "navega", "investiga", "github", "openhands", "kilocode", "opencode"])
            or research_depth == "deep"
        ):
            clean_query = re.sub(r"(busca en internet|buscar en la web|busca|search|investiga)\s*:?", "", prompt, flags=re.IGNORECASE).strip()
            if not clean_query: clean_query = prompt

            agent_thoughts.append(f"🔍 Investigación Web Profunda ({research_depth}): '{clean_query[:50]}'...")
            deep_res = await browser_agent.perform_deep_research(clean_query, duration_mins=research_mins, max_depth=research_depth)
            collected_data["deep_research"] = deep_res
            tool_executions.append({
                "tool": "deep_web_research",
                "target": clean_query,
                "success": deep_res.get("success", False),
                "summary": f"Sintetizadas {deep_res.get('sources_count', 0)} fuentes en {deep_res.get('time_taken_seconds', 0)}s."
            })
        elif not web_enabled and urls and not air_gapped:  # (OS · Ola 3) con air-gap ya se avisó arriba
            agent_thoughts.append("🔒 Modo Aislado Local: Uso de datos de internet desactivado por preferencia del usuario.")

        # 2. Filesystem Access
        file_match = re.search(r"['\"]([^'\"]+\.(pdf|md|txt|py|js|ts|json|cpp|c|html|css))['\"]", prompt, re.IGNORECASE)
        if file_match or any(w in p_lower for w in ["lee el archivo", "leer archivo", "carpeta", "documentos", "explora"]):
            target_path = None
            if file_match:
                filename = file_match.group(1)
                res = system_explorer.search_files(str(system_explorer.home_dir), filename, max_results=1)
                if res["results"]:
                    target_path = res["results"][0]["path"]
            
            if target_path:
                agent_thoughts.append(f"📄 Acceso a Archivo: Leyendo '{target_path}'...")
                file_content = system_explorer.read_file_content(target_path)
                collected_data["file_content"] = file_content
                tool_executions.append({
                    "tool": "read_file",
                    "target": target_path,
                    "success": file_content["success"],
                    "summary": f"Leídos {file_content.get('size_formatted')} de '{file_content.get('filename')}'"
                })
            elif any(w in p_lower for w in ["carpeta", "directorio", "explora"]):
                agent_thoughts.append(f"📁 Exploración de Sistema de Archivos: Listando '~/Documents'...")
                fs_data = system_explorer.list_directory()
                collected_data["fs_data"] = fs_data
                tool_executions.append({
                    "tool": "system_explorer",
                    "target": "~/Documents",
                    "success": True,
                    "summary": f"Explorados {fs_data.get('total_items', 0)} elementos en {fs_data.get('current_path')}"
                })

        # 3. Hardware & Sensors Telemetry
        if any(w in p_lower for w in ["bateria", "batería", "cpu", "ram", "sensores", "hardware", "temperatura", "escaneo", "telemetria", "telemetría"]):
            agent_thoughts.append("⚡ Telemetría de Hardware: Muestreando estado de CPU Apple Silicon, RAM y batería...")
            telemetry = system_senses.get_full_telemetry()
            collected_data["system_telemetry"] = telemetry
            tool_executions.append({
                "tool": "system_senses",
                "target": "Apple Silicon M1 Senses",
                "success": True,
                "summary": f"Batería {telemetry['battery']['percent']}% | CPU {telemetry['cpu']['total_percent']}% | RAM Libre {telemetry['memory']['available_gb']} GB"
            })

        return {
            "agent": self.name,
            "thoughts": agent_thoughts,
            "tool_executions": tool_executions,
            "collected_data": collected_data
        }

tool_agent = AstrauraToolAgent()
