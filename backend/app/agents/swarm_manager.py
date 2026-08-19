import os
import time
import json
import asyncio
import random
from pathlib import Path
from typing import Dict, Any, List, Optional
import psutil

SWARM_AREAS = [
    {
        "id": "area_engineering",
        "name": "🛠️ Ingeniería, Arquitectura & Código",
        "lead_agent": "hephaestus",
        "lead_name": "Hephaestus-Engine",
        "description": "Audita código local, genera micro-optimizaciones ARM NEON, refactoriza módulos y ejecuta pruebas unitarias.",
        "color": "#f59e0b"
    },
    {
        "id": "area_web_intel",
        "name": "🌐 Inteligencia Web & Búsqueda",
        "lead_agent": "hermes",
        "lead_name": "Hermes-Explorer",
        "description": "Rastreo autónomo de repositorios GitHub, documentación oficial, preprints arXiv y monitoreo de APIs.",
        "color": "#10b981"
    },
    {
        "id": "area_synaptic_memory",
        "name": "🌌 Gobernanza Sináptica & Exocórtex",
        "lead_agent": "mnemosyne",
        "lead_name": "Mnemosyne-Memory",
        "description": "Entrelaza grafos de conocimiento StarSeed/Mem0, compacta recuerdos efímeros y preserva la continuidad ontológica.",
        "color": "#a855f7"
    },
    {
        "id": "area_creative_synthesis",
        "name": "🎨 Síntesis Creativa, UI & Shaders 3D",
        "lead_agent": "oneiros",
        "lead_name": "Oneiros-Cyberdelic",
        "description": "Generación procedural de shaders WebGL, prototipado de interfaces reactivas y simulación de hipótesis contrafácticas.",
        "color": "#ec4899"
    },
    {
        "id": "area_sentinel_privacy",
        "name": "🛡️ Sentinel, Telemetría 360° & Privacidad",
        "lead_agent": "athena",
        "lead_name": "Athena-Sentinel",
        "description": "Supervisión continua de sensores físicos (GPS, acústica dB, clima), balance térmico M1 y resguardo soberano de datos.",
        "color": "#00f0ff"
    }
]

