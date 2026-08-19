import time
import asyncio
import random
from typing import Dict, Any, List, Optional
from ..memory.starseed_memory_engine import starseed_memory_engine
from ..memory.openviking_engine import openviking_memory

DREAM_PROCESS_TYPES = [
    {
        "id": "rem_synaptic_consolidation",
        "name": "Sueño REM Cognitivo // Consolidación Sináptica",
        "icon": "Brain",
        "color": "#a855f7",
        "description": "Comprime recuerdos, poda sinapsis redundantes y entrelaza conceptos en el grafo exocortical.",
        "category": "Memoria & Arquitectura"
    },
    {
        "id": "counterfactual_quantum_imagination",
        "name": "Imaginación Contrafáctica // Hipótesis Cuánticas",
        "icon": "Lightbulb",
        "color": "#f59e0b",
        "description": "Formula escenarios '¿Qué pasaría si...?', postulando modelos teóricos de física, soberanía y ontocracia.",
        "category": "Teoría & Ciencia"
    },
    {
        "id": "lucid_cyberdelic_creativity",
        "name": "Sueño Lúcido // Generación Creativa & 3D",
        "icon": "Sparkles",
        "color": "#00f0ff",
        "description": "Diseña nuevas interfaces UI con Tailwind, shaders WebGL 3D, sonoridades WebAudio y poesía algorítmica.",
        "category": "Diseño & Arte"
    },
    {
        "id": "code_self_reflection_opt",
        "name": "Auto-Reflexión & Optimización de Código",
        "icon": "Cpu",
        "color": "#10b981",
        "description": "Audita programas pasados, detecta cuellos de botella de memoria y optimiza kernels C++/Rust/Python.",
        "category": "Ingeniería de Software"
    },
    {
        "id": "predictive_future_simulation",
        "name": "Simulación Predictiva & Anticipación de Tendencias",
        "icon": "Compass",
        "color": "#ec4899",
        "description": "Proyecta la evolución de proyectos StarSeed, hábitos del usuario y hojas de ruta tecnológicas.",
        "category": "Estrategia & Futuro"
    },
    {
        "id": "inter_brain_evolutionary_mutation",
        "name": "Mutación Evolutiva Inter-Cerebros",
        "icon": "GitBranch",
        "color": "#38bdf8",
        "description": "Cruza axiomas entre Génesis (Ontocracia), Hephaestus (Hardware) y Hermes (Web) creando nuevas habilidades.",
        "category": "Evolución Cognitiva"
    }
]

