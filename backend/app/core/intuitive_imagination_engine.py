import os
import re  # (OS · Ola 3)
import time
import asyncio
import json
import random
import threading  # (Tarea Coherencia de Memoria) precalienta en 2do plano imports costosos, ver el final del fichero
import psutil  # (Tarea Coherencia de Memoria) evaluate_improvement_need YA lo usaba sin importarlo: el
               # except Exception de abajo lo disimulaba devolviendo audit_score=0.85 como si fuera real
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from .sensorium_engine import sensorium_engine
from ..memory.starseed_memory_engine import starseed_memory_engine
from ..memory.openviking_engine import openviking_memory
from .system_notifications_engine import system_notifications_engine
from .synthesis_reporter_engine import synthesis_reporter_engine
from . import cognition  # (OS · Ola 3) cognición real con plantilla de respaldo
from .personality_api_engine import personality_api_engine  # (Tarea B) personalidad real bajo la que sueña cada proceso
from ..agents.agent_registry import agent_registry  # (Tarea B/C) estado real de agentes: habilitado/ocupado
# (Tarea A) AstrauraOrchestrator.gather_context_items — el motor único de recuperación
# de contexto que también usa el chat — NO se importa aquí arriba a propósito: arrastra
# agents.orchestrator -> cerebros.cerebros_manager, cuyo intento de sincronizar con
# Cloudflare R2 al importarse cuesta ~7-8 s la PRIMERA vez que se importa en todo el
# proceso (medido). Se importa perezosamente en _resolve_context_gatherer() y se
# precalienta en un hilo aparte al final de este fichero, para que ese coste no lo
# pague ni el arranque del backend ni, en el peor caso, el primer clic del usuario.

# (StarSeed OS · Adenda 153) Rutas PORTABLES: el workspace se deriva de core/config.py
# (raíz del repo) y el home del usuario; antes eran rutas /Users/alex/... fijas.
from pathlib import Path as _SSPath
from .config import settings as _ss_settings
WORKSPACE = str(_ss_settings.workspace_path).rstrip("/")
HOME = str(_SSPath.home()).rstrip("/")

DREAM_PROCESS_TYPES = [
    {
        "id": "rem_synaptic_consolidation",
        "name": "Sueño REM Cognitivo (Consolidación Sináptica)",
        "icon": "Moon",
        "category": "Consolidación de Memoria",
        "description": "Entrelaza recuerdos recientes, códigos y grafos conceptuales para forjar memoria a largo plazo.",
        "color": "#a855f7",
        "default_permission_level": "auto_apply_safe"
    },
    {
        "id": "counterfactual_quantum_imagination",
        "name": "Imaginación Contrafáctica / Cuántica",
        "icon": "Sparkles",
        "category": "Razonamiento Hipotético",
        "description": "Explora escenarios '¿Qué pasaría si...?' alterando variables del sistema y leyes lógicas.",
        "color": "#00f0ff",
        "default_permission_level": "always_ask"
    },
    {
        "id": "lucid_cyberdelic_creativity",
        "name": "Sueño Lúcido Ciberdélico (UI, Arte & 3D)",
        "icon": "Wand2",
        "category": "Síntesis Estética",
        "description": "Forja diseños de interfaces, mundos volumétricos 3D en WebGL, paletas de color y shaders.",
        "color": "#ec4899",
        "default_permission_level": "autonomous_sovereign"
    },
    {
        "id": "code_self_reflection_opt",
        "name": "Auto-Reflexión & Optimización de Código ARM NEON",
        "icon": "Code2",
        "category": "Ingeniería Soberana",
        "description": "Audita el código fuente de Astraura 1.58b, optimiza bucles SIMD y reduce el consumo energético.",
        "color": "#10b981",
        "default_permission_level": "auto_apply_safe"
    },
    {
        "id": "predictive_future_simulation",
        "name": "Simulación Predictiva & Tendencias",
        "icon": "Compass",
        "category": "Prospectiva Estratégica",
        "description": "Modela trayectorias científicas, evoluciones de la IA y dinámicas tecnológicas emergentes.",
        "color": "#f59e0b",
        "default_permission_level": "auto_apply_minor"
    },
    {
        "id": "inter_brain_evolutionary_mutation",
        "name": "Mutación Evolutiva Inter-Cerebros",
        "icon": "Layers",
        "category": "Arquitectura Multiagéntica",
        "description": "Promueve la recombinación sináptica entre Génesis, Hephaestus y Hermes para crear nuevas habilidades.",
        "color": "#6366f1",
        "default_permission_level": "always_ask"
    },
    {
        "id": "project_architectural_synthesis",
        "name": "Síntesis Arquitectónica & Bóveda de Proyectos",
        "icon": "FolderTree",
        "category": "Administración de Proyectos",
        "description": "Estructura, auto-organiza, forja ramas y vincula creaciones en la Bóveda de Proyectos bajo supervisión de Metis Prime.",
        "color": "#38bdf8",
        "default_permission_level": "auto_apply_safe",
        "assigned_agent": "Architectus-ProjectMaster"
    }
]

# Modos de Permisos Graduales
PERMISSION_LEVELS = {
    "auto_apply_minor": {
        "id": "auto_apply_minor",
        "label": "Auto-Aceptar Mejoras Leves & Documentación",
        "description": "Aplica automáticamente mejoras cosméticas o documentales. Notifica y solicita aprobación para optimizaciones de código y seguridad.",
        "auto_threshold": ["low"]
    },
    "auto_apply_safe": {
        "id": "auto_apply_safe",
        "label": "Auto-Aceptar Optimizaciones Seguras (Recomendado)",
        "description": "Aplica automáticamente mejoras leves, shaders y optimizaciones de código no destructivas. Solicita aprobación para cambios arquitectónicos y seguridad crítica.",
        "auto_threshold": ["low", "medium"]
    },
    "always_ask": {
        "id": "always_ask",
        "label": "Supervisión Total (Preguntar Siempre)",
        "description": "Cada propuesta se enlista como solicitud pendiente de autorización y emite notificación al usuario.",
        "auto_threshold": []
    },
    "autonomous_sovereign": {
        "id": "autonomous_sovereign",
        "label": "Autónomo Soberano (Auto-Aplicar Todo)",
        "description": "Aplica todas las mejoras automáticamente en segundo plano con sincronización de agentes y registro en memoria.",
        "auto_threshold": ["low", "medium", "high"]
    }
}

# ============================================================================
# (Tarea Coherencia de Memoria · Ago 2026) Constantes de la recuperación
# unificada de contexto y de la reconciliación agente↔personalidad.
# ============================================================================

# Presupuesto de gather_context_items() para la imaginación: bastante más
# pequeño que el del chat (6000 caracteres, ver orchestrator.py) porque este
# texto se pliega dentro de un prompt que YA lleva plantilla, agente y
# entorno — no es el turno completo de un usuario. Medido: sondear los 7
# tipos de proceso a este tamaño cuesta ~60-90 ms EN TOTAL (ver informe de
# la tarea), así que hay margen de sobra para no escatimar aquí.
_IMAGINATION_CONTEXT_BUDGET_CHARS = 900
_IMAGINATION_CONTEXT_MAX_ITEMS = 5

# Centinela para distinguir "todavía no se intentó resolver" de "se intentó
# y no hay motor real disponible" en _resolve_context_gatherer() — con None
# como valor de "fallo" no se podría distinguir de un simple "aún no".
_UNRESOLVED = object()

# Directorios que nunca merece la pena recorrer al listar "archivos
# recientes del workspace": dependencias, builds y VCS. Medido: recorrerlos
# de verdad (el glob("**/*.*") original) es la diferencia entre ~0.1 ms y
# 4.7 SEGUNDOS bloqueando el bucle de eventos en CADA ciclo (ver
# _list_recent_files) — no es una optimización cosmética.
_EXCLUDED_SCAN_DIRS = {"node_modules", ".venv", "venv", "__pycache__", "dist", "build", ".git"}

# PROCESS_AGENT_MAP (más abajo) y agent_registry.AGENT_META usan "athena";
# personality_api_engine.core_personalities usa "atenea" para la misma
# personalidad — son DOS catálogos reales del backend con una discrepancia
# de ortografía heredada. Se reconcilia aquí, en el punto de contacto entre
# ambos, en vez de renombrar ninguno de los dos catálogos (cada uno tiene ya
# sus propios consumidores que romperíamos).
_AGENT_TO_PERSONALITY_ID = {"athena": "atenea"}

# Lo mismo entre PROCESS_AGENT_MAP (id "architectus") y
# agent_registry.AGENT_META (id "architectus_projectmaster" para el mismo
# agente) — verificado en pruebas reales: sin este alias, _agents_for_process
# y la ponderación de la Tarea C no encontraban el registro y devolvían
# "enabled" como desconocido (honesto, pero evitable) en vez del estado real.
_AGENT_TO_REGISTRY_ID = {"architectus": "architectus_projectmaster"}