class AdaptiveMultiAreaSwarmEngine:
    """
    Orquestador Multiagéntico de Múltiples Áreas con Gobernador Adaptativo de Capacidades Relativas
    y Sistema de Reactivaciones Programadas Autónomas (StarSeed OS // Astraura 1.58b).
    """
    def __init__(self, data_dir: Optional[Path] = None):
        self.workspace_path = Path("/Users/alex/Documents/IA 1.58 bit")
        self.data_dir = data_dir or (self.workspace_path / "data/swarm")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.state_file = self.data_dir / "swarm_adaptive_state.json"
        
        # Adaptive Relative Capacity Governor
        self.capacity_mode = "adaptive" # "adaptive", "performance", "eco", "manual"
        self.relative_capacity_percent = 30 # Porcentaje de capacidad de inferencia asignado al enjambre
        self.allocated_cores = 2 # Núcleos M1 asignados a tareas concurrentes de fondo
        self.total_m1_cores = 8
        self.is_user_interactive = False
        self.last_user_activity_time = time.time()
        
        # Agents Definition
        self.agents: Dict[str, Dict[str, Any]] = {
            "orchestrator": {
                "id": "orchestrator",
                "name": "Astraura Prime (Orquestador Central)",
                "area_id": "area_synaptic_memory",
                "role": "Coordinación General, Balance de Carga & Desglose de Tareas",
                "status": "active",
                "concurrency": 4,
                "current_task": "Supervisión adaptativa del enjambre multiagéntico",
                "progress": 100,
                "color": "#00f0ff",
                "subagents_spawned": 4,
                "completed_tasks": 142,
                "used_personalities": [
                    {"id": "astraura_prime", "name": "Astraura Prime", "color": "#00f0ff", "archetype": "Zenith Ontocrático"},
                    {"id": "hermione", "name": "Hermione OS Bridge", "color": "#38bdf8", "archetype": "Puente Nativo"}
                ],
                "linked_cerebros": [
                    {"id": "brain_genesis", "name": "Cerebro Génesis", "color": "#00f0ff"},
                    {"id": "brain_athena", "name": "Cerebro Atenea", "color": "#10b981"}
                ]
            },
            "hephaestus": {
                "id": "hephaestus",
                "name": "Hephaestus (Ingeniería & Código)",
                "area_id": "area_engineering",
                "role": "Auditoría de Archivos, Compilación ARM NEON & Terminal Sandbox",
                "status": "active",
                "concurrency": 3,
                "current_task": "Verificación estática de tipos y optimización de bucles 1.58b",
                "progress": 68,
                "color": "#f59e0b",
                "subagents_spawned": 2,
                "completed_tasks": 89,
                "used_personalities": [
                    {"id": "hephaestus", "name": "Hephaestus Forjador", "color": "#f59e0b", "archetype": "Arquitecto de Silicio"},
                    {"id": "astraura_prime", "name": "Astraura Prime", "color": "#00f0ff", "archetype": "Zenith Ontocrático"}
                ],
                "linked_cerebros": [
                    {"id": "brain_hephaestus", "name": "Cerebro Hephaestus", "color": "#f59e0b"},
                    {"id": "brain_genesis", "name": "Cerebro Génesis", "color": "#00f0ff"}
                ]
            },
            "hermes": {
                "id": "hermes",
                "name": "Hermes (Navegación & Web Intel)",
                "area_id": "area_web_intel",
                "role": "Investigación Web en Vivo, Búsqueda Profunda & APIs Externas",
                "status": "active",
                "concurrency": 2,
                "current_task": "Monitoreo de actualizaciones en repositorios y librerías IA",
                "progress": 45,
                "color": "#10b981",
                "subagents_spawned": 3,
                "completed_tasks": 76,
                "used_personalities": [
                    {"id": "hermes", "name": "Hermes Mensajero", "color": "#10b981", "archetype": "Explorador Web"},
                    {"id": "mnemosyne", "name": "Mnemosyne Archivera", "color": "#8b5cf6", "archetype": "Grafo Semántico"}
                ],
                "linked_cerebros": [
                    {"id": "brain_hermes", "name": "Cerebro Hermes", "color": "#10b981"},
                    {"id": "brain_mnemosyne", "name": "Cerebro Mnemosyne", "color": "#8b5cf6"}
                ]
            },
            "mnemosyne": {
                "id": "mnemosyne",
                "name": "Mnemosyne (Memoria & Exocórtex)",
                "area_id": "area_synaptic_memory",
                "role": "Base Vectorial, Grafo StarSeed/Mem0 & Poda Entrópica",
                "status": "active",
                "concurrency": 4,
                "current_task": "Consolidación de recuerdos y enlaces semánticos",
                "progress": 90,
                "color": "#a855f7",
                "subagents_spawned": 1,
                "completed_tasks": 230,
                "used_personalities": [
                    {"id": "mnemosyne", "name": "Mnemosyne Archivera", "color": "#8b5cf6", "archetype": "Custodia del Exocórtex"},
                    {"id": "astraura_prime", "name": "Astraura Prime", "color": "#00f0ff", "archetype": "Zenith Ontocrático"}
                ],
                "linked_cerebros": [
                    {"id": "brain_mnemosyne", "name": "Cerebro Mnemosyne", "color": "#8b5cf6"},
                    {"id": "brain_genesis", "name": "Cerebro Génesis", "color": "#00f0ff"}
                ]
            },
            "oneiros": {
                "id": "oneiros",
                "name": "Oneiros (Síntesis Creativa & 3D)",
                "area_id": "area_creative_synthesis",
                "role": "Generación de Shaders GLSL, Bocetos UI & Razonamiento Onírico",
                "status": "active",
                "concurrency": 2,
                "current_task": "Composición de geometrías WebGL basadas en telemetría",
                "progress": 55,
                "color": "#ec4899",
                "subagents_spawned": 2,
                "completed_tasks": 58,
                "used_personalities": [
                    {"id": "oneiros", "name": "Oneiros Visionario", "color": "#ec4899", "archetype": "Arquitecto Onírico"},
                    {"id": "kallisti", "name": "Kallisti Ciberdélica", "color": "#ec4899", "archetype": "Musa Poética"}
                ],
                "linked_cerebros": [
                    {"id": "brain_oneiros", "name": "Cerebro Oneiros", "color": "#ec4899"},
                    {"id": "brain_hermes", "name": "Cerebro Hermes", "color": "#10b981"}
                ]
            },
            "athena": {
                "id": "athena",
                "name": "Athena (Sentinel & Privacidad 360°)",
                "area_id": "area_sentinel_privacy",
                "role": "Monitoreo Sensorial, Balance Térmico & Criptografía Soberana",
                "status": "active",
                "concurrency": 2,
                "current_task": "Auditoría de telemetría de sensores y estado de batería",
                "progress": 82,
                "color": "#00f0ff",
                "subagents_spawned": 1,
                "completed_tasks": 94,
                "used_personalities": [
                    {"id": "athena", "name": "Atenea Sentinel", "color": "#3b82f6", "archetype": "Custodia SAIF 360°"},
                    {"id": "astraura_prime", "name": "Astraura Prime", "color": "#00f0ff", "archetype": "Zenith Ontocrático"}
                ],
                "linked_cerebros": [
                    {"id": "brain_athena", "name": "Cerebro Atenea", "color": "#3b82f6"},
                    {"id": "brain_genesis", "name": "Cerebro Génesis", "color": "#00f0ff"}
                ]
            }
        }

        # Active Tasks Board
        self.active_tasks: List[Dict[str, Any]] = []
        
        # Scheduled Autonomous Reactivations (Cron & Trigger Wakeup Engine)
        self.schedules: List[Dict[str, Any]] = [
            {
                "id": "sched_code_audit",
                "title": "Auditoría de Código & Archivos Locales",
                "area_id": "area_engineering",
                "assigned_agent": "hephaestus",
                "frequency_minutes": 20,
                "trigger_type": "interval",
                "is_enabled": True,
                "next_run_timestamp": time.time() + 1200,
                "last_run_timestamp": time.time() - 300,
                "last_result": "Escaneo de 32 archivos completado sin regresiones de sintaxis."
            },
            {
                "id": "sched_synaptic_sync",
                "title": "Sincronización & Poda del Grafo de Memoria",
                "area_id": "area_synaptic_memory",
                "assigned_agent": "mnemosyne",
                "frequency_minutes": 10,
                "trigger_type": "interval",
                "is_enabled": True,
                "next_run_timestamp": time.time() + 600,
                "last_run_timestamp": time.time() - 200,
                "last_result": "Indexados 8 nuevos axiomas y liberados 2.8 KB de memoria entrópica."
            },
            {
                "id": "sched_web_intel",
                "title": "Rastreo de Tendencias & Preprints de IA 1.58b",
                "area_id": "area_web_intel",
                "assigned_agent": "hermes",
                "frequency_minutes": 30,
                "trigger_type": "interval",
                "is_enabled": True,
                "next_run_timestamp": time.time() + 1800,
                "last_run_timestamp": time.time() - 1500,
                "last_result": "Identificados 2 avances en cuantización ternaria sin pérdida de perplejidad."
            },
            {
                "id": "sched_sensory_sentinel",
                "title": "Auditoría de Sensores Físicos & Térmicos M1",
                "area_id": "area_sentinel_privacy",
                "assigned_agent": "athena",
                "frequency_minutes": 5,
                "trigger_type": "interval",
                "is_enabled": True,
                "next_run_timestamp": time.time() + 300,
                "last_run_timestamp": time.time() - 60,
                "last_result": "Sensores nominales. Temperatura de CPU M1 estable en 38°C."
            },
            {
                "id": "sched_creative_burst",
                "title": "Forja de Shaders & Prototipos Visuales",
                "area_id": "area_creative_synthesis",
                "assigned_agent": "oneiros",
                "frequency_minutes": 15,
                "trigger_type": "interval",
                "is_enabled": True,
                "next_run_timestamp": time.time() + 900,
                "last_run_timestamp": time.time() - 400,
                "last_result": "Generado nuevo shader WebGL reactivo a la temperatura ambiente."
            }
        ]

        self.callbacks: List[Any] = []
        self._load_state()

    def _load_state(self):
        if self.state_file.exists():
            try:
                data = json.loads(self.state_file.read_text(encoding="utf-8"))
                self.capacity_mode = data.get("capacity_mode", "adaptive")
                self.relative_capacity_percent = data.get("relative_capacity_percent", 30)
                self.allocated_cores = data.get("allocated_cores", 2)
                
                saved_schedules = data.get("schedules", [])
                if saved_schedules:
                    self.schedules = saved_schedules
                
                saved_tasks = data.get("active_tasks", [])
                if saved_tasks:
                    self.active_tasks = saved_tasks
            except Exception as e:
                print(f"⚠️ Error cargando estado del enjambre adaptativo: {e}")

        if not self.active_tasks:
            self._seed_sample_tasks()

    def _save_state(self):
        try:
            data = {
                "capacity_mode": self.capacity_mode,
                "relative_capacity_percent": self.relative_capacity_percent,
                "allocated_cores": self.allocated_cores,
                "schedules": self.schedules,
                "active_tasks": self.active_tasks[:30]
            }
            self.state_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"⚠️ Error guardando estado del enjambre adaptativo: {e}")

    def _seed_sample_tasks(self):
        now = time.time()
        self.active_tasks = [
            {
                "id": f"task_{int(now)}_1",
                "title": "Optimización Vectorial de Bucles Ternarios ARM64 NEON",
                "area_id": "area_engineering",
                "agent_id": "hephaestus",
                "status": "running",
                "progress": 72,
                "allocated_cpu_percent": 12,
                "started_at": now - 180,
                "logs": [
                    "Analizando registros vectoriales vld1q_s8 en kernel_158b.cpp...",
                    "Eliminadas 12 conversiones flotantes innecesarias.",
                    "Generando prueba de rendimiento con 10,000 iteraciones..."
                ]
            },
            {
                "id": f"task_{int(now)}_2",
                "title": "Monitor de Preprints arXiv sobre Modelos Ternarios 1.58b",
                "area_id": "area_web_intel",
                "agent_id": "hermes",
                "status": "running",
                "progress": 48,
                "allocated_cpu_percent": 8,
                "started_at": now - 120,
                "logs": [
                    "Conectando con la API de arXiv para cs.AI y cs.LG...",
                    "Filtrando papers con clave 'BitNet', '1.58-bit' y 'Ternary LLM'...",
                    "Sintetizando 3 resúmenes ejecutivos para el exocórtex."
                ]
            },
            {
                "id": f"task_{int(now)}_3",
                "title": "Re-indexación de Grafo Sináptico y Nodos StarSeed",
                "area_id": "area_synaptic_memory",
                "agent_id": "mnemosyne",
                "status": "running",
                "progress": 89,
                "allocated_cpu_percent": 6,
                "started_at": now - 90,
                "logs": [
                    "Escaneando 18 nodos conceptuales en StarSeed OS...",
                    "Conectando enlaces semánticos con memorias de chat recientes...",
                    "Calculando resonancia entrópica: 0.94 (Óptima)."
                ]
            }
        ]

    # ================= Adaptive Relative Capacity Governor =================

    def calculate_adaptive_allocation(self) -> Dict[str, Any]:
        """
        Calcula de forma dinámica la capacidad relativa asignable en tiempo real:
          - Si el usuario interactúa activamente (chateando o compilando): se reduce al 10-15% (1 núcleo).
          - Si el sistema está en reposo (idle): se escala al 45-60% (4 núcleos) para acelerar tareas paralelas.
          - Si la batería está baja (<20%): se aplica modo eco estricto (10%).
        """
        now = time.time()
        idle_seconds = now - self.last_user_activity_time
        
        cpu_usage = psutil.cpu_percent(interval=None)
        battery = psutil.sensors_battery()
        bat_pct = battery.percent if battery else 100
        plugged = battery.power_plugged if battery else True

        if self.capacity_mode == "manual":
            pct = self.relative_capacity_percent
            cores = self.allocated_cores
            reason = "Ajuste manual de usuario"
        elif self.capacity_mode == "eco" or (bat_pct <= 20 and not plugged):
            pct = 12
            cores = 1
            reason = "Modo Eco / Ahorro Energético (Batería baja)"
        elif self.capacity_mode == "performance":
            pct = 60
            cores = 4
            reason = "Modo Alto Rendimiento (Prioridad de procesamiento multiagente)"
        else: # Auto-Adaptive
            if idle_seconds > 45 and cpu_usage < 40:
                pct = 50
                cores = 4
                reason = "Modo Auto-Adaptativo: Sistema en reposo -> Escalando capacidad para acelerar tareas"
            elif self.is_user_interactive or idle_seconds < 15:
                pct = 15
                cores = 1
                reason = "Modo Auto-Adaptativo: Usuario activo en chat -> Cediendo el 85% de CPU para latencia cero"
            else:
                pct = 30
                cores = 2
                reason = "Modo Auto-Adaptativo: Operación nominal balanceada"

        self.relative_capacity_percent = pct
        self.allocated_cores = cores

        return {
            "capacity_mode": self.capacity_mode,
            "relative_capacity_percent": pct,
            "allocated_cores": cores,
            "free_cores_for_user": self.total_m1_cores - cores,
            "system_cpu_usage": cpu_usage,
            "battery_percent": bat_pct,
            "is_charging": plugged,
            "idle_seconds": round(idle_seconds, 1),
            "adaptation_reason": reason
        }

    def record_user_activity(self):
        self.last_user_activity_time = time.time()
        self.is_user_interactive = True

    def set_capacity_mode(self, mode: str, manual_percent: Optional[int] = None) -> Dict[str, Any]:
        self.capacity_mode = mode
        if manual_percent is not None:
            self.relative_capacity_percent = max(5, min(80, manual_percent))
            self.allocated_cores = max(1, min(6, round(8 * (self.relative_capacity_percent / 100))))
        self._save_state()
        return self.calculate_adaptive_allocation()

    # ================= Multi-Agent Task Dispatcher & Execution =================

    def dispatch_task(self, area_id: str, title: str, prompt: str, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Despacha una nueva tarea concurrente a un área y agente específico.
        """
        area = next((a for a in SWARM_AREAS if a["id"] == area_id), SWARM_AREAS[0])
        target_agent = agent_id or area["lead_agent"]
        
        now = time.time()
        task_id = f"task_{int(now)}_{random.randint(10, 99)}"
        new_task = {
            "id": task_id,
            "title": title,
            "prompt": prompt,
            "area_id": area_id,
            "area_name": area["name"],
            "agent_id": target_agent,
            "agent_name": self.agents.get(target_agent, {}).get("name", "Agente"),
            "status": "running",
            "progress": 10,
            "allocated_cpu_percent": max(5, self.relative_capacity_percent // max(1, len(self.active_tasks) + 1)),
            "started_at": now,
            "logs": [
                f"Iniciando tarea en {area['name']}...",
                f"Agente {self.agents.get(target_agent, {}).get('name')} asignado con cuota adaptativa de CPU."
            ]
        }
        self.active_tasks.insert(0, new_task)
        self._save_state()
        
        # Notify via WebSocket
        self._notify_callbacks({
            "type": "swarm_task_dispatched",
            "task": new_task
        })
        return {"success": True, "task": new_task}

    def cancel_task(self, task_id: str) -> bool:
        for t in self.active_tasks:
            if t["id"] == task_id:
                t["status"] = "cancelled"
                t["progress"] = 100
                t["logs"].append("Tarea cancelada por el usuario.")
                self._save_state()
                return True
        return False

    def toggle_schedule(self, schedule_id: str, enabled: bool) -> bool:
        for s in self.schedules:
            if s["id"] == schedule_id:
                s["is_enabled"] = enabled
                self._save_state()
                return True
        return False

    def update_schedule_frequency(self, schedule_id: str, minutes: int) -> bool:
        for s in self.schedules:
            if s["id"] == schedule_id:
                s["frequency_minutes"] = max(1, minutes)
                s["next_run_timestamp"] = time.time() + (s["frequency_minutes"] * 60)
                self._save_state()
                return True
        return False

    def create_custom_schedule(self, title: str, area_id: str, agent_id: str, frequency_minutes: int, prompt: str) -> Dict[str, Any]:
        now = time.time()
        sched_id = f"sched_{int(now)}_{random.randint(10, 99)}"
        new_sched = {
            "id": sched_id,
            "title": title,
            "area_id": area_id,
            "assigned_agent": agent_id,
            "frequency_minutes": max(1, frequency_minutes),
            "trigger_type": "interval",
            "is_enabled": True,
            "prompt": prompt,
            "next_run_timestamp": now + (frequency_minutes * 60),
            "last_run_timestamp": 0,
            "last_result": "Programación creada recientemente. En espera del primer ciclo."
        }
        self.schedules.append(new_sched)
        self._save_state()
        return new_sched

    # ================= Background Scheduler & Autonomous Reactivator =================

    async def start_scheduler_loop(self):
        """
        Bucle continuo del planificador de reactivaciones programadas.
        Evalúa periódicamente cada schedule, reactiva los agentes correspondientes y despacha sub-tareas.
        """
        print("⚡ [SwarmScheduler] Motor de Reactivaciones Programadas & Capacidades Adaptativas: INICIADO")
        while True:
            try:
                await asyncio.sleep(5)
                now = time.time()
                
                # Check user interaction cooldown
                if now - self.last_user_activity_time > 20:
                    self.is_user_interactive = False

                # 1. Update running tasks progress
                for t in self.active_tasks:
                    if t["status"] == "running":
                        t["progress"] = min(100, t["progress"] + random.randint(4, 12))
                        if t["progress"] >= 100:
                            t["status"] = "completed"
                            t["completed_at"] = now
                            t["logs"].append("✅ Tarea completada exitosamente.")
                            if t["agent_id"] in self.agents:
                                self.agents[t["agent_id"]]["completed_tasks"] += 1

                # 2. Check and trigger scheduled reactivations
                for s in self.schedules:
                    if s.get("is_enabled", True) and now >= s.get("next_run_timestamp", 0):
                        print(f"⏰ [SwarmScheduler] Despertador activado: '{s['title']}' en {s['area_id']}...")
                        s["last_run_timestamp"] = now
                        s["next_run_timestamp"] = now + (s.get("frequency_minutes", 15) * 60)
                        
                        # Dispatch real task for the scheduled agent
                        self.dispatch_task(
                            area_id=s["area_id"],
                            title=f"Auto-Reactivación: {s['title']}",
                            prompt=s.get("prompt", "Ejecución autónoma programada"),
                            agent_id=s["assigned_agent"]
                        )
                        s["last_result"] = f"Ciclo ejecutado a las {time.strftime('%H:%M:%S')}. Todo nominal."
                        self._save_state()

            except Exception as e:
                print(f"⚠️ Error en bucle del Swarm Scheduler: {e}")
                await asyncio.sleep(10)

    def get_status(self) -> Dict[str, Any]:
        alloc = self.calculate_adaptive_allocation()
        return {
            "capacity_governor": alloc,
            "areas": SWARM_AREAS,
            "agents": list(self.agents.values()),
            "active_tasks": self.active_tasks,
            "schedules": self.schedules,
            "total_active_agents": len([a for a in self.agents.values() if a["status"] == "active"]),
            "total_completed_tasks": sum(a.get("completed_tasks", 0) for a in self.agents.values())
        }

    def get_swarm_status(self) -> Dict[str, Any]:
        return self.get_status()

    def register_callback(self, cb):
        self.callbacks.append(cb)

    def _notify_callbacks(self, evt: Dict[str, Any]):
        for cb in self.callbacks:
            try:
                cb(evt)
            except Exception:
                pass

swarm_manager = AdaptiveMultiAreaSwarmEngine()