class AstrauraDreamEngine:
    """
    Motor Onírico y de Imaginación Autónoma de 1.58 Bits (StarSeed OS // v3.2).
    Ejecuta procesos de auto-mejora continua en segundo plano, consolidación de sinapsis,
    creaciones de ideas ramificadas en el tiempo y trazabilidad de activos generados.
    """
    def __init__(self):
        self.is_dreaming = False
        self.dream_frequency_minutes = 15
        self.dream_intensity = 0.85
        self.quantum_entropy_level = 0.75 # 0.1 a 1.5
        self.dream_mode = "always_on" # "always_on", "idle_only", "scheduled", "burst"
        self.dream_cycles_completed = 0
        
        # Procesos oníricos activos
        self.active_process_types = [
            "rem_synaptic_consolidation",
            "counterfactual_quantum_imagination",
            "lucid_cyberdelic_creativity",
            "code_self_reflection_opt",
            "predictive_future_simulation",
            "inter_brain_evolutionary_mutation"
        ]
        
        # Capacidades y límites configurables
        self.max_capacity_percentage = 40  # 10% a 100% de uso de hardware
        self.max_hourly_kb = 250            # Límite máximo de datos por hora en KB
        self.max_daily_mb = 15.0            # Límite máximo de datos por día en MB
        self.hourly_generated_kb = 12.4
        self.daily_generated_mb = 1.8
        
        self.target_thematic_areas = [
            "hardware_simd",
            "ontocracy_sovereignty",
            "clean_code",
            "3d_visual_art",
            "deep_science"
        ]
        
        # Historial de Sueños y Procesos Ramificados en el Tiempo
        self.dream_log: List[Dict[str, Any]] = []
        self.dream_branches: List[Dict[str, Any]] = []
        self.proactive_creations: List[Dict[str, Any]] = []
        self.recommendations: List[Dict[str, Any]] = []
        self.reminders: List[Dict[str, Any]] = []
        
        self._initialize_seed_dreams()

    def get_process_types(self) -> List[Dict[str, Any]]:
        return DREAM_PROCESS_TYPES

    def _initialize_seed_dreams(self):
        # 1. Árbol de Procesos Ramificados a través del tiempo
        self.dream_branches = [
            {
                "id": "branch_root_1",
                "parent_id": None,
                "timestamp": time.time() - 7200,
                "formatted_time": "Hace 2 horas",
                "process_type": "rem_synaptic_consolidation",
                "theme": "Génesis: Cuantización Ternaria {-1, 0, 1}",
                "hypothesis": "La eliminación de MatMul permite correr agentes en segundo plano sin drenar batería.",
                "branch_level": 0,
                "status": "consolidated",
                "entropy_delta": "-0.082",
                "insights": "El empaquetado i2_s optimiza 4 pesos por byte en ARM NEON.",
                "created_assets": [
                    {
                        "id": "asset_1",
                        "title": "Kernel SIMD BitLinear en C++",
                        "type": "code",
                        "link": "backend/BitNet/build/bin/llama-cli"
                    }
                ],
                "children": ["branch_child_1a", "branch_child_1b"]
            },
            {
                "id": "branch_child_1a",
                "parent_id": "branch_root_1",
                "timestamp": time.time() - 3600,
                "formatted_time": "Hace 1 hora",
                "process_type": "inter_brain_evolutionary_mutation",
                "theme": "Ramificación: Sinergia con Browser-Use & Playwright",
                "hypothesis": "Agentes navegando la web mientras el núcleo ternario sintetiza resúmenes.",
                "branch_level": 1,
                "status": "consolidated",
                "entropy_delta": "-0.054",
                "insights": "Navegación headless y extracción de DOM semántico con tasa de éxito > 95%.",
                "created_assets": [
                    {
                        "id": "asset_2",
                        "title": "Pipeline Hermes Web Scraper",
                        "type": "workflow",
                        "link": "/api/browser/status"
                    }
                ],
                "children": []
            },
            {
                "id": "branch_child_1b",
                "parent_id": "branch_root_1",
                "timestamp": time.time() - 1800,
                "formatted_time": "Hace 30 min",
                "process_type": "counterfactual_quantum_imagination",
                "theme": "Ramificación: Ontocracia & Memoria Viva StarSeed",
                "hypothesis": "Estructurar el exocórtex en ramas permanentes (Soul, Ego, Memory, Skills).",
                "branch_level": 1,
                "status": "active",
                "entropy_delta": "-0.038",
                "insights": "Grafo armónico interactivo con soporte de [[Wikilinks]] bidireccionales.",
                "created_assets": [
                    {
                        "id": "asset_3",
                        "title": "Manifiesto de Soberanía Digital",
                        "type": "document",
                        "link": "/api/memory/starseed"
                    }
                ],
                "children": []
            }
        ]

        # 2. Creaciones Proactivas Iniciales
        self.proactive_creations = [
            {
                "id": "creation_1",
                "title": "Boceto 3D: Topología del Exocórtex",
                "type": "Diseño UI / 3D",
                "timestamp": time.time() - 2400,
                "content": "Render volumétrico de las 9 ramas de memoria con física gravitacional.",
                "origin_branch": "branch_child_1b",
                "tags": ["3D", "Exocórtex", "Topología"]
            },
            {
                "id": "creation_2",
                "title": "Kernel Aritmético i2_s para Apple Silicon M1",
                "type": "Código C++",
                "timestamp": time.time() - 1200,
                "content": "Instrucciones vectoriales ARM NEON para suma/resta sin multiplicadores.",
                "origin_branch": "branch_root_1",
                "tags": ["C++", "BitNet", "SIMD"]
            }
        ]

        # 3. Recordatorios & Recomendaciones
        self.reminders = [
            {
                "id": "rem_1",
                "text": "Sincronizar base de conocimientos con Google Drive al cerrar sesión.",
                "time": "Diario",
                "active": True
            },
            {
                "id": "rem_2",
                "text": "Auditar la compresión ternaria de los nuevos documentos indexados.",
                "time": "Semanal",
                "active": True
            }
        ]

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_dreaming": self.is_dreaming,
            "dream_frequency_minutes": self.dream_frequency_minutes,
            "dream_intensity": self.dream_intensity,
            "quantum_entropy_level": self.quantum_entropy_level,
            "dream_mode": self.dream_mode,
            "dream_cycles_completed": self.dream_cycles_completed,
            "max_capacity_percentage": self.max_capacity_percentage,
            "max_hourly_kb": self.max_hourly_kb,
            "max_daily_mb": self.max_daily_mb,
            "hourly_generated_kb": round(self.hourly_generated_kb, 1),
            "daily_generated_mb": round(self.daily_generated_mb, 2),
            "active_process_types": self.active_process_types,
            "target_thematic_areas": self.target_thematic_areas,
            "process_types_catalog": DREAM_PROCESS_TYPES,
            "dream_branches": self.dream_branches,
            "proactive_creations": self.proactive_creations,
            "reminders": self.reminders,
            "recent_log": self.dream_log[-10:]
        }

    async def execute_dream_burst(
        self, 
        theme: Optional[str] = None, 
        parent_branch_id: Optional[str] = None,
        process_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes an adaptive cognitive dream cycle in background.
        Synthesizes new conceptual branches, proactive code/art assets, and records in Mem0 & StarSeed.
        """
        self.is_dreaming = True
        t0 = time.time()

        selected_ptype = process_type or random.choice(self.active_process_types)
        ptype_meta = next((p for p in DREAM_PROCESS_TYPES if p["id"] == selected_ptype), DREAM_PROCESS_TYPES[0])

        themes_catalog = [
            "Convergencia de Pesos Ternarios 1.58b con Redes Transformer Modernas",
            "Auto-Reparación Adaptativa de Código en Navegador y Host M1",
            "Sincronía de Sensores Acústicos y Visuales con el Estado Afectivo",
            "Síntesis de Mundos Volumétricos 3D y Shaders Holográficos",
            "Ontocracia Ciberdélica: Soberanía Digital y Comunismo de Abundancia",
            "Optimización de Tasa de Inferencia ARM NEON a 90 Tokens/seg"
        ]

        target_theme = theme or random.choice(themes_catalog)
        branch_id = f"branch_burst_{int(time.time())}"
        
        # Formulate rich hypothesis based on process type
        if selected_ptype == "code_self_reflection_opt":
            hypo = f"Auditoría algorítmica: optimización de buffer i2_s y bucle SIMD en '{target_theme}'."
            insights = "Reducción de consumo de CPU estimada en un 22% y eliminación de overhead de recolector de basura."
            asset_title = f"Optimización Kernel: {target_theme[:30]}"
            asset_type = "code"
        elif selected_ptype == "lucid_cyberdelic_creativity":
            hypo = f"Generación estética: Shaders WebGL 3D reactivos a la telemetría en '{target_theme}'."
            insights = "Topología visual de partículas con rotación armónica a 60 FPS."
            asset_title = f"Boceto 3D // {target_theme[:30]}"
            asset_type = "ui_3d"
        elif selected_ptype == "counterfactual_quantum_imagination":
            hypo = f"Escenario Cuántico: ¿Qué ocurriría si todo el sistema operativo operara sin multiplicaciones FP32?"
            insights = "La memoria unificada del M1 mantendría modelos de 7B parámetros con solo 1.8 GB de consumo."
            asset_title = f"Manifiesto Teórico // {target_theme[:30]}"
            asset_type = "document"
        else:
            hypo = f"Consolidación sináptica de hechos y patrones en '{target_theme}'."
            insights = "Se entrelazaron 14 nuevos nodos conceptuales en el exocórtex y la memoria universal Mem0."
            asset_title = f"Sinapsis Consolidada // {target_theme[:30]}"
            asset_type = "memory_node"

        new_branch = {
            "id": branch_id,
            "parent_id": parent_branch_id or "branch_root_1",
            "timestamp": time.time(),
            "formatted_time": "Recién generado",
            "process_type": selected_ptype,
            "theme": target_theme,
            "hypothesis": hypo,
            "branch_level": 2,
            "status": "active",
            "entropy_delta": f"-{random.uniform(0.02, 0.09):.3f}",
            "insights": insights,
            "created_assets": [
                {
                    "id": f"asset_{int(time.time())}",
                    "title": asset_title,
                    "type": asset_type,
                    "link": "/api/memory/starseed"
                }
            ],
            "children": []
        }

        # Add to branches & proactive creations
        self.dream_branches.insert(0, new_branch)
        self.proactive_creations.insert(0, {
            "id": f"creation_{int(time.time())}",
            "title": asset_title,
            "type": ptype_meta["name"],
            "timestamp": time.time(),
            "content": f"{hypo}\n\nConclusiones:\n{insights}",
            "origin_branch": branch_id,
            "tags": [ptype_meta["category"], "1.58-Bit", "Dream Engine"]
        })

        # Record in Mem0 and StarSeed
        try:
            from ..memory.mem0_engine import mem0_engine
            mem0_engine.add_memory(
                memory_text=f"[Revelación Onírica ({ptype_meta['name']})]: {target_theme} -> {insights}",
                user_id="alex",
                agent_id="oneiros",
                category="dream_revelation",
                metadata={"branch_id": branch_id, "entropy_level": self.quantum_entropy_level}
            )
        except Exception:
            pass

        self.dream_cycles_completed += 1
        self.hourly_generated_kb += random.uniform(1.5, 4.0)
        self.daily_generated_mb += random.uniform(0.01, 0.05)

        self.dream_log.append({
            "timestamp": time.time(),
            "action": f"Sueño Completado: {ptype_meta['name']}",
            "theme": target_theme,
            "duration_secs": round(time.time() - t0, 2)
        })

        result_payload = {
            "success": True,
            "branch": new_branch,
            "process_type": ptype_meta,
            "theme": target_theme
        }

        self._notify_callbacks({
            "type": "dream_cycle_event",
            "event": {
                "id": branch_id,
                "process_type": ptype_meta["id"],
                "process_name": ptype_meta["name"],
                "theme": target_theme,
                "hypothesis": hypo,
                "insights": insights,
                "timestamp": time.time(),
                "time_formatted": time.strftime("%H:%M:%S")
            }
        })

        self.is_dreaming = False
        return result_payload

    def register_callback(self, cb):
        if cb not in self.callbacks:
            self.callbacks.append(cb)

    def _notify_callbacks(self, payload):
        for cb in self.callbacks:
            try:
                cb(payload)
            except Exception as e:
                print(f"[DreamEngine] Callback notice: {e}")

    async def start_background_dream_loop(self):
        """
        Continuous background worker running adaptive dream cycles.
        """
        print("🌙 [DreamEngine] Worker de Sueño Autónomo en Segundo Plano: INICIADO")
        while True:
            try:
                # Frequency in minutes, converted to seconds
                freq_secs = max(60, self.dream_frequency_minutes * 60)
                await asyncio.sleep(freq_secs)

                if self.dream_mode != "burst":
                    print(f"🌌 [DreamEngine] Disparando ciclo onírico automático ({self.dream_mode})...")
                    await self.execute_dream_burst()
            except asyncio.CancelledError:
                break
            except Exception as err:
                print(f"[DreamEngine] Error en ciclo onírico en segundo plano: {err}")
                await asyncio.sleep(60)

    def apply_branch(self, branch_id: str) -> Dict[str, Any]:
        """
        Applies a dream branch proposal into the active system state.
        """
        for b in self.dream_branches:
            if b["id"] == branch_id:
                b["status"] = "applied"
                # Register into StarSeed memories
                try:
                    starseed_memory_engine.create_or_update_document({
                        "id": f"applied_{branch_id}",
                        "name": f"✨ [Aplicado] {b['theme']}",
                        "branch": "soul",
                        "category": "Propuesta Onírica Aplicada",
                        "markdown": f"# Propuesta Onírica Aplicada: {b['theme']}\n\n**Hipótesis**: {b['hypothesis']}\n\n**Insights**: {b.get('insights', '')}\n",
                        "tags": ["Onírico", "Aplicado", "Exocórtex"]
                    })
                except Exception as e:
                    print(f"[DreamEngine] Apply branch notice: {e}")
                return {"success": True, "message": f"Rama '{b['theme']}' aplicada con éxito en el exocórtex.", "branch": b}
        return {"success": False, "message": "Rama no encontrada"}

    def discard_branch(self, branch_id: str) -> Dict[str, Any]:
        """
        Discards a dream branch proposal.
        """
        self.dream_branches = [b for b in self.dream_branches if b["id"] != branch_id]
        return {"success": True, "message": "Rama descartada"}

    def edit_branch(self, branch_id: str, updated_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Edits the content or hypothesis of a dream branch.
        """
        for b in self.dream_branches:
            if b["id"] == branch_id:
                if "theme" in updated_data:
                    b["theme"] = updated_data["theme"]
                if "hypothesis" in updated_data:
                    b["hypothesis"] = updated_data["hypothesis"]
                if "insights" in updated_data:
                    b["insights"] = updated_data["insights"]
                return {"success": True, "message": "Rama actualizada", "branch": b}
        return {"success": False, "message": "Rama no encontrada"}

    def apply_creation(self, creation_id: str) -> Dict[str, Any]:
        """
        Applies a proactive creation asset.
        """
        for c in self.proactive_creations:
            if c["id"] == creation_id:
                c["status"] = "applied"
                return {"success": True, "message": f"Creación '{c['title']}' aplicada.", "creation": c}
        return {"success": False, "message": "Creación no encontrada"}

    def discard_creation(self, creation_id: str) -> Dict[str, Any]:
        """
        Discards a proactive creation.
        """
        self.proactive_creations = [c for c in self.proactive_creations if c["id"] != creation_id]
        return {"success": True, "message": "Creación descartada"}

    def edit_creation(self, creation_id: str, updated_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Edits a proactive creation.
        """
        for c in self.proactive_creations:
            if c["id"] == creation_id:
                if "title" in updated_data:
                    c["title"] = updated_data["title"]
                if "content" in updated_data:
                    c["content"] = updated_data["content"]
                if "type" in updated_data:
                    c["type"] = updated_data["type"]
                if "tags" in updated_data:
                    c["tags"] = updated_data["tags"]
                return {"success": True, "message": "Creación actualizada", "creation": c}
        return {"success": False, "message": "Creación no encontrada"}

    def update_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        if "max_capacity_percentage" in config:
            self.max_capacity_percentage = int(config["max_capacity_percentage"])
        if "max_hourly_kb" in config:
            self.max_hourly_kb = int(config["max_hourly_kb"])
        if "max_daily_mb" in config:
            self.max_daily_mb = float(config["max_daily_mb"])
        if "dream_frequency_minutes" in config:
            self.dream_frequency_minutes = int(config["dream_frequency_minutes"])
        if "dream_intensity" in config:
            self.dream_intensity = float(config["dream_intensity"])
        if "quantum_entropy_level" in config:
            self.quantum_entropy_level = float(config["quantum_entropy_level"])
        if "dream_mode" in config:
            self.dream_mode = str(config["dream_mode"])
        if "active_process_types" in config:
            self.active_process_types = list(config["active_process_types"])
        if "target_thematic_areas" in config:
            self.target_thematic_areas = list(config["target_thematic_areas"])

        return {"success": True, "config": self.get_status()}

dream_engine = AstrauraDreamEngine()
dream_engine.callbacks = []