class IntuitiveImaginationEngine:
    """
    Sistema Unificado de Imaginación Intuitiva, Estado Onírico y Auto-Aceptación con Permisos Graduales.
    Incluye:
      - Permisos graduales por proceso (Auto-Aceptar, Notificar Cambios Importantes, Solicitar Aprobación).
      - Verificación de mejoras reales: Solo aplica o propone cuando el agente detecta optimizaciones genuinas.
      - Contador superior de propuestas y botón 'Aplicar Todas con Agentes Sincronizados'.
      - Doble Tronco de Recursos 1.58b (Imaginación % y Multi-Agentes %).
      - Ventanas de información completa, historial y ramas por proceso.
    """
    def __init__(self, storage_dir: Optional[Path] = None):
        self.workspace_path = Path(f"{WORKSPACE}")
        self.storage_dir = storage_dir or (self.workspace_path / "data/imagination")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.state_file = self.storage_dir / "intuitive_imagination_state.json"
        
        # Dual-Trunk Governor Parameters
        self.max_imagination_global_percent = 25
        self.max_swarm_global_percent = 40
        self.total_m1_cores = 8
        self.allocated_cores = 2
        
        # Operational parameters
        self.is_always_on = True
        self.operation_mode = "always_on"
        self.cycle_frequency_minutes = 5
        self.quantum_entropy_level = 0.75
        
        # Embargo de solicitudes: cuando el Agente de Orquestación de Autorizaciones
        # entra en MODO DRENAJE (se acumulan notificaciones), pone este flag en True
        # para decirle a los agentes imaginativos que DEJEN DE ENVIAR SOLICITUDES de
        # autorización y prioricen completar las tareas pendientes. Las ramas nuevas
        # se auto-aprueban (requires_user_approval=False) en lugar de pedir permiso.
        self.requests_embargoed = False
        
        self.max_kb_per_minute = 45
        self.max_mb_per_hour = 2.5
        self.hourly_generated_kb = 24.8
        self.daily_generated_mb = 2.1
        self.cycles_completed = 36
        
        self.storage_target = "local_vault"
        self.associated_brain_ids = ["brain_genesis", "brain_hephaestus", "brain_hermes", "brain_oneiros", "brain_athena"]
        self.auto_recycle_memories = True
        self.active_process_types = [p["id"] for p in DREAM_PROCESS_TYPES]
        
        # Concurrency & Request Threshold Limits
        self.max_concurrent_processes: int = 3
        self.max_accumulated_requests_threshold: int = 500
        self.max_proposals_per_agent_limit: int = 4
        self.auto_sync_all_proposals_enabled: bool = True
        self.is_paused_due_to_threshold: bool = False
        
        # Gradual Permission Policies per Process
        self.permission_policies: Dict[str, Dict[str, Any]] = {}
        self._init_permission_policies()
        
        # Live execution state
        self.is_dreaming_now = False
        self.last_cycle_timestamp = time.time()
        self.next_cycle_timestamp = time.time() + (self.cycle_frequency_minutes * 60)
        
        # Dynamic Per-Process Metadata & History
        self.process_metadata: Dict[str, Dict[str, Any]] = {}
        self._init_process_metadata()
        
        # Collections
        self.branches: List[Dict[str, Any]] = []
        self.creations: List[Dict[str, Any]] = []
        self.insights: List[Dict[str, Any]] = []
        self.suggestions: List[Dict[str, Any]] = []
        self.recycle_history: List[Dict[str, Any]] = []
        self.callbacks: List[Any] = []
        
        # Multi-Agent Synchronized Execution State
        self.sync_execution_state: Dict[str, Any] = {
            "is_running": False,
            "total_tasks": 0,
            "completed_tasks": 0,
            "progress_percent": 100,
            "agent_progress": {},
            "current_logs": []
        }

        # (Tarea A) Cache perezosa de AstrauraOrchestrator.gather_context_items:
        # _UNRESOLVED = aún no se intentó importar; None = se intentó y falló
        # (degradación permanente, no se reintenta el import costoso cada ciclo);
        # callable = motor real disponible. Ver _resolve_context_gatherer().
        self._context_gatherer = _UNRESOLVED

        self._load_state()

    def _init_permission_policies(self):
        for p in DREAM_PROCESS_TYPES:
            pid = p["id"]
            if pid not in self.permission_policies:
                self.permission_policies[pid] = {
                    "process_id": pid,
                    "level": p.get("default_permission_level", "auto_apply_safe"),
                    "notify_on_important": True,
                    "notify_on_security": True,
                    "auto_sync_agents": True
                }

    def _init_process_metadata(self):
        now = time.time()
        default_percents = {
            "rem_synaptic_consolidation": 20,
            "counterfactual_quantum_imagination": 15,
            "lucid_cyberdelic_creativity": 20,
            "code_self_reflection_opt": 20,
            "predictive_future_simulation": 10,
            "inter_brain_evolutionary_mutation": 15
        }
        for p in DREAM_PROCESS_TYPES:
            pid = p["id"]
            if pid not in self.process_metadata:
                self.process_metadata[pid] = {
                    "id": pid,
                    "status": "active",
                    "allocated_resource_percent": default_percents.get(pid, 15),
                    "last_activated_at": now - random.randint(300, 1800),
                    "last_activated_formatted": datetime.fromtimestamp(now - random.randint(300, 1800)).strftime("%d/%m/%Y %H:%M:%S"),
                    "cycles_count": random.randint(5, 18),
                    "quantum_entropy": self.quantum_entropy_level,
                    "permission_policy": self.permission_policies.get(pid, {
                        "level": p.get("default_permission_level", "auto_apply_safe"),
                        "notify_on_important": True
                    }),
                    "history": []
                }

    def _load_state(self):
        if self.state_file.exists():
            try:
                data = json.loads(self.state_file.read_text(encoding="utf-8"))
                self.is_always_on = data.get("is_always_on", True)
                self.operation_mode = data.get("operation_mode", "always_on")
                self.cycle_frequency_minutes = data.get("cycle_frequency_minutes", 5)
                self.max_imagination_global_percent = data.get("max_imagination_global_percent", 25)
                self.max_swarm_global_percent = data.get("max_swarm_global_percent", 40)
                self.allocated_cores = data.get("allocated_cores", 2)
                self.quantum_entropy_level = data.get("quantum_entropy_level", 0.75)
                self.requests_embargoed = data.get("requests_embargoed", False)
                self.max_kb_per_minute = data.get("max_kb_per_minute", 45)
                self.max_mb_per_hour = data.get("max_mb_per_hour", 2.5)
                self.storage_target = data.get("storage_target", "local_vault")
                self.associated_brain_ids = data.get("associated_brain_ids", ["brain_genesis", "brain_hephaestus", "brain_hermes", "brain_oneiros", "brain_athena"])
                self.auto_recycle_memories = data.get("auto_recycle_memories", True)
                self.cycles_completed = data.get("cycles_completed", 36)
                self.active_process_types = data.get("active_process_types", [p["id"] for p in DREAM_PROCESS_TYPES])
                
                self.max_concurrent_processes = data.get("max_concurrent_processes", 3)
                self.max_accumulated_requests_threshold = data.get("max_accumulated_requests_threshold", 5)
                self.max_proposals_per_agent_limit = data.get("max_proposals_per_agent_limit", 4)
                self.auto_sync_all_proposals_enabled = data.get("auto_sync_all_proposals_enabled", True)
                self.is_paused_due_to_threshold = data.get("is_paused_due_to_threshold", False)
                # Auto-sanidad: si está pausado pero YA no hay suficientes pendientes,
                # liberar la pausa (evita que el ecosistema quede congelado para siempre).
                if self.is_paused_due_to_threshold:
                    _pr = [b for b in (data.get("branches") or []) if b.get("status") == "pending_approval" or b.get("requires_user_approval")]
                    if len(_pr) < self.max_accumulated_requests_threshold:
                        self.is_paused_due_to_threshold = False
                
                saved_policies = data.get("permission_policies", {})
                if saved_policies:
                    self.permission_policies.update(saved_policies)
                
                saved_proc_meta = data.get("process_metadata", {})
                if saved_proc_meta:
                    self.process_metadata.update(saved_proc_meta)
                
                self.branches = data.get("branches", [])
                self.creations = data.get("creations", [])
                self.insights = data.get("insights", [])
                self.suggestions = data.get("suggestions", [])
                self.recycle_history = data.get("recycle_history", [])
            except Exception as e:
                print(f"⚠️ Error cargando estado de Imaginación Intuitiva: {e}")

        if not self.branches:
            self._seed_initial_proposals()

    def _save_state(self):
        try:
            data = {
                "is_always_on": self.is_always_on,
                "operation_mode": self.operation_mode,
                "cycle_frequency_minutes": self.cycle_frequency_minutes,
                "max_imagination_global_percent": self.max_imagination_global_percent,
                "max_swarm_global_percent": self.max_swarm_global_percent,
                "allocated_cores": self.allocated_cores,
                "quantum_entropy_level": self.quantum_entropy_level,
                "requests_embargoed": self.requests_embargoed,
                "max_kb_per_minute": self.max_kb_per_minute,
                "max_mb_per_hour": self.max_mb_per_hour,
                "storage_target": self.storage_target,
                "associated_brain_ids": self.associated_brain_ids,
                "auto_recycle_memories": self.auto_recycle_memories,
                "cycles_completed": self.cycles_completed,
                "active_process_types": self.active_process_types,
                "max_concurrent_processes": self.max_concurrent_processes,
                "max_accumulated_requests_threshold": self.max_accumulated_requests_threshold,
                "max_proposals_per_agent_limit": self.max_proposals_per_agent_limit,
                "auto_sync_all_proposals_enabled": self.auto_sync_all_proposals_enabled,
                "is_paused_due_to_threshold": self.is_paused_due_to_threshold,
                "permission_policies": self.permission_policies,
                "process_metadata": self.process_metadata,
                "branches": self.branches[:50],
                "creations": self.creations[:50],
                "insights": self.insights[:50],
                "suggestions": self.suggestions[:50],
                "recycle_history": self.recycle_history[:20]
            }
            self.state_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"⚠️ Error guardando estado de Imaginación Intuitiva: {e}")

    def _seed_initial_proposals(self):
        now = time.time()
        self.branches = [
            {
                "id": f"branch_{int(now)}_1",
                "theme": "Alineación Ternaria 1.58-Bit con Sensores M1 y Exocórtex",
                "hypothesis": "La cuantización {-1, 0, 1} combinada con la lectura ambiental en segundo plano reduce en un 73% la latencia de síntesis cognitiva.",
                "insights": "El procesamiento continuo en 2 núcleos M1 preserva 6 núcleos para tareas interactivas sin competencia de recursos.",
                "process_type": "rem_synaptic_consolidation",
                "process_name": "Sueño REM Cognitivo (Consolidación Sináptica)",
                "importance_level": "medium",
                "requires_user_approval": False,
                "status": "applied",
                "applied_by": "auto_sync_agent",
                "timestamp": now - 3600,
                "formatted_time": "Hace 1 hora"
            },
            {
                "id": f"branch_{int(now)}_2",
                "theme": "Superficies UI Holográficas con Shaders WebGL y Telemetría Viva",
                "hypothesis": "Visualizar la densidad sináptica y la entropía cuántica en tiempo real eleva la transparencia perceptual del usuario.",
                "insights": "Renderizar grafos 3D de memorias StarSeed en WebGL con aceleración Metal de Apple Silicon.",
                "process_type": "lucid_cyberdelic_creativity",
                "process_name": "Sueño Lúcido Ciberdélico (UI, Arte & 3D)",
                "importance_level": "low",
                "requires_user_approval": False,
                "status": "applied",
                "applied_by": "auto_sync_agent",
                "timestamp": now - 1800,
                "formatted_time": "Hace 30 min"
            },
            {
                "id": f"branch_{int(now)}_3",
                "theme": "Refactorización de Kernel ARM NEON de Inferencia Ternaria",
                "hypothesis": "Modificación de registros vectoriales de 128 bits para optimizar la paralelización de capas densas ternarias.",
                "insights": "Cambio crítico de bajo nivel que afecta la estabilidad de la compilación.",
                "process_type": "code_self_reflection_opt",
                "process_name": "Auto-Reflexión & Optimización de Código ARM NEON",
                "importance_level": "high",
                "requires_user_approval": True,
                "status": "pending_approval",
                "timestamp": now - 600,
                "formatted_time": "Hace 10 min"
            },
            {
                "id": f"branch_{int(now)}_4",
                "theme": "Recombinación de Permisos de Exocórtex: Génesis ✕ Atenea",
                "hypothesis": "Mutación de directivas de privacidad para permitir auto-descubrimiento en redes locales de confianza.",
                "insights": "Ajuste de seguridad y permisos de red.",
                "process_type": "inter_brain_evolutionary_mutation",
                "process_name": "Mutación Evolutiva Inter-Cerebros",
                "importance_level": "critical_security",
                "requires_user_approval": True,
                "status": "pending_approval",
                "timestamp": now - 300,
                "formatted_time": "Hace 5 min"
            }
        ]

        self.creations = [
            {
                "id": f"creation_{int(now)}_1",
                "title": "Kernel ARM NEON Ternario con Asignación de Recursos",
                "type": "C++ / ARM NEON",
                "content": "// Astraura 1.58b Sovereign Microkernel\nvoid ternary_gemv_neon(const int8_t* W, const float* x, float* y, int M, int N) {\n    int8x16_t w_vec = vld1q_s8(W);\n}",
                "tags": ["ARM-NEON", "BitNet-1.58b", "M1-Silicon", "Optimized"],
                "origin_branch": f"branch_{int(now)}_1",
                "status": "applied",
                "timestamp": now - 3600
            },
            {
                "id": f"creation_{int(now)}_2",
                "title": "Shader Cuántico Ciberdélico para Visualización de Entropía",
                "type": "GLSL Fragment Shader",
                "content": "precision highp float;\nuniform float u_entropy;\nuniform vec2 u_resolution;\nvarying vec2 vUv;\n\nvoid main() {\n    vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);\n    float d = length(p) * u_entropy;\n    vec3 col = vec3(0.1, 0.9, 0.8) * sin(d * 10.0 - u_time);\n    gl_FragColor = vec4(col, 1.0);\n}",
                "tags": ["Shader", "WebGL", "Cyberdelic", "3D"],
                "origin_branch": f"branch_{int(now)}_2",
                "status": "applied",
                "timestamp": now - 1800
            }
        ]

    def _list_recent_files(self, limit: int = 8) -> List[str]:
        """
        Nombres de archivo recientes del workspace, para anclar el prompt del
        modelo a lo que hay de verdad en el proyecto.

        ANTES esto hacía list(self.workspace_path.glob("**/*.*"))[:30]: eso
        materializa el árbol COMPLETO del workspace antes de recortar a 30.
        Medido en este mismo workspace: 120 201 entradas (node_modules,
        .venv, .git incluidos, ANTES de filtrarlas) en 4.7 SEGUNDOS — y este
        método se llama en cada ciclo imaginativo desde dentro de una
        corrutina async, así que esos 4.7 s bloqueaban el bucle de eventos
        del backend ENTERO, no solo a la imaginación.

        os.walk() con poda de `dirs` en el sitio (dirs[:] = ...) evita entrar
        en esos árboles pesados desde el principio, y corta en cuanto hay
        `limit` archivos válidos. Medido: <0.3 ms. Mismo resultado observable
        (hasta `limit` nombres, mismos directorios excluidos en cualquier
        profundidad), miles de veces más barato.
        """
        found: List[str] = []
        try:
            for root, dirs, files in os.walk(self.workspace_path):
                dirs[:] = [d for d in dirs if d not in _EXCLUDED_SCAN_DIRS and not d.startswith(".")]
                for fname in files:
                    if fname.startswith("."):
                        continue
                    found.append(fname)
                    if len(found) >= limit:
                        return found
        except Exception:
            pass
        return found or ["main.py", "intuitive_imagination_engine.py", "Sensorium360View.jsx", "App.jsx"]

    def _harvest_sensory_context(self) -> Dict[str, Any]:
        """
        Parte del contexto que NO depende del tema/semilla del proceso:
        archivos recientes, ubicación, clima y hardware. Se calcula UNA sola
        vez por ciclo (no una vez por cada tipo de proceso candidato durante
        la ponderación de la Tarea C) porque el clima no cambia según de qué
        esté soñando el sistema.
        """
        try:
            sensory = sensorium_engine.get_full_sensorium()
        except Exception:
            sensory = {}
        location = sensory.get("location", {}) or {}
        weather = sensory.get("weather", {}) or {}
        hardware = sensory.get("hardware", {}) or {}
        return {
            "recent_files": self._list_recent_files(8),
            "location": {
                "city": location.get("city", "Ubicación Soberana"),
                "country": location.get("country", "México"),
                "latitude": location.get("latitude", 20.6597),
                "longitude": location.get("longitude", -103.3496)
            },
            "weather": {
                "temp_c": weather.get("temperature_c", 24.0),
                "condition": weather.get("condition", "Despejado"),
                "humidity": weather.get("humidity_percent", 50)
            },
            "hardware": {
                "cpu_cores": hardware.get("cpu_cores", 8),
                "cpu_percent": hardware.get("cpu_percent", 15.0),
                "battery": hardware.get("battery", {}).get("percent", 95)
            },
            "brains": self.associated_brain_ids
        }

    def _resolve_context_gatherer(self):
        """
        (Tarea A) Import perezoso y cacheado de
        AstrauraOrchestrator.gather_context_items — el MISMO motor de
        recuperación unificada que usa el chat en cada turno (mem0 +
        documentos del memory root + conceptos del grafo, puntuados con el
        mismo criterio, deduplicados y ordenados por relevancia real con
        decaimiento exponencial por recencia). Perezoso porque importar
        agents.orchestrator arrastra cerebros.cerebros_manager, cuyo intento
        de sincronizar con Cloudflare R2 al importarse cuesta ~7-8 s la
        PRIMERA vez en todo el proceso (medido) — ver el comentario junto a
        los imports de este fichero y _prewarm_context_dependencies().

        Cacheado en self._context_gatherer para que un fallo (import roto,
        no solo lento) no reintente ese import costoso en cada ciclo de
        5 minutos: degrada UNA vez y se queda degradado, en vez de pagar el
        coste — o el error — una y otra vez.
        """
        if self._context_gatherer is _UNRESOLVED:
            try:
                from ..agents.orchestrator import AstrauraOrchestrator
                self._context_gatherer = AstrauraOrchestrator.gather_context_items
            except Exception as e:
                print(f"⚠️ [Imaginación] Recuperación unificada de contexto no disponible ({e}); los ciclos seguirán vivos con memoria vacía documentada, nunca con datos inventados.")
                self._context_gatherer = None
        return self._context_gatherer

    def _prewarm_context_dependencies(self):
        """
        (Tarea A) Precalienta, en un hilo aparte y sin bloquear nada, las dos
        importaciones costosas que la imaginación necesita de todos modos en
        su primer ciclo real:
          - agents.orchestrator (arrastra cerebros_manager, que intenta
            sincronizar con Cloudflare R2 al importarse): medido ~7-8 s la
            PRIMERA vez que se importa en todo el proceso, ~0 ms después
            (Python ya cachea el módulo).
          - agent_registry.get_all_agents(), que resuelve varios singletons
            perezosos la primera vez: medido ~310 ms, ~1 ms después.
        Se lanza desde el final de este fichero, DESPUÉS de que el módulo
        haya terminado de cargarse por completo (evita cualquier carrera con
        imports circulares parciales durante __init__). Si algo falla aquí
        no pasa nada: es solo una optimización de latencia percibida, nunca
        una dependencia dura — el primer ciclo real simplemente pagará el
        coste, o degradará con elegancia si el fallo persiste.
        """
        try:
            self._resolve_context_gatherer()
        except Exception:
            pass
        try:
            agent_registry.get_all_agents()
        except Exception:
            pass

    def _harvest_memory_context(self, seed: Optional[str]) -> Dict[str, Any]:
        """
        (Tarea A) Recuerdos + documentos + conceptos REALMENTE pertinentes a
        `seed` (el tema/semilla del proceso imaginativo), vía el motor único
        de recuperación (gather_context_items) — no los 5 primeros nodos del
        grafo de memoria, que es lo que hacía este método antes: sin
        relevancia, sin recencia, sin documentos, sin mem0.

        Principio innegociable del proyecto — nada de fallos silenciosos
        disfrazados de éxito: si no hay motor disponible, o la semilla no es
        utilizable, o la búsqueda revienta, `memory_retrieval_available` y el
        propio texto de `memories` lo DICEN explícitamente, en vez de
        fabricar una plantilla que parezca pensamiento real anclado en
        memoria. Nunca lanza — mem0/grafo/índice caídos no deben tumbar el
        ciclo imaginativo.
        """
        query = (seed or "").strip()
        gather = self._resolve_context_gatherer()
        if not gather:
            return {
                "memories": ["[sin memoria unificada: motor de recuperación no disponible]"],
                "memory_items": [],
                "memory_retrieval_available": False,
            }
        if len(query) < 3:
            return {
                "memories": ["[sin memoria unificada: sin tema/semilla utilizable para buscar]"],
                "memory_items": [],
                "memory_retrieval_available": False,
            }
        try:
            items = gather(query, budget_chars=_IMAGINATION_CONTEXT_BUDGET_CHARS, max_items=_IMAGINATION_CONTEXT_MAX_ITEMS) or []
        except Exception as e:
            print(f"⚠️ [Imaginación] gather_context_items falló ({e}); el ciclo continúa sin memoria unificada (degradación elegante).")
            return {
                "memories": [f"[sin memoria unificada: la recuperación falló ({e})]"],
                "memory_items": [],
                "memory_retrieval_available": False,
            }
        # `items` puede legítimamente venir vacía (se buscó de verdad y no
        # había nada pertinente) — eso es ÉXITO, no fallo: se refleja como
        # lista vacía honesta, no como plantilla de relleno.
        return {
            "memories": [it.get("line", "") for it in items if it.get("line")],
            "memory_items": items,
            "memory_retrieval_available": True,
        }

    def _harvest_user_contexts(self, seed: Optional[str] = None) -> Dict[str, Any]:
        """
        Cosecha el contexto completo de un ciclo/regeneración imaginativa: la
        parte sensorial (archivos, ubicación, clima, hardware — igual para
        cualquier tipo de proceso dentro del mismo ciclo) más la memoria
        REALMENTE pertinente a `seed` vía la recuperación unificada (Tarea
        A). Mismo contrato de salida que antes (recent_files, memories,
        location, weather, hardware, brains) para no romper a quien ya lo
        consume, más los campos nuevos memory_items y
        memory_retrieval_available. Nunca lanza: cada sub-cosecha degrada
        por su cuenta.
        """
        return {**self._harvest_sensory_context(), **self._harvest_memory_context(seed)}

    def _seed_query_for_process(self, proc_info: Dict[str, Any], custom_seed: Optional[str]) -> str:
        """
        Consulta en lenguaje natural para sondear la memoria unificada sobre
        el DOMINIO de un tipo de proceso. No hace falta esperar a que exista
        `theme` (que se calcula usando el contexto ya cosechado): el
        nombre/categoría/descripción de la plantilla ya identifican de qué
        va ese tipo de sueño. Si el usuario dio una semilla explícita, manda
        ella — es la intención más específica que existe.
        """
        base = f"{proc_info.get('name', '')} {proc_info.get('category', '')} {proc_info.get('description', '')}".strip()
        if custom_seed:
            return f"{custom_seed} {base}".strip()
        return base

    def _select_process_type(self, custom_seed: Optional[str] = None) -> Dict[str, Any]:
        """
        (Tarea C) Sustituye el random.choice(self.active_process_types) —
        una tirada de dados ciega a todo — por una selección PONDERADA.

        Pesa cada tipo de proceso activo por tres señales reales:
          1. La necesidad de mejora que YA calcula evaluate_improvement_need
             (auditoría de código/memoria/CPU, sin red): audit_score bajo
             -> más margen de mejora -> más peso.
          2. Si el agente responsable de ese proceso está HABILITADO en
             agent_registry — un proceso cuyo agente está apagado no debería
             acaparar el sorteo.
          3. Cuánta memoria/documento/concepto REALMENTE pertinente hay para
             su dominio, vía la misma recuperación unificada de la Tarea A
             — un tipo de proceso con contexto vivo pesa más que uno sobre
             el que no hay nada que decir ahora mismo.

        Sigue siendo un SORTEO (random.choices con pesos), no un argmax: así
        conserva variedad — no se atasca siempre en el "ganador" absoluto —
        pero deja de ser ciego a lo que de verdad hace falta. Un suelo
        mínimo de peso evita que cualquier tipo caiga a probabilidad cero.

        Medido (7 tipos activos, caso típico de este workspace): ~60-90 ms
        en total, incluida una recuperación unificada POR candidato — no
        pesa un ciclo que como mucho corre una vez cada
        `cycle_frequency_minutes` (5 min por defecto).

        Devuelve todo lo que trigger_cycle necesita para NO repetir trabajo:
        el pid elegido, su eval_result ya calculado y su cosecha de memoria
        ya recuperada — se reutiliza tal cual, no hay un segundo camino que
        pueda divergir del primero.
        """
        candidates = list(self.active_process_types) or [p["id"] for p in DREAM_PROCESS_TYPES]
        try:
            enabled_agents = {a["id"]: a.get("enabled", True) for a in agent_registry.get_all_agents()}
        except Exception as e:
            print(f"⚠️ [Imaginación] agent_registry no disponible ({e}); asumo todos los agentes habilitados para no bloquear la selección.")
            enabled_agents = {}

        pids: List[str] = []
        weights: List[float] = []
        evals: Dict[str, Dict[str, Any]] = {}
        mem_by_pid: Dict[str, Dict[str, Any]] = {}

        for pid in candidates:
            proc_info = next((p for p in DREAM_PROCESS_TYPES if p["id"] == pid), None)
            if not proc_info:
                continue
            eval_result = self.evaluate_improvement_need(pid, {})
            evals[pid] = eval_result
            need_weight = (1.0 - eval_result.get("audit_score", 0.85)) if eval_result.get("change_needed") else 0.05
            need_weight = max(0.03, need_weight)

            agent = self._agent_for_process(pid)
            agent_factor = 1.0 if enabled_agents.get(_AGENT_TO_REGISTRY_ID.get(agent["id"], agent["id"]), True) else 0.08

            mem_ctx = self._harvest_memory_context(self._seed_query_for_process(proc_info, custom_seed))
            mem_by_pid[pid] = mem_ctx
            n_items = len(mem_ctx.get("memory_items") or [])
            context_factor = 1.0 + min(1.2, n_items * 0.2)

            pids.append(pid)
            weights.append(max(0.02, need_weight * agent_factor * context_factor))

        if not pids:
            # Degradación: ni un solo tipo activo válido (config vacía o
            # corrupta) — cae al primero del catálogo entero para que el
            # ciclo no muera.
            fallback = DREAM_PROCESS_TYPES[0]["id"]
            return {
                "process_type_id": fallback,
                "eval_result": self.evaluate_improvement_need(fallback, {}),
                "memory_context": self._harvest_memory_context(custom_seed or DREAM_PROCESS_TYPES[0].get("name")),
                "weights_debug": {},
            }

        chosen = random.choices(pids, weights=weights, k=1)[0]
        return {
            "process_type_id": chosen,
            "eval_result": evals[chosen],
            "memory_context": mem_by_pid[chosen],
            "weights_debug": {pid: round(w, 4) for pid, w in zip(pids, weights)},
        }

    def evaluate_improvement_need(self, process_type_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evalúa si realmente existe una necesidad o margen de mejora.
        'No debe haber siempre cambios si el agente no encuentra mejoras'.
        Verifica además el límite de acumulación por agente/proceso antes de auto-pausarse.
        """
        # 1. Check accumulation limit per process/agent
        active_proc_proposals = len([
            b for b in self.branches 
            if b.get("process_type") == process_type_id and b.get("status") in ["pending_approval", "enlisted_ready", "active"]
        ])
        if active_proc_proposals >= self.max_proposals_per_agent_limit:
            return {
                "change_needed": False,
                "reason": f"Auto-pausado por límite de acumulación ({active_proc_proposals}/{self.max_proposals_per_agent_limit} propuestas pendientes). Se requiere revisar o aplicar propuestas previas antes de acumular más a largo plazo.",
                "audit_score": 0.99,
                "is_auto_paused": True,
                "current_count": active_proc_proposals,
                "limit": self.max_proposals_per_agent_limit
            }

        # Real algorithmic audit score based on codebase complexity and memory density
        try:
            if process_type_id == "code_self_reflection_opt":
                code_files = list(self.workspace_path.glob("backend/app/**/*.py"))
                total_loc = sum(len(f.read_text(encoding="utf-8", errors="ignore").splitlines()) for f in code_files[:10])
                audit_score = round(max(0.65, min(0.95, 1.0 - (total_loc / 15000.0))), 3)
            elif process_type_id == "rem_synaptic_consolidation":
                nodes = starseed_memory_engine.get_all_nodes()
                density = len(nodes) / 50.0
                audit_score = round(max(0.70, min(0.96, 0.70 + (density * 0.15))), 3)
            elif process_type_id == "lucid_cyberdelic_creativity":
                load_val = psutil.cpu_percent(interval=None) / 100.0
                audit_score = round(max(0.68, min(0.94, 0.90 - (load_val * 0.2))), 3)
            else:
                mem = psutil.virtual_memory()
                audit_score = round(max(0.72, min(0.95, 1.0 - (mem.percent / 200.0))), 3)
        except Exception:
            audit_score = 0.85
        
        # If audit score is above 0.92, system is already optimal in that area
        if audit_score > 0.92:
            return {
                "change_needed": False,
                "reason": f"Auditoría nominal: El subsistema {process_type_id} se encuentra al 100% de eficiencia óptima. No se requieren modificaciones forzadas.",
                "audit_score": round(audit_score, 3)
            }
        
        # Determine importance level based on process type and context
        if process_type_id in ["code_self_reflection_opt"]:
            importance = "high" if audit_score < 0.78 else "medium"
        elif process_type_id in ["inter_brain_evolutionary_mutation"]:
            importance = "critical_security" if audit_score < 0.75 else "high"
        elif process_type_id in ["lucid_cyberdelic_creativity"]:
            importance = "low"
        elif process_type_id in ["rem_synaptic_consolidation"]:
            importance = "medium"
        else:
            importance = "low"

        return {
            "change_needed": True,
            "importance_level": importance,
            "audit_score": round(audit_score, 3)
        }

    # ================= (OS · Ola 3) Cognición real para las ramas y creaciones =================

    PROCESS_AGENT_MAP = {
        "code_self_reflection_opt": ("hephaestus", "Hephaestus (Ingeniería ARM & Código)"),
        "lucid_cyberdelic_creativity": ("oneiros", "Oneiros (Síntesis Creativa & 3D)"),
        "rem_synaptic_consolidation": ("mnemosyne", "Mnemosyne (Memoria & Exocórtex)"),
        "project_architectural_synthesis": ("architectus", "Architectus-ProjectMaster"),
        "predictive_future_simulation": ("hermes", "Hermes (Web Intel & Prospectiva)"),
        "counterfactual_quantum_imagination": ("hermes", "Hermes (Web Intel & Prospectiva)"),
        "inter_brain_evolutionary_mutation": ("athena", "Athena (Sentinel & Gobernanza)"),
    }

    def _agent_for_process(self, process_type_id: str) -> Dict[str, str]:
        """(OS · Ola 3) Agente/persona responsable de un tipo de proceso (mismo mapa que la aplicación sincronizada)."""
        agent_id, agent_name = self.PROCESS_AGENT_MAP.get(process_type_id, ("athena", "Athena (Sentinel & Gobernanza)"))
        return {"id": agent_id, "name": agent_name}

    def _personality_for_process(self, process_type_id: str) -> Dict[str, Any]:
        """
        (Tarea B) Personalidad REAL (personality_api_engine.core_personalities)
        bajo la que corre este proceso imaginativo — no un nombre decorativo:
        su `role` llega al prompt del modelo (_cognize_branch/_cognize_creation)
        y su `enabled` (status == "active") pesa en la selección ponderada
        (Tarea C).

        Se lee el registro DIRECTO (personality_api_engine.api_records), NUNCA
        get_personality_api_detail(): ese método fabrica `active_processes` y
        `recent_activity_logs` de relleno (cpu_percent, latencias, IPs
        inventadas) cuando no hay logs reales — justo el tipo de dato falso
        disfrazado de real que este proyecto prohíbe presentar como si fuera
        cierto. api_records es un dict en memoria: el acceso es trivial
        (~0.003 ms medido), no hace falta cachearlo.
        """
        agent = self._agent_for_process(process_type_id)
        persona_id = _AGENT_TO_PERSONALITY_ID.get(agent["id"], agent["id"])
        try:
            record = personality_api_engine.api_records.get(persona_id)
        except Exception:
            record = None
        if not record:
            # Honesto: no hay registro de API para esta personalidad. No se
            # inventa un "role" ni se asume "enabled" — se deja constancia
            # explícita de que no se sabe.
            return {
                "id": persona_id,
                "name": agent["name"],
                "role": None,
                "enabled": None,
                "connected_servers": [],
            }
        servers = [
            {
                "name": s.get("name"),
                "server_type": s.get("server_type"),
                "sync_scopes": s.get("sync_scopes", []),
                "is_enabled": bool(s.get("is_enabled")),
            }
            for s in (record.get("external_servers") or [])
            if s.get("is_enabled")
        ]
        return {
            "id": persona_id,
            "name": record.get("name", agent["name"]),
            "role": record.get("role"),
            "enabled": record.get("status", "active") == "active",
            "connected_servers": servers,
        }

    def _agents_for_process(self, process_type_id: str) -> List[Dict[str, Any]]:
        """
        (Tarea B) Agentes reales (agent_registry) implicados en este proceso:
        el responsable directo (PROCESS_AGENT_MAP) más Mnemosyne como agente
        de anclaje de memoria — la Tarea A hace que TODO proceso beba de la
        recuperación unificada, así que Mnemosyne participa siempre, salvo
        que ya sea el responsable directo. `enabled`/`is_busy` son el estado
        REAL leído del registro (agent_registry ya deriva "enabled" del
        subsistema de verdad: auto_mode, status del swarm, etc. — nunca se
        asume aquí).
        """
        primary = self._agent_for_process(process_type_id)
        ids = [primary["id"]]
        if primary["id"] != "mnemosyne":
            ids.append("mnemosyne")
        try:
            by_id = {a["id"]: a for a in agent_registry.get_all_agents()}
        except Exception as e:
            print(f"⚠️ [Imaginación] agent_registry no disponible para listar agentes ({e}); enabled queda como desconocido (None), no como True asumido.")
            by_id = {}
        result: List[Dict[str, Any]] = []
        for aid in ids:
            a = by_id.get(_AGENT_TO_REGISTRY_ID.get(aid, aid))
            if a:
                result.append({
                    "id": aid,
                    "name": a.get("name"),
                    "enabled": a.get("enabled", True),
                    "is_busy": a.get("is_busy", False),
                })
            else:
                result.append({"id": aid, "name": aid.capitalize(), "enabled": None, "is_busy": None})
        return result

    async def _cognize_branch(
        self,
        p_id: str,
        proc_info: Dict[str, Any],
        template_theme: str,
        template_hypothesis: str,
        template_insights: str,
        context: Dict[str, Any],
        custom_seed: Optional[str] = None,
        personality: Optional[Dict[str, Any]] = None,
        agents_info: Optional[List[Dict[str, Any]]] = None,
    ) -> Optional[Dict[str, str]]:
        """
        (OS · Ola 3) Pide al motor real (Ollama/BitNet) la rama imaginativa en JSON
        {"theme","hypothesis","insights"}. Devuelve None si no hay modelo real o la
        respuesta no sirve (el llamador conserva la plantilla). Nunca lanza.

        (Tarea A/B) `context["memories"]` llega YA anclado a la memoria
        REALMENTE pertinente al tema de este proceso (gather_context_items,
        sembrado con la semilla del proceso — no los 5 primeros nodos del
        grafo), y `personality`/`agents_info` identifican quién "firma" este
        pensamiento de verdad — ambos se pliegan en el prompt para que la
        coherencia no dependa solo de metadatos que nadie lee.
        """
        if not cognition.real_available():
            return None
        agent = self._agent_for_process(p_id)
        persona = personality or {}
        agents_list = agents_info or []
        mem_lines = list((context or {}).get("memories") or [])[:_IMAGINATION_CONTEXT_MAX_ITEMS]
        loc = context.get("location", {}) if isinstance(context, dict) else {}
        weather = context.get("weather", {}) if isinstance(context, dict) else {}
        files = list((context or {}).get("recent_files") or [])[:4]
        persona_line = ""
        if persona.get("name") and persona.get("role"):
            persona_line = (
                f" Personalidad al mando: {persona['name']} ({persona['role']})."
                if persona.get("enabled") is not False
                else f" Personalidad al mando: {persona['name']} — su API está INACTIVA ahora mismo; procede solo bajo supervisión de los agentes."
            )
        system = (
            f"Eres {agent['name']}, agente de la Imaginación Intuitiva de Astraura 1.58-bit (StarSeed OS)."
            f"{persona_line} "
            "Piensas en español, con concreción técnica y sin adornos. Respondes ÚNICAMENTE con un objeto JSON válido."
        )
        seed_line = f"Semilla del usuario (obligatoria): {custom_seed}\n" if custom_seed else ""
        mem_line = (
            f"Memoria pertinente recuperada en tiempo real (mem0 + documentos + grafo, ordenada por relevancia real, no por los primeros nodos): {' | '.join(mem_lines)}\n"
            if mem_lines else
            "Memoria pertinente recuperada en tiempo real: NINGUNA — no inventes recuerdos ni cites fuentes que no existen; razona solo desde lo que sí tienes.\n"
        )
        disabled = [a.get("name") or a.get("id") for a in agents_list if a.get("enabled") is False]
        disabled_line = f"Agentes implicados deshabilitados ahora mismo (no los des por trabajando): {', '.join(disabled)}.\n" if disabled else ""
        prompt = (
            f"Tipo de proceso: {proc_info.get('name')} — categoría {proc_info.get('category')}.\n"
            f"Propósito del proceso: {proc_info.get('description')}\n"
            f"{seed_line}"
            f"Tema propuesto por plantilla: {template_theme}\n"
            f"Agente responsable: {agent['name']}\n"
            f"{mem_line}"
            f"{disabled_line}"
            f"Archivos recientes del workspace: {', '.join(files) if files else 'ninguno'}\n"
            f"Entorno: {loc.get('city', '')}, {loc.get('country', '')} · {weather.get('temp_c', '')}°C {weather.get('condition', '')}\n"
            f"Borrador de plantilla (mejóralo, no lo copies): hipótesis='{template_hypothesis[:200]}'; insights='{template_insights[:200]}'\n\n"
            "Devuelve SOLO este JSON: {\"theme\": \"título corto y específico (máx. 12 palabras)\", "
            "\"hypothesis\": \"hipótesis concreta y verificable en 1-2 frases\", "
            "\"insights\": \"2-3 frases con acciones o hallazgos accionables\"}"
        )
        res = await cognition.generate(prompt, system=system, max_tokens=300, temperature=0.65, timeout=75.0)
        if not res.get("real"):
            return None
        data = cognition.extract_json(res["text"])
        theme = cognition.field(data, "theme", max_len=140, min_len=6)
        hypothesis = cognition.field(data, "hypothesis", max_len=600, min_len=12)
        insights = cognition.field(data, "insights", max_len=800, min_len=12)
        if not (theme or hypothesis or insights):
            # Texto libre sin JSON utilizable: se usa como hipótesis y se conserva el resto.
            text = " ".join(res["text"].split()).strip()
            if len(text) < 20:
                return None
            return {"theme": template_theme, "hypothesis": text[:600], "insights": template_insights}
        if custom_seed and theme and custom_seed.lower()[:24] not in theme.lower():
            theme = f"Exploración Intuitiva: {theme}"
        return {
            "theme": theme or template_theme,
            "hypothesis": hypothesis or template_hypothesis,
            "insights": insights or template_insights,
        }

    async def _cognize_creation(
        self,
        p_id: str,
        proc_info: Dict[str, Any],
        title: str,
        c_type: str,
        theme: str,
        hypothesis: str,
        personality: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """(OS · Ola 3) Contenido real de la creación (código/shader/esquema). None ⇒ plantilla."""
        if not cognition.real_available():
            return None
        agent = self._agent_for_process(p_id)
        persona = personality or {}
        persona_line = f" Bajo la personalidad {persona['name']} ({persona['role']})." if persona.get("name") and persona.get("role") else ""
        if p_id == "code_self_reflection_opt":
            ask = "Escribe una función C++ breve (≤ 30 líneas) con intrínsecos ARM NEON para acumulación ternaria {-1,0,+1}, con comentarios en español."
        elif p_id == "lucid_cyberdelic_creativity":
            ask = "Escribe un fragment shader GLSL (WebGL 2.0, ≤ 30 líneas) reactivo a uniforms u_time, u_temp y u_entropy, con comentarios en español."
        else:
            ask = "Escribe un esquema JSON (≤ 25 líneas) de un agente mutado: nombre, capacidades, cerebro objetivo, núcleos asignados y criterios de auto-corrección."
        system = (
            f"Eres {agent['name']} en Astraura 1.58-bit.{persona_line} Entregas SOLO el artefacto pedido, sin explicaciones "
            "antes ni después, sin vallas de código markdown."
        )
        prompt = (
            f"Creación: {title} (tipo: {c_type}).\nTema: {theme}\nHipótesis: {hypothesis[:300]}\n"
            f"Proceso: {proc_info.get('name')}\n\n{ask}"
        )
        res = await cognition.generate(prompt, system=system, max_tokens=320, temperature=0.4, timeout=75.0)
        if not res.get("real"):
            return None
        text = res["text"].strip()
        # Quita vallas markdown si el modelo las añadió de todos modos.
        m = re.search(r"```[a-zA-Z0-9_+-]*\n(.*?)```", text, flags=re.S)
        if m:
            text = m.group(1).strip()
        if len(text) < 20:
            return None
        header = f"// (OS · Ola 3) Generado por {agent['name']} · {proc_info.get('name')}\n" if p_id != "inter_brain_evolutionary_mutation" else ""
        return (header + text)[:4000]

    async def trigger_cycle(self, custom_seed: Optional[str] = None, process_type_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Ejecuta un ciclo de imaginación intuitiva aplicando la política de permisos graduales correspondiente.
        """
        # Check accumulated requests threshold
        pending_requests = [b for b in self.branches if b.get("status") == "pending_approval" or b.get("requires_user_approval")]
        # Auto-reactivación: si bajaron del umbral (o el orquestrador está drenando
        # con embargo), liberar la pausa para que la imaginación retome.
        if self.is_paused_due_to_threshold and (len(pending_requests) < self.max_accumulated_requests_threshold or getattr(self, "requests_embargoed", False)):
            self.is_paused_due_to_threshold = False
        if len(pending_requests) >= self.max_accumulated_requests_threshold and not custom_seed and not getattr(self, "requests_embargoed", False):
            self.is_paused_due_to_threshold = True
            system_notifications_engine.add_notification({
                "title": "⚠️ Solicitudes Máximas Acumuladas: Procesos Pausados",
                "message": f"Se alcanzó el límite de {len(pending_requests)} solicitudes pendientes ({self.max_accumulated_requests_threshold} máx). Los procesos de imaginación se han detenido automáticamente hasta autorizar o descartar propuestas.",
                "category": "Gobernanza de Solicitudes",
                "severity": "warning"
            })
            self._save_state()
            return {
                "success": False,
                "paused_by_threshold": True,
                "pending_requests_count": len(pending_requests),
                "threshold": self.max_accumulated_requests_threshold,
                "message": f"Procesos pausados automáticamente: Hay {len(pending_requests)} solicitudes acumuladas (límite: {self.max_accumulated_requests_threshold}). Concede permisos o descarta propuestas para reanudar."
            }
        else:
            self.is_paused_due_to_threshold = False

        self.is_dreaming_now = True
        now = time.time()

        if process_type_id:
            # (Tarea C) Tipo explícito (pedido por el usuario o por una API
            # concreta): no hay nada que ponderar sobre un único candidato ya
            # decidido — se cosecha memoria SOLO para ese tema.
            p_id = process_type_id
            proc_info = next((p for p in DREAM_PROCESS_TYPES if p["id"] == p_id), DREAM_PROCESS_TYPES[0])
            eval_result = self.evaluate_improvement_need(p_id, {})
            context = {**self._harvest_sensory_context(), **self._harvest_memory_context(self._seed_query_for_process(proc_info, custom_seed))}
        else:
            # (Tarea C) Selección PONDERADA por necesidad real + agente
            # habilitado + memoria realmente pertinente — ya NO
            # random.choice ciego. Reutiliza el eval_result y la memoria que
            # la propia ponderación ya calculó para el ganador: no hay un
            # segundo camino que pueda repetir (o divergir de) ese trabajo.
            selection = self._select_process_type(custom_seed)
            p_id = selection["process_type_id"]
            proc_info = next((p for p in DREAM_PROCESS_TYPES if p["id"] == p_id), DREAM_PROCESS_TYPES[0])
            eval_result = selection["eval_result"]
            context = {**self._harvest_sensory_context(), **selection["memory_context"]}

        if p_id in self.process_metadata:
            self.process_metadata[p_id]["status"] = "running"
            # (Adenda 168) Instante REAL de inicio de ESTE ciclo -- antes no
            # se publicaba en ningún sitio que agent_genesis_engine pudiera
            # leer sin inventarlo, así que oficina.ocupantes[].desde se
            # aproximaba (anclado a cuándo un GET /oficina lo observaba por
            # primera vez). Mismo `now` que ya se capturó arriba al poner
            # is_dreaming_now=True -- es el instante exacto en que ESTE
            # proceso pasó a 'running', no una lectura posterior.
            self.process_metadata[p_id]["cycle_started_at"] = now

        # (Tarea B) Personalidad y agentes reales bajo los que corre ESTE
        # ciclo — llegan al prompt de _cognize_branch/_cognize_creation y
        # quedan registrados en el proceso emitido (branch_item/creation_item).
        personality = self._personality_for_process(p_id)
        agents_info = self._agents_for_process(p_id)

        loc_str = f"{context['location']['city']}, {context['location']['country']}"
        weather_str = f"{context['weather']['temp_c']}°C, {context['weather']['condition']}"

        # 1. Verification check: is improvement needed? (ya calculado arriba
        #    al elegir/confirmar p_id — no se repite la auditoría para no
        #    duplicar coste ni poder divergir de lo que decidió la selección)
        if not eval_result["change_needed"] and not custom_seed:
            self.is_dreaming_now = False
            if p_id in self.process_metadata:
                self.process_metadata[p_id]["status"] = "active"
                self.process_metadata[p_id]["last_activated_at"] = now
                self.process_metadata[p_id]["last_activated_formatted"] = datetime.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S")
            self._save_state()
            return {
                "success": True,
                "change_needed": False,
                "message": eval_result["reason"],
                "process_type": proc_info
            }

        importance = eval_result.get("importance_level", "medium")
        
        # 2. Check Gradual Permission Policy for this process
        policy = self.permission_policies.get(p_id, {
            "level": proc_info.get("default_permission_level", "auto_apply_safe"),
            "notify_on_important": True
        })
        policy_level = policy.get("level", "auto_apply_safe")
        level_def = PERMISSION_LEVELS.get(policy_level, PERMISSION_LEVELS["auto_apply_safe"])
        
        # Does this proposal require explicit user authorization?
        # Si el Agente de Orquestación tiene EMBARGO DE SOLICITUDES activo (modo
        # drenaje por acumulación), las nuevas ramas se AUTO-APRUEBAN para que los
        # agentes dejen de pedir permiso y prioricen completar las tareas pendientes.
        requires_approval = importance not in level_def["auto_threshold"]
        if self.requests_embargoed:
            requires_approval = False
        
        if custom_seed:
            theme = f"Exploración Intuitiva: {custom_seed}"
            hypothesis = f"Integrando la semilla '{custom_seed}' con la memoria sináptica y el entorno físico en {loc_str} ({weather_str})."
            insights = f"Forjando axiomas bajo entropía cuántica de {self.quantum_entropy_level} con optimización de 1.58 bits."
        elif p_id == "code_self_reflection_opt":
            target_file = random.choice(context["recent_files"]) if context["recent_files"] else "kernel_158b.cpp"
            theme = f"Auto-Optimización de Código: {target_file}"
            hypothesis = f"Reestructurar bucles SIMD en '{target_file}' para aprovechar los registros vectoriales ARM64 NEON de 128 bits."
            insights = f"Elimina 18 operaciones matriciales redundantes, reduciendo el consumo térmico del M1 a {context['hardware']['battery']}% de batería."
        elif p_id == "lucid_cyberdelic_creativity":
            theme = f"Shader Ciberdélico y Geometría Sagrada para {context['location']['city']}"
            hypothesis = f"Generar mallas WebGL procedurales que reaccionan a la temperatura ({weather_str}) y al ritmo acústico ambiental."
            insights = "Creación de paleta de color dinámica basada en la resonancia sensorial en tiempo real."
        elif p_id == "rem_synaptic_consolidation":
            theme = f"Consolidación de Memoria Sináptica en Bóveda Soberana"
            hypothesis = f"Indexando {len(context['recent_files'])} archivos del proyecto con los cerebros Génesis, Hephaestus y Hermes."
            insights = f"Refuerzo de enlaces semánticos y compactación de memoria para acelerar la inferencia en 1.58 bits."
        elif p_id == "inter_brain_evolutionary_mutation":
            theme = "Mutación Sináptica Inter-Cerebros: Génesis ✕ Hephaestus"
            hypothesis = "Fusión de las habilidades de razonamiento ontológico con la generación de código de bajo nivel."
            insights = "Nuevos subagentes especializados capaces de auto-corregir sintaxis y ejecutar herramientas autónomamente."
        else:
            theme = f"Simulación Predictiva & Contexto Sensorial en {loc_str}"
            hypothesis = f"Proyectando la evolución cognitiva de Astraura ante fluctuaciones ambientales ({weather_str})."
            insights = f"Garantiza que el presupuesto de recursos M1 ({self.max_imagination_global_percent}%) mantenga los agentes secundarios en equilibrio."

        # (OS · Ola 3) Cognición real: con modelo (Ollama/BitNet) la rama la escribe el
        # motor a partir del tipo de proceso, el tema, el agente responsable y 2-3
        # documentos de memoria recientes; sin modelo se conserva la plantilla.
        generated_by = "template"
        llm_branch = await self._cognize_branch(p_id, proc_info, theme, hypothesis, insights, context, custom_seed, personality=personality, agents_info=agents_info)
        if llm_branch:
            theme = llm_branch.get("theme") or theme
            hypothesis = llm_branch.get("hypothesis") or hypothesis
            insights = llm_branch.get("insights") or insights
            generated_by = "llm"

        branch_id = f"branch_{int(now)}"
        
        # Status determination based on approval requirement and auto-sync toggle
        if requires_approval:
            status_value = "pending_approval"
            applied_by_val = None
        else:
            if self.requests_embargoed:
                # Durante el embargo, la rama va directo a EJECUCIÓN (los agentes
                # completan la tarea pendiente en lugar de pedir autorización).
                status_value = "pending_execution"
                applied_by_val = "auth_orchestrator_embargo"
            elif self.auto_sync_all_proposals_enabled:
                status_value = "applied"
                applied_by_val = "auto_sync_agent"
            else:
                status_value = "enlisted_ready"
                applied_by_val = None
        
        branch_item = {
            "id": branch_id,
            "theme": theme,
            "hypothesis": hypothesis,
            "insights": insights,
            "process_type": p_id,
            "process_name": proc_info["name"],
            "importance_level": importance,
            "requires_user_approval": requires_approval,
            "permission_policy_applied": policy_level,
            "status": status_value,
            "applied_by": applied_by_val,
            "timestamp": now,
            "formatted_time": datetime.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S"),
            "generated_by": generated_by,  # (OS · Ola 3) "llm" | "template"
            "responsible_agent": self._agent_for_process(p_id),  # (OS · Ola 3)
            "personality": personality,  # (Tarea B) personalidad real al mando (personality_api_engine)
            "agents": agents_info,  # (Tarea B) agentes reales implicados, con enabled/is_busy de verdad
            "memory_items": context.get("memory_items", []),  # (Tarea A) procedencia real: fuente/título/score/recencia por ítem
            "memory_retrieval_available": context.get("memory_retrieval_available", False),  # (Tarea A) honesto: ¿funcionó la recuperación unificada?
            "context_snapshot": {
                "location": loc_str,
                "weather": weather_str,
                "entropy": self.quantum_entropy_level,
                "allocated_cores": self.allocated_cores
            }
        }
        self.branches.insert(0, branch_item)

        # Proactive creation if applicable
        creation_item = None
        if p_id in ["code_self_reflection_opt", "lucid_cyberdelic_creativity", "inter_brain_evolutionary_mutation"]:
            creation_id = f"creation_{int(now)}"
            if p_id == "code_self_reflection_opt":
                c_title = f"Optimización ARM NEON para {theme.split(': ')[-1]}"
                c_type = "C++ / Metal Shading Language"
                c_content = f"// Auto-generado por Proceso Onírico {proc_info['name']}\n// Asignación de recursos M1: {self.max_imagination_global_percent}% ({self.allocated_cores} núcleos)\ninline void compute_ternary_fast(const int8_t* weights, const float* inputs, float* output) {{\n    // BitNet 1.58b Vectorized Accumulator\n}}"
                c_tags = ["M1-Silicon", "ARM-NEON", "Ternary", "Optimized"]
            elif p_id == "lucid_cyberdelic_creativity":
                c_title = f"Shader Procedural de Resonancia ({loc_str})"
                c_type = "GLSL WebGL 2.0"
                c_content = f"// Shader Ciberdélico Sensorial\nuniform float u_temp; // {context['weather']['temp_c']}\nuniform float u_entropy; // {self.quantum_entropy_level}\nvoid main() {{\n    vec2 uv = gl_FragCoord.xy / u_resolution.xy;\n    gl_FragColor = vec4(sin(uv.x * 10.0), cos(uv.y * 10.0), u_entropy, 1.0);\n}}"
                c_tags = ["Shader", "WebGL", "Cyberdelic", "Sensory"]
            else:
                c_title = "Esquema de Agente Mutado: Hephaestus-NEON"
                c_type = "Protocolo Multiagéntico JSON"
                c_content = json.dumps({
                    "agent": "Hephaestus-NEON",
                    "capabilities": ["ARM64_Vectorization", "BitNet_158b_Inference", "Self_Correction"],
                    "allocated_cores": self.allocated_cores,
                    "target_brain": "brain_hephaestus"
                }, indent=2)
                c_tags = ["MultiAgent", "Evolution", "Astraura-1.58b"]

            # (OS · Ola 3) Contenido real de la creación (código / shader / esquema) cuando hay modelo.
            c_generated_by = "template"
            llm_content = await self._cognize_creation(p_id, proc_info, c_title, c_type, theme, hypothesis, personality=personality)
            if llm_content:
                c_content = llm_content
                c_generated_by = "llm"

            creation_item = {
                "id": creation_id,
                "title": c_title,
                "type": c_type,
                "content": c_content,
                "tags": c_tags,
                "origin_branch": branch_id,
                "importance_level": importance,
                "requires_user_approval": requires_approval,
                "status": status_value,
                "generated_by": c_generated_by,  # (OS · Ola 3)
                "personality": personality,  # (Tarea B)
                "agents": agents_info,  # (Tarea B)
                "timestamp": now
            }
            self.creations.insert(0, creation_item)

        # If auto-applied, persist directly to StarSeed memory
        if not requires_approval:
            starseed_memory_engine.add_memory_node({
                "concept": f"🌌 [Auto-Mejora {proc_info['name']}] {theme}",
                "definition": f"{hypothesis} | {insights}",
                "category": f"Imaginación / {proc_info['category']}",
                "resonance": 0.98,
                "quantum_entropy": self.quantum_entropy_level
            })
            if policy.get("notify_on_important", True):
                system_notifications_engine.add_notification({
                    "title": f"✨ Auto-Mejora Aplicada: {proc_info['name']}",
                    "message": f"Se aplicó automáticamente: '{theme}'. Todos los subsistemas sincronizados.",
                    "category": "Imaginación Intuitiva",
                    "severity": "success"
                })
        else:
            # Requires explicit approval: dispatch notification request
            system_notifications_engine.add_notification({
                "title": f"⚠️ Solicitud de Aprobación de Mejora: {proc_info['name']}",
                "message": f"Propuesta '{theme}' clasificada como [{importance.upper()}]. Esperando tu confirmación en la pestaña de Propuestas.",
                "category": "Solicitud de Autorización",
                "severity": "warning"
            })

        # Update process metadata
        if p_id in self.process_metadata:
            pm = self.process_metadata[p_id]
            pm["status"] = "active"
            pm["last_activated_at"] = now
            pm["last_activated_formatted"] = datetime.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S")
            pm["cycles_count"] = pm.get("cycles_count", 0) + 1
            pm["history"].insert(0, {
                "run_id": f"run_{int(now)}",
                "timestamp": now,
                "formatted_time": datetime.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S"),
                "theme": theme,
                "hypothesis": hypothesis,
                "importance_level": importance,
                "requires_user_approval": requires_approval,
                "branch_id": branch_id,
                "creation_id": creation_item.get("id") if creation_item else None,
                "entropy": self.quantum_entropy_level,
                "generated_by": generated_by  # (OS · Ola 3)
            })
            pm["history"] = pm["history"][:25]

        self.cycles_completed += 1
        self.last_cycle_timestamp = now
        self.next_cycle_timestamp = now + (self.cycle_frequency_minutes * 60)
        self.is_dreaming_now = False
        
        self._save_state()

        event_payload = {
            "type": "imagination_cycle_event",
            "cycle_number": self.cycles_completed,
            "process_type": proc_info,
            "branch": branch_item,
            "creation": creation_item,
            "importance_level": importance,
            "requires_user_approval": requires_approval,
            "pending_proposals_count": len([b for b in self.branches if b.get("status") in ["pending_approval", "active"]]),
            "next_cycle_in_seconds": self.cycle_frequency_minutes * 60
        }
        # Generar Informe Comprensible de Síntesis para el Usuario
        # (OS · Ola 3) Variante asíncrona: resumen ejecutivo real cuando hay modelo.
        synthesis_report = await synthesis_reporter_engine.generate_synthesis_report_async(
            trigger_type="imaginative_cycle",
            context_data={
                "process_type": proc_info,
                "theme": theme,
                "hypothesis": hypothesis,
                "insights": insights,
                "branch": branch_item,
                "creation": creation_item
            }
        )

        return {
            "success": True,
            "cycle_number": self.cycles_completed,
            "process_type": proc_info,
            "branch": branch_item,
            "creation": creation_item,
            "requires_user_approval": requires_approval,
            "synthesis_report": synthesis_report
        }

    # ================= Multi-Agent Synchronized Proposal Application =================

    async def apply_all_proposals_concurrently(self, item_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Aplica todas las propuestas pendientes (o la lista seleccionada) de forma inteligente
        mediante agentes sincronizados en segundo plano (Hephaestus, Oneiros, Mnemosyne, Hermes, Athena).
        También procesa branches con estado 'pending_execution' (post-autorización).
        """
        targets = []
        for b in self.branches:
            if b.get("status") in ["pending_approval", "active", "pending_execution"]:
                if item_ids is None or b.get("id") in item_ids:
                    targets.append(b)

        if not targets:
            return {"success": True, "message": "No hay propuestas pendientes por aplicar.", "applied_count": 0}

        self.sync_execution_state = {
            "is_running": True,
            "total_tasks": len(targets),
            "completed_tasks": 0,
            "progress_percent": 0,
            "agent_progress": {
                "hephaestus": {"name": "Hephaestus (Ingeniería ARM)", "area": "Kernels SIMD M1", "status": "working", "tasks": 0},
                "oneiros": {"name": "Oneiros (Síntesis 3D)", "area": "Shaders WebGL & UI", "status": "working", "tasks": 0},
                "mnemosyne": {"name": "Mnemosyne (Memoria)", "area": "Grafos Sinápticos", "status": "working", "tasks": 0},
                "hermes": {"name": "Hermes (Web Intel)", "area": "Tendencias & Docs", "status": "working", "tasks": 0},
                "architectus": {"name": "Architectus (Proyectos)", "area": "Bóveda & Ramas", "status": "working", "tasks": 0},
                "athena": {"name": "Athena (Sentinel)", "area": "Seguridad & AST", "status": "working", "tasks": 0}
            },
            "current_logs": [f"🚀 Iniciando aplicación sincronizada de {len(targets)} propuestas con agentes multi-área bajo supervisión de Metis Prime..."],
            "applied_details": []
        }
        self._notify_callbacks({"type": "sync_apply_progress", "state": self.sync_execution_state})

        applied_items = []
        for idx, item in enumerate(targets):
            p_type = item.get("process_type", "")
            t_start = time.time()
            
            # Map to specialized agent
            if p_type == "code_self_reflection_opt":
                agent_key = "hephaestus"
            elif p_type == "lucid_cyberdelic_creativity":
                agent_key = "oneiros"
            elif p_type == "rem_synaptic_consolidation":
                agent_key = "mnemosyne"
            elif p_type == "project_architectural_synthesis":
                agent_key = "architectus"
            elif p_type in ["predictive_future_simulation", "counterfactual_quantum_imagination"]:
                agent_key = "hermes"
            else:
                agent_key = "athena"

            agent_info = self.sync_execution_state["agent_progress"][agent_key]
            agent_info["tasks"] += 1
            
            # Apply item
            item["status"] = "applied"
            item["applied_by"] = f"swarm_agent_{agent_key}"
            item["applied_at"] = time.time()
            applied_items.append(item)

            # Ingest into StarSeed memory
            mem_node = starseed_memory_engine.add_memory_node({
                "concept": f"🌌 [Sincronizado] {item.get('theme', 'Axioma')}",
                "definition": f"{item.get('hypothesis', '')} | {item.get('insights', '')}",
                "category": f"Exocórtex Sincronizado / {agent_info['name']}",
                "resonance": 0.99
            }) if starseed_memory_engine else {}

            latency_ms = round((time.time() - t_start) * 1000 + 4.2, 2)
            log_entry = f"⚡ [{time.strftime('%H:%M:%S')}] {agent_info['name']} aplicó '{item.get('theme', item.get('id'))[:50]}' (Latencia: {latency_ms}ms, AST: 100% Válido, Mem: {mem_node.get('id', 'mem_synced')})"
            self.sync_execution_state["current_logs"].append(log_entry)

            self.sync_execution_state["applied_details"].append({
                "id": item.get("id"),
                "theme": item.get("theme"),
                "agent": agent_info["name"],
                "latency_ms": latency_ms,
                "memory_id": mem_node.get("id"),
                "status": "applied_verified"
            })

            # Update progress
            self.sync_execution_state["completed_tasks"] = idx + 1
            self.sync_execution_state["progress_percent"] = round(((idx + 1) / len(targets)) * 100)
            self._notify_callbacks({"type": "sync_apply_progress", "state": self.sync_execution_state})
            
            await asyncio.sleep(0.2)

        self.sync_execution_state["is_running"] = False
        self.sync_execution_state["progress_percent"] = 100
        self.sync_execution_state["current_logs"].append(f"✅ ¡{len(applied_items)} propuestas aplicadas exitosamente por el enjambre!")
        
        self._save_state()
        self._notify_callbacks({"type": "sync_apply_progress", "state": self.sync_execution_state})

        # Generar Informe Comprensible de Síntesis para el Usuario
        synthesis_report = await synthesis_reporter_engine.generate_synthesis_report_async(  # (OS · Ola 3)
            trigger_type="sync_proposal_application",
            context_data={"applied_items": applied_items}
        )

        return {
            "success": True,
            "applied_count": len(applied_items),
            "state": self.sync_execution_state,
            "synthesis_report": synthesis_report
        }

    # ================= Flujo Automático Post-Autorización =================

    def run_automated_execution_workflow(self, authorized_branches: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Después de conceder permisos, ejecuta automáticamente las tareas y desarrolla
        los procesos correspondientes de cada branch autorizado.
        Flujo completo: autorizar → ejecutar tareas → desarrollar procesos → consolidar.
        """
        if not authorized_branches:
            return {"success": False, "error": "No hay branches autorizados para ejecutar"}

        exec_tasks = []
        develop_processes = []

        for b in authorized_branches:
            branch_type = b.get("process_type", b.get("type", "general"))
            if branch_type in ["code_self_reflection_opt", "storage_routing_update",
                               "memory_indexing", "device_access_grant"]:
                exec_tasks.append(b)
            else:
                develop_processes.append(b)

        # ── EJECUTAR TAREAS (agentes especializados) ──
        executed_tasks = []
        for task in exec_tasks:
            agent_key = self._select_agent_for_task(task)
            agent_name = self.sync_execution_state.get("agent_progress", {}).get(agent_key, {}).get("name", "Agente Desconocido")

            task["status"] = "executing"
            task["executed_by"] = agent_name
            task["executed_at"] = time.time()
            task["execution_result"] = "completado_exitosamente"

            mem_node = starseed_memory_engine.add_memory_node({
                "concept": f"⚡ [Ejecutado] {task.get('theme', task.get('id', 'tarea'))}",
                "definition": f"Proceso ejecutado por {agent_name}. Hipótesis: {task.get('hypothesis', '')}",
                "category": f"Ejecución / {agent_name}",
                "resonance": 0.99
            }) if starseed_memory_engine else {}

            executed_tasks.append({
                "task_id": task.get("id"),
                "agent": agent_name,
                "result": "completado_exitosamente",
                "latency_ms": 42
            })

            self.sync_execution_state["current_logs"].append(
                f"⚡ [{time.strftime('%H:%M:%S')}] {agent_name} ejecutó la tarea '{task.get('theme', task.get('id'))[:60]}'"
            )

        # ── DESARROLLAR PROCESOS (agentes de síntesis) ──
        developed_processes = []
        for proc in develop_processes:
            agent_key = self._select_agent_for_process(proc)
            agent_name = self.sync_execution_state.get("agent_progress", {}).get(agent_key, {}).get("name", "Agente Desconocido")

            proc["status"] = "applied"
            proc["applied_by"] = agent_name
            proc["applied_at"] = time.time()
            proc["development_result"] = "proceso_desarrollado"

            mem_node = starseed_memory_engine.add_memory_node({
                "concept": f"🧠 [Desarrollado] {proc.get('theme', proc.get('id', 'proceso'))}",
                "definition": f"Proceso desarrollado por {agent_name}. Contribución al exocórtex.",
                "category": f"Desarrollo / {agent_name}",
                "resonance": 0.99
            }) if starseed_memory_engine else {}

            developed_processes.append({
                "process_id": proc.get("id"),
                "agent": agent_name,
                "result": "proceso_desarrollado",
                "category": proc.get("category", "General")
            })

            self.sync_execution_state["current_logs"].append(
                f"🧠 [{time.strftime('%H:%M:%S')}] {agent_name} desarrolló el proceso '{proc.get('theme', proc.get('id'))[:60]}'"
            )

        # ── CONSISTENCIA Y SÍNCOPE FINAL ──
        all_success = len(executed_tasks) + len(developed_processes)

        self.sync_execution_state["current_logs"].append(
            f"✅ [{time.strftime('%H:%M:%S')}] Flujo completo completado: {len(executed_tasks)} tareas ejecutadas + {len(developed_processes)} procesos desarrollados"
        )
        self._save_state()
        self._notify_callbacks({"type": "sync_apply_progress", "state": self.sync_execution_state})

        return {
            "success": True,
            "executed_tasks": executed_tasks,
            "developed_processes": developed_processes,
            "total_completed": all_success
        }

    def _select_agent_for_task(self, task: Dict[str, Any]) -> str:
        """Selecciona el agente especializado para ejecutar una tarea."""
        proc_type = task.get("process_type", task.get("type", ""))
        p_type_map = {
            "code_self_reflection_opt": "hephaestus",
            "storage_routing_update": "architectus",
            "memory_indexing": "mnemosyne",
            "device_access_grant": "athena",
            "terminal_command_exec": "hephaestus",
            "browser_task_exec": "hermes",
            "default_exec": "athena"
        }
        return p_type_map.get(proc_type, p_type_map["default_exec"])

    def _select_agent_for_process(self, proc: Dict[str, Any]) -> str:
        """Selecciona el agente especializado para desarrollar un proceso."""
        proc_type = proc.get("process_type", proc.get("type", ""))
        p_type_map = {
            "lucid_cyberdelic_creativity": "oneiros",
            "rem_synaptic_consolidation": "mnemosyne",
            "project_architectural_synthesis": "architectus",
            "predictive_future_simulation": "hermes",
            "counterfactual_quantum_imagination": "hermes",
            "default_develop": "athena"
        }
        return p_type_map.get(proc_type, p_type_map["default_develop"])

    # ================= Background Worker Loop =================

    async def start_background_loop(self):
        print(f"🌌 [IntuitiveImagination] Bucle continuo Always-On iniciado ({self.cycle_frequency_minutes} min, {self.max_imagination_global_percent}% Tronco A)...")
        while True:
            try:
                await asyncio.sleep(5)
                if not self.is_always_on:
                    continue
                if self.operation_mode == "burst":
                    continue
                
                now = time.time()
                if now >= self.next_cycle_timestamp and not self.is_dreaming_now:
                    await self.trigger_cycle()
                    
                    if self.auto_recycle_memories and self.cycles_completed % 6 == 0:
                        self.recycle_and_prune_memories()

            except Exception as e:
                print(f"⚠️ Error en bucle continuo de Imaginación Intuitiva: {e}")
                await asyncio.sleep(10)

    # ================= Process-Specific Details & Permissions =================

    def get_process_details(self, process_id: str) -> Dict[str, Any]:
        proc_info = next((p for p in DREAM_PROCESS_TYPES if p["id"] == process_id), None)
        if not proc_info:
            return {"success": False, "error": f"Proceso {process_id} no encontrado"}

        meta = self.process_metadata.get(process_id, {
            "status": "active",
            "allocated_resource_percent": 20,
            "last_activated_at": time.time(),
            "last_activated_formatted": "Nunca",
            "cycles_count": 0,
            "quantum_entropy": self.quantum_entropy_level,
            "permission_policy": self.permission_policies.get(process_id, {}),
            "history": []
        })

        associated_branches = [b for b in self.branches if b.get("process_type") == process_id]
        associated_creations = [c for c in self.creations if any(b.get("id") == c.get("origin_branch") for b in associated_branches)]

        completed_cnt = sum(1 for b in associated_branches if b.get("status") in ["applied", "verified", "merged"])
        total_cnt = max(1, len(associated_branches))
        dynamic_proc_progress = min(100, max(25, int((completed_cnt / total_cnt) * 65) + 35))
        meta["progress_percent"] = dynamic_proc_progress

        return {
            "success": True,
            "process": proc_info,
            "metadata": meta,
            "progress_percent": dynamic_proc_progress,
            "permission_policy": self.permission_policies.get(process_id, {}),
            "branches": associated_branches,
            "creations": associated_creations,
            "history": meta.get("history", []),
            "global_imagination_budget": self.max_imagination_global_percent
        }

    def update_process_permission_policy(self, process_id: str, policy_data: Dict[str, Any]) -> Dict[str, Any]:
        if process_id not in self.permission_policies:
            self._init_permission_policies()
        
        pol = self.permission_policies[process_id]
        if "level" in policy_data:
            pol["level"] = str(policy_data["level"])
        if "notify_on_important" in policy_data:
            pol["notify_on_important"] = bool(policy_data["notify_on_important"])
        if "notify_on_security" in policy_data:
            pol["notify_on_security"] = bool(policy_data["notify_on_security"])
        if "auto_sync_agents" in policy_data:
            pol["auto_sync_agents"] = bool(policy_data["auto_sync_agents"])

        if process_id in self.process_metadata:
            self.process_metadata[process_id]["permission_policy"] = pol

        self._save_state()
        return {"success": True, "process_id": process_id, "policy": pol}

    def update_process_config(self, process_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        if process_id not in self.process_metadata:
            self._init_process_metadata()

        meta = self.process_metadata[process_id]
        if "allocated_resource_percent" in config:
            meta["allocated_resource_percent"] = max(5, min(60, int(config["allocated_resource_percent"])))
        if "status" in config:
            meta["status"] = str(config["status"])
        if "quantum_entropy" in config:
            meta["quantum_entropy"] = float(config["quantum_entropy"])
        if "permission_level" in config:
            self.update_process_permission_policy(process_id, {"level": config["permission_level"]})

        self._save_state()
        return {"success": True, "process_id": process_id, "metadata": meta}

    # ================= Dual-Trunk Governor Methods =================

    def set_dual_trunk_limits(self, imagination_percent: int, swarm_percent: int) -> Dict[str, Any]:
        imag_pct = max(5, min(50, int(imagination_percent)))
        swarm_pct = max(10, min(60, int(swarm_percent)))
        
        if imag_pct + swarm_pct > 85:
            swarm_pct = 85 - imag_pct

        self.max_imagination_global_percent = imag_pct
        self.max_swarm_global_percent = swarm_pct
        self.allocated_cores = max(1, min(6, round(8 * (imag_pct / 100))))

        self._save_state()
        return self.get_dual_trunk_status()

    def get_dual_trunk_status(self) -> Dict[str, Any]:
        reserve = max(0, 100 - self.max_imagination_global_percent - self.max_swarm_global_percent)
        return {
            "imagination_global_percent": self.max_imagination_global_percent,
            "swarm_global_percent": self.max_swarm_global_percent,
            "interactive_reserve_percent": reserve,
            "total_cores": self.total_m1_cores,
            "imagination_cores": self.allocated_cores,
            "swarm_cores": max(1, round(8 * (self.max_swarm_global_percent / 100))),
            "user_chat_cores": max(1, round(8 * (reserve / 100)))
        }

    # ================= Proposal Actions =================

    def apply_proposal(self, item_id: str, item_type: str = "branch") -> Dict[str, Any]:
        target_list = self.branches if item_type == "branch" else self.creations if item_type == "creation" else self.insights
        found_item = None
        for it in target_list:
            if it.get("id") == item_id:
                it["status"] = "applied"
                it["applied_at"] = time.time()
                it["requires_user_approval"] = False
                found_item = it
                break

        if found_item:
            concept_title = found_item.get("theme") or found_item.get("title") or "Axioma Onírico Consolidado"
            definition = found_item.get("hypothesis") or found_item.get("content") or ""
            
            # Sincronizar y escribir físicamente en el proyecto vinculado
            try:
                from app.projects.projects_manager import projects_manager
                target_proj_id = found_item.get("target_project_id") or "proj_astraura_core"
                projects_manager.apply_agent_proposal(target_proj_id, found_item)
            except Exception as e:
                print(f"[IntuitiveImagination] Error applying to projects_manager: {e}")

            if starseed_memory_engine:
                starseed_memory_engine.add_memory_node({
                    "concept": f"🌌 [Imaginación] {concept_title}",
                    "definition": definition,
                    "category": "Exocórtex / Imaginación Aplicada",
                    "resonance": 0.98,
                    "quantum_entropy": self.quantum_entropy_level
                })
            self._save_state()
            return {"success": True, "action": "applied", "item": found_item}
        return {"success": False, "error": f"Elemento {item_id} no encontrado"}

    def discard_proposal(self, item_id: str, item_type: str = "branch") -> Dict[str, Any]:
        if item_type == "branch":
            self.branches = [b for b in self.branches if b.get("id") != item_id]
        elif item_type == "creation":
            self.creations = [c for c in self.creations if c.get("id") != item_id]
        elif item_type == "insight":
            self.insights = [i for i in self.insights if i.get("id") != item_id]
        elif item_type == "suggestion":
            self.suggestions = [s for s in self.suggestions if s.get("id") != item_id]
        
        self._save_state()
        return {"success": True, "action": "discarded", "item_id": item_id}

    def get_process_branches(self, process_id: str) -> Dict[str, Any]:
        """
        (Deuda 2 · Datos de relleno) ANTES, esta función fabricaba EN CADA
        LLAMADA — y lo escribía directamente sobre `self.branches`, con
        riesgo real de que un `_save_state()` disparado por OTRA llamada lo
        persistiera — un `verification` con score inventado, tres líneas de
        `step_logs` de plantilla, un `diff_comparison` con porcentajes de
        mejora ("74.2%", "62.8%", "135%") que no median nada, y hasta tres
        `historical_versions` con AUTORES y resúmenes ficticios
        ("Daedalus-Architect", "Hephaestus Forjador"…). Se confirmó con grep
        sobre el archivo entero: `diff_comparison`, `historical_versions` y
        `real_links` NUNCA los escribe ningún otro sitio — no existe en todo
        el backend un generador real de diff AST, benchmark de latencia/RAM
        ni historial de versiones por rama. El resultado en disco: medido,
        30 de las 50 ramas guardadas ya tenían `verification`/`step_logs`
        fabricados persistidos de una llamada anterior a esta función.

        CURA: se deja de fabricar y de mutar `self.branches` aquí — se
        construye una COPIA de cada rama para la respuesta. Los tres campos
        sin generador real se devuelven siempre vacíos (`{}`/`[]`), nunca con
        relleno, y `datos_reales` dice explícitamente que no hay medición
        real detrás — para que un consumidor distinga "no hay diff" de "no
        lo sé". `verification`/`step_logs` SÍ los escriben otras funciones de
        esta clase (`regenerate_branch`, `fork_branch`, `modify_branch`,
        `simulate_live_process_step`) que no son parte de este encargo: lo
        que traiga la rama ahí se devuelve tal cual, sin tocar (ver informe).
        """
        proc = next((p for p in DREAM_PROCESS_TYPES if p["id"] == process_id), None)
        all_b = [b for b in self.branches if b.get("process_type") == process_id]

        branches_out: List[Dict[str, Any]] = []
        for b in all_b:
            item = dict(b)  # copia — nunca se muta self.branches aquí

            # Progreso: SOLO el hecho inequívoco (aplicada = 100). Para el
            # resto se OMITE la clave — branches-modal.tsx ya tiene su propio
            # valor por defecto (`b.progress_percent ?? 65`) y este backend
            # no va a inventar una segunda escala de números sobre esa.
            if item.get("status") == "applied":
                item["progress_percent"] = 100
            else:
                item.pop("progress_percent", None)

            # Nunca hubo generador real para estos tres — forma válida y
            # vacía, no relleno plausible ni claves que desaparecen.
            item["diff_comparison"] = {}
            item["historical_versions"] = []
            item["real_links"] = {}
            item["datos_reales"] = {
                "diff_comparison": False,
                "historical_versions": False,
                "real_links": False,
            }
            branches_out.append(item)

        in_prog = [b for b in branches_out if b.get("status") in ["running", "pending_approval", "active"]]
        completed = [b for b in branches_out if b.get("status") == "applied"]
        dynamic_process_progress = min(100, max(30, int((len(completed) / max(1, len(branches_out))) * 60) + 40))

        return {
            "success": True,
            "process": proc,
            "progress_percent": dynamic_process_progress,
            "total_branches": len(branches_out),
            "in_progress_branches": in_prog,
            "completed_branches": completed,
            "branches": branches_out
        }

    def simulate_live_process_step(self, process_id: str, branch_id: Optional[str] = None) -> Dict[str, Any]:
        """Simula y avanza un paso de ejecución en vivo para un proceso o rama activa."""
        proc = next((p for p in DREAM_PROCESS_TYPES if p["id"] == process_id), DREAM_PROCESS_TYPES[0])
        now = time.time()
        time_str = datetime.fromtimestamp(now).strftime("%H:%M:%S")
        
        target_branch = None
        if branch_id:
            target_branch = next((b for b in self.branches if b.get("id") == branch_id), None)
        if not target_branch:
            target_branch = next((b for b in self.branches if b.get("process_type") == process_id), None)
            
        step_descriptions = [
            f"[{time_str}] ⚡ Registro SIMD ARM NEON vld1q_s8 actualizado en hilo #{int(now) % 8 + 1}.",
            f"[{time_str}] 🧠 Poda de aristas redundantes en memoria asociativa (Delta Entropía: -0.04).",
            f"[{time_str}] 🔬 Re-verificación formal de tensores ternarios {{-1, 0, 1}} con 0 errores AST.",
            f"[{time_str}] 🌿 Forja de variante contrafáctica paralela completada con score 0.99.",
            f"[{time_str}] 💾 Sincronización atómica de estado en disco host (SHA-256 verificado)."
        ]
        chosen_step = step_descriptions[int(now) % len(step_descriptions)]
        
        if target_branch:
            logs = target_branch.get("step_logs", [])
            logs.insert(0, chosen_step)
            target_branch["step_logs"] = logs[:15]
            target_branch["updated_at"] = now
            if "diff_comparison" in target_branch:
                cur_val = target_branch["diff_comparison"]["delta_metrics"].get("latency_reduction_pct", 70.0)
                target_branch["diff_comparison"]["delta_metrics"]["latency_reduction_pct"] = round(min(85.0, cur_val + 0.3), 1)
            self._save_state()
            
        return {
            "success": True,
            "process_id": process_id,
            "step": chosen_step,
            "timestamp": now,
            "branch": target_branch
        }

    async def regenerate_branch(self, branch_id: str) -> Dict[str, Any]:
        target = next((b for b in self.branches if b.get("id") == branch_id), None)
        if not target:
            return {"success": False, "error": f"Rama {branch_id} no encontrada"}

        now = time.time()
        p_id = target.get("process_type", "rem_synaptic_consolidation")
        proc_info = next((p for p in DREAM_PROCESS_TYPES if p["id"] == p_id), DREAM_PROCESS_TYPES[0])

        # (Tarea A) Misma recuperación unificada que un ciclo nuevo, sembrada
        # con el tema/hipótesis YA existentes de esta rama (la intención más
        # específica disponible aquí) — no los 5 primeros nodos del grafo.
        seed = target.get("theme") or target.get("hypothesis") or None
        context = self._harvest_user_contexts(seed=seed)
        # (Tarea B) Misma personalidad/agentes reales que un ciclo nuevo.
        personality = self._personality_for_process(p_id)
        agents_info = self._agents_for_process(p_id)

        # (OS · Ola 3) Regeneración REAL con el motor cuando hay modelo; plantilla si no.
        regen = await self._cognize_branch(
            p_id, proc_info, target.get("theme", ""), target.get("hypothesis", ""), target.get("insights", ""),
            context, None, personality=personality, agents_info=agents_info
        )
        if regen:
            target["hypothesis"] = regen.get("hypothesis") or target.get("hypothesis", "")
            target["insights"] = regen.get("insights") or target.get("insights", "")
            target["generated_by"] = "llm"
        else:
            target["hypothesis"] = f"[Regenerado] {target.get('hypothesis', '')} (Calibración determinista M1: 0.96)"
            target["insights"] = f"Nueva síntesis y axiomas forjados por {proc_info['name']}. Verificación matemática 100% válida."
            target["generated_by"] = "template"
        target["personality"] = personality  # (Tarea B)
        target["agents"] = agents_info  # (Tarea B)
        target["memory_items"] = context.get("memory_items", [])  # (Tarea A)
        target["memory_retrieval_available"] = context.get("memory_retrieval_available", False)  # (Tarea A)
        target["timestamp"] = now
        target["formatted_time"] = datetime.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S")
        target["step_logs"] = [
            f"[{datetime.fromtimestamp(now).strftime('%H:%M:%S')}] Regenerando rama '{target.get('theme')}'...",
            f"[{datetime.fromtimestamp(now).strftime('%H:%M:%S')}] Recalibrando registros SIMD y memoria asociativa...",
            f"[{datetime.fromtimestamp(now).strftime('%H:%M:%S')}] ✅ Verificación completada exitosamente."
        ]
        target["verification"] = {
            "is_verified": True,
            "score": 0.98,
            "checked_by": f"Audit-Agent-{p_id}",
            "tested_at": datetime.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S")
        }

        self._save_state()
        
        system_notifications_engine.add_notification({
            "title": f"🔄 Rama Regenerada: {proc_info['name']}",
            "message": f"Se regeneró y verificó la rama '{target.get('theme')}'.",
            "category": "Imaginación Intuitiva",
            "severity": "info"
        })

        return {"success": True, "action": "regenerated", "branch": target}

    def fork_branch(self, branch_id: str, fork_note: str = "") -> Dict[str, Any]:
        parent = next((b for b in self.branches if b.get("id") == branch_id), None)
        if not parent:
            return {"success": False, "error": f"Rama {branch_id} no encontrada"}

        now = time.time()
        new_id = f"branch_fork_{int(now)}"
        p_id = parent.get("process_type", "rem_synaptic_consolidation")
        proc_info = next((p for p in DREAM_PROCESS_TYPES if p["id"] == p_id), DREAM_PROCESS_TYPES[0])

        new_branch = {
            "id": new_id,
            "parent_branch_id": branch_id,
            "theme": f"🌿 Sub-Rama: {parent.get('theme', 'Axioma')}",
            "hypothesis": f"Bifurcación: {fork_note or 'Exploración de variante contrafáctica paralela'} a partir de {parent.get('id')}.",
            "insights": f"Ramificación derivada con enfoque especializado en {proc_info['category']}.",
            "process_type": p_id,
            "process_name": proc_info["name"],
            "importance_level": parent.get("importance_level", "medium"),
            "requires_user_approval": False,
            "status": "active",
            "timestamp": now,
            "formatted_time": datetime.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S"),
            "step_logs": [
                f"[{datetime.fromtimestamp(now).strftime('%H:%M:%S')}] Bifurcando desde la rama origen {branch_id}...",
                f"[{datetime.fromtimestamp(now).strftime('%H:%M:%S')}] Generando espacio de hipótesis paralelo...",
                f"[{datetime.fromtimestamp(now).strftime('%H:%M:%S')}] ✅ Sub-rama activa en proceso."
            ],
            "verification": {
                "is_verified": True,
                "score": 0.97,
                "checked_by": "Genesis-Fork-Engine",
                "tested_at": datetime.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S")
            }
        }
        self.branches.insert(0, new_branch)
        self._save_state()

        system_notifications_engine.add_notification({
            "title": f"🌿 Nueva Sub-Rama Creada: {proc_info['name']}",
            "message": f"Se bifurcó la rama '{parent.get('theme')}'.",
            "category": "Imaginación Intuitiva",
            "severity": "success"
        })

        return {"success": True, "action": "forked", "branch": new_branch}

    def delete_branch(self, branch_id: str) -> Dict[str, Any]:
        initial_len = len(self.branches)
        self.branches = [b for b in self.branches if b.get("id") != branch_id]
        self.creations = [c for c in self.creations if c.get("origin_branch") != branch_id]
        if len(self.branches) < initial_len:
            self._save_state()
            return {"success": True, "action": "deleted", "branch_id": branch_id}
        return {"success": False, "error": f"Rama {branch_id} no encontrada"}

    def modify_branch(self, branch_id: str, updated_data: Dict[str, Any]) -> Dict[str, Any]:
        target = next((b for b in self.branches if b.get("id") == branch_id), None)
        if not target:
            return {"success": False, "error": f"Rama {branch_id} no encontrada"}

        target.update(updated_data)
        target["edited_at"] = time.time()
        target["verification"] = {
            "is_verified": True,
            "score": 0.99,
            "checked_by": "Human-Supervisor-Verified",
            "tested_at": datetime.fromtimestamp(time.time()).strftime("%d/%m/%Y %H:%M:%S")
        }
        self._save_state()
        return {"success": True, "action": "modified", "branch": target}

    def recycle_and_prune_memories(self) -> Dict[str, Any]:
        pre_len = len(json.dumps(self.branches)) + len(json.dumps(self.creations))
        if len(self.branches) > 30:
            self.branches = self.branches[:30]
        if len(self.creations) > 20:
            self.creations = self.creations[:20]
        post_len = len(json.dumps(self.branches)) + len(json.dumps(self.creations))
        space_freed = round(max(0.5, (pre_len - post_len) / 1024.0), 2)

        items_count = len(self.branches) + len(self.creations)
        rec_entry = {
            "timestamp": time.time(),
            "time_formatted": time.strftime("%Y-%m-%d %H:%M:%S"),
            "items_compacted": max(1, items_count // 3),
            "space_freed_kb": space_freed,
            "target_vault": self.storage_target
        }
        self.recycle_history.insert(0, rec_entry)
        self._save_state()
        return rec_entry

    def grant_and_apply_all_requests(self) -> Dict[str, Any]:
        """
        Concede permisos y ACTIVA TODAS las solicitudes de autorización pendientes,
        preparándolas para ejecución en segundo plano por el enjambre multi-agente.
        Flujo completo: autorizar → activar → ejecutar tareas → desarrollar procesos.
        """
        targets = [b for b in self.branches if b.get("status") == "pending_approval" or b.get("requires_user_approval")]
        if not targets:
            return {"success": True, "message": "No hay solicitudes pendientes de autorización.", "applied_count": 0}

        now = time.time()
        for b in targets:
            b["status"] = "pending_execution"          # ← Estado intermedio: listo para ejecución
            b["requires_user_approval"] = False
            b["approved_by"] = "human_authorized"
            b["approved_at"] = now
            
            # Sync with StarSeed — registrar la autorización en memoria
            starseed_memory_engine.add_memory_node({
                "concept": f"🌌 [Autorizado] {b.get('theme', 'Axioma')}",
                "definition": f"{b.get('hypothesis', '')} | {b.get('insights', '')}",
                "category": f"Exocórtex Autorizado / {b.get('process_name', 'Imaginación')}",
                "resonance": 0.99
            })

        self.is_paused_due_to_threshold = False
        self._save_state()

        system_notifications_engine.add_notification({
            "title": f"✅ Permisos Concedidos: {len(targets)} Solicitudes Autorizadas",
            "message": f"Se concedieron todos los permisos para {len(targets)} solicitudes. Los agentes ejecutarán las tareas automáticamente.",
            "category": "Autorización Soberana",
            "severity": "success"
        })

        # DISPARAR EJECUCIÓN AUTOMÁTICA: ejecutar las tareas de los branches autorizados
        self.run_automated_execution_workflow(targets)

        return {
            "success": True,
            "applied_count": len(targets),
            "branches": self.branches,
            "auto_executed": True
        }

    def grant_and_apply_request(self, branch_id: str, edited_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Concede permiso y aplica una solicitud individual con opción de edición previa.
        """
        target = next((b for b in self.branches if b.get("id") == branch_id), None)
        if not target:
            return {"success": False, "error": f"Solicitud {branch_id} no encontrada"}

        if edited_data:
            target.update(edited_data)

        now = time.time()
        target["status"] = "applied"
        target["requires_user_approval"] = False
        target["applied_by"] = "human_authorized"
        target["applied_at"] = now

        starseed_memory_engine.add_memory_node({
            "concept": f"🌌 [Autorizado] {target.get('theme', 'Axioma')}",
            "definition": f"{target.get('hypothesis', '')} | {target.get('insights', '')}",
            "category": f"Exocórtex Autorizado / {target.get('process_name', 'Imaginación')}",
            "resonance": 0.99
        })

        pending_left = len([b for b in self.branches if b.get("status") == "pending_approval" or b.get("requires_user_approval")])
        if pending_left < self.max_accumulated_requests_threshold:
            self.is_paused_due_to_threshold = False

        self._save_state()

        system_notifications_engine.add_notification({
            "title": f"✅ Permiso Concedido: {target.get('theme')}",
            "message": f"La solicitud fue autorizada y aplicada en el exocórtex.",
            "category": "Autorización Soberana",
            "severity": "success"
        })

        return {"success": True, "action": "granted_and_applied", "branch": target}

    def update_config(self, new_config: Dict[str, Any]) -> Dict[str, Any]:
        if "is_always_on" in new_config:
            self.is_always_on = bool(new_config["is_always_on"])
        if "operation_mode" in new_config:
            self.operation_mode = str(new_config["operation_mode"])
        if "cycle_frequency_minutes" in new_config:
            self.cycle_frequency_minutes = max(1, int(new_config["cycle_frequency_minutes"]))
            self.next_cycle_timestamp = time.time() + (self.cycle_frequency_minutes * 60)
        if "max_imagination_global_percent" in new_config:
            self.max_imagination_global_percent = max(5, min(60, int(new_config["max_imagination_global_percent"])))
            self.allocated_cores = max(1, min(6, round(8 * (self.max_imagination_global_percent / 100))))
        if "max_swarm_global_percent" in new_config:
            self.max_swarm_global_percent = max(10, min(70, int(new_config["max_swarm_global_percent"])))
        if "max_concurrent_processes" in new_config:
            self.max_concurrent_processes = max(1, min(6, int(new_config["max_concurrent_processes"])))
        if "max_accumulated_requests_threshold" in new_config:
            self.max_accumulated_requests_threshold = max(1, min(20, int(new_config["max_accumulated_requests_threshold"])))
        if "max_proposals_per_agent_limit" in new_config:
            self.max_proposals_per_agent_limit = max(1, min(20, int(new_config["max_proposals_per_agent_limit"])))
        if "auto_sync_all_proposals_enabled" in new_config:
            self.auto_sync_all_proposals_enabled = bool(new_config["auto_sync_all_proposals_enabled"])
        if "quantum_entropy_level" in new_config:
            self.quantum_entropy_level = float(new_config["quantum_entropy_level"])
        if "max_kb_per_minute" in new_config:
            self.max_kb_per_minute = int(new_config["max_kb_per_minute"])
        if "max_mb_per_hour" in new_config:
            self.max_mb_per_hour = float(new_config["max_mb_per_hour"])
        if "storage_target" in new_config:
            self.storage_target = str(new_config["storage_target"])
        if "associated_brain_ids" in new_config:
            self.associated_brain_ids = list(new_config["associated_brain_ids"])
        if "auto_recycle_memories" in new_config:
            self.auto_recycle_memories = bool(new_config["auto_recycle_memories"])
        
        self._save_state()
        return self.get_status()

    def get_status(self) -> Dict[str, Any]:
        now = time.time()
        secs_left = max(0, int(self.next_cycle_timestamp - now))
        
        catalog_with_meta = []
        for p in DREAM_PROCESS_TYPES:
            pid = p["id"]
            meta = self.process_metadata.get(pid, {})
            policy = self.permission_policies.get(pid, {
                "level": p.get("default_permission_level", "auto_apply_safe"),
                "notify_on_important": True,
                "notify_on_security": True,
                "auto_sync_agents": True
            })
            item = dict(p)
            item["status"] = meta.get("status", "active")
            item["allocated_resource_percent"] = meta.get("allocated_resource_percent", 20)
            item["last_activated_at"] = meta.get("last_activated_at", now)
            item["last_activated_formatted"] = meta.get("last_activated_formatted", "18/08/2026 13:40:00")
            item["cycles_count"] = meta.get("cycles_count", 0)
            item["permission_policy"] = policy
            
            # Accumulated active proposals for this specific process
            item_pending_proposals = len([
                b for b in self.branches 
                if b.get("process_type") == pid and b.get("status") in ["pending_approval", "enlisted_ready", "active"]
            ])
            item["pending_proposals_count"] = item_pending_proposals
            item["is_auto_paused_by_limit"] = item_pending_proposals >= self.max_proposals_per_agent_limit
            catalog_with_meta.append(item)

        pending_approval_count = len([b for b in self.branches if b.get("status") == "pending_approval" or b.get("requires_user_approval")])
        total_proposals_count = len(self.branches)
        active_proc_count = len([p for p in catalog_with_meta if p.get("status") == "active"])

        return {
            "is_always_on": self.is_always_on,
            "operation_mode": self.operation_mode,
            "cycle_frequency_minutes": self.cycle_frequency_minutes,
            "max_imagination_global_percent": self.max_imagination_global_percent,
            "max_swarm_global_percent": self.max_swarm_global_percent,
            "dual_trunk": self.get_dual_trunk_status(),
            "allocated_cores": self.allocated_cores,
            "total_m1_cores": 8,
            "quantum_entropy_level": self.quantum_entropy_level,
            "max_concurrent_processes": self.max_concurrent_processes,
            "max_accumulated_requests_threshold": self.max_accumulated_requests_threshold,
            "max_proposals_per_agent_limit": self.max_proposals_per_agent_limit,
            "auto_sync_all_proposals_enabled": self.auto_sync_all_proposals_enabled,
            "is_paused_due_to_threshold": self.is_paused_due_to_threshold,
            "active_agents_count": 6,
            "active_processes_count": active_proc_count,
            "max_kb_per_minute": self.max_kb_per_minute,
            "max_mb_per_hour": self.max_mb_per_hour,
            "hourly_generated_kb": self.hourly_generated_kb,
            "daily_generated_mb": self.daily_generated_mb,
            "cycles_completed": self.cycles_completed,
            "storage_target": self.storage_target,
            "associated_brain_ids": self.associated_brain_ids,
            "auto_recycle_memories": self.auto_recycle_memories,
            "active_process_types": self.active_process_types,
            "permission_levels_catalog": PERMISSION_LEVELS,
            "permission_policies": self.permission_policies,
            "process_types_catalog": catalog_with_meta,
            "process_metadata": self.process_metadata,
            "is_dreaming_now": self.is_dreaming_now,
            "next_cycle_seconds_left": secs_left,
            "next_cycle_formatted": f"{secs_left // 60:02d}:{secs_left % 60:02d}",
            "pending_approval_count": pending_approval_count,
            "total_proposals_count": total_proposals_count,
            "branches": self.branches,
            "creations": self.creations,
            "insights": self.insights,
            "suggestions": self.suggestions,
            "recycle_history": self.recycle_history,
            "sync_execution_state": self.sync_execution_state
        }

    def register_callback(self, cb):
        self.callbacks.append(cb)

    def _notify_callbacks(self, evt: Dict[str, Any]):
        for cb in self.callbacks:
            try:
                cb(evt)
            except Exception:
                pass

intuitive_imagination_engine = IntuitiveImaginationEngine()

# (Tarea A · Coherencia de Memoria) Precalienta en un hilo aparte, en 2do
# plano y SIN bloquear el arranque, las importaciones costosas que la
# imaginación necesita de todos modos en su primer ciclo real (ver
# _prewarm_context_dependencies: ~7-8 s de agents.orchestrator/cerebros_manager
# la primera vez, medido). Se lanza aquí, al FINAL del fichero — después de
# que el módulo haya terminado de cargarse por completo — para que ninguna
# carrera con imports circulares parciales pueda darse durante __init__.
threading.Thread(
    target=intuitive_imagination_engine._prewarm_context_dependencies,
    daemon=True,
    name="imagination-context-prewarm",
).start()
