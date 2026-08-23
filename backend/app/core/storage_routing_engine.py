import os
import sys
import time
import asyncio
import json
import psutil
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from .system_notifications_engine import system_notifications_engine
from ..memory.starseed_memory_engine import starseed_memory_engine

# (StarSeed OS · Adenda 153) Rutas PORTABLES: el workspace se deriva de core/config.py
# (raíz del repo) y el home del usuario; antes eran rutas /Users/alex/... fijas.
from pathlib import Path as _SSPath
from .config import settings as _ss_settings
WORKSPACE = str(_ss_settings.workspace_path).rstrip("/")
HOME = str(_SSPath.home()).rstrip("/")

class StorageRoutingEngine:
    """
    Motor Soberano de Detección y Enrutamiento Automático de Medios de Almacenamiento,
    Carpetas y Archivos para Astraura 1.58-Bit // StarSeed OS.
    
    Capacidades:
      - Detección en tiempo real de discos externos, USBs, volúmenes montados (/Volumes),
        carpetas de proyectos y archivos individuales.
      - Enrutamiento dinámico de memorias hacia personalidades/cerebros específicos (Génesis, Hephaestus, Hermes, etc.).
      - Disparo automático de procesos de Imaginación Intuitiva (Consolidación REM, Auto-Optimización de Código, Ciberdelia 3D).
      - Modificación y ajuste dinámico de límites de capacidades relativas (Doble Tronco 1.58b: Imaginación % y Multi-Agentes %).
    """
    def __init__(self, storage_dir: Optional[Path] = None):
        self.workspace_path = Path(f"{WORKSPACE}")
        self.storage_dir = storage_dir or (self.workspace_path / "data/storage_routing")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.rules_file = self.storage_dir / "storage_routing_rules.json"
        
        self.rules: List[Dict[str, Any]] = []
        self.known_connected_paths: set = set()
        self.is_watching = True
        self.callbacks: List[Any] = []
        
        self._load_rules()
        self._seed_default_rules()

    def _load_rules(self):
        if self.rules_file.exists():
            try:
                data = json.loads(self.rules_file.read_text(encoding="utf-8"))
                self.rules = data.get("rules", [])
            except Exception as e:
                print(f"⚠️ Error cargando reglas de almacenamiento: {e}")

    def _save_rules(self):
        try:
            data = {
                "rules": self.rules,
                "updated_at": time.time()
            }
            self.rules_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"⚠️ Error guardando reglas de almacenamiento: {e}")

    def _seed_default_rules(self):
        if not self.rules:
            now = time.time()
            self.rules = [
                {
                    "id": "rule_workspace_main",
                    "name": "Workspace Soberano Local (IA 1.58 bit)",
                    "media_type": "folder",
                    "target_path": str(self.workspace_path),
                    "is_enabled": True,
                    "auto_memory_routing": {
                        "enabled": True,
                        "target_brains": ["brain_genesis", "brain_hephaestus"],
                        "memory_category": "Código Fuente & Arquitectura 1.58b",
                        "index_files": True,
                        "file_extensions": [".py", ".jsx", ".cpp", ".h", ".json", ".md"]
                    },
                    "trigger_imagination": {
                        "enabled": True,
                        "process_types": ["code_self_reflection_opt", "rem_synaptic_consolidation"],
                        "burst_cycles": 1
                    },
                    "capacity_limits_override": {
                        "enabled": True,
                        "imagination_max_percent": 30,
                        "swarm_max_percent": 45,
                        "capacity_mode": "auto"
                    },
                    "last_detected_at": now,
                    "last_detected_formatted": datetime.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S"),
                    "status": "connected"
                },
                {
                    "id": "rule_external_ssd_default",
                    "name": "Almacenamiento Externo / SSD USB (/Volumes)",
                    "media_type": "external_storage",
                    "target_path": "/Volumes/External_SSD",
                    "is_enabled": True,
                    "auto_memory_routing": {
                        "enabled": True,
                        "target_brains": ["brain_hermes", "brain_hephaestus"],
                        "memory_category": "Bóveda de Investigación & Datasets",
                        "index_files": True,
                        "file_extensions": [".json", ".parquet", ".csv", ".txt", ".md", ".gguf"]
                    },
                    "trigger_imagination": {
                        "enabled": True,
                        "process_types": ["counterfactual_quantum_imagination", "predictive_future_simulation"],
                        "burst_cycles": 2
                    },
                    "capacity_limits_override": {
                        "enabled": True,
                        "imagination_max_percent": 40,
                        "swarm_max_percent": 50,
                        "capacity_mode": "high_performance"
                    },
                    "last_detected_at": now - 7200,
                    "last_detected_formatted": "A la espera de conexión",
                    "status": "waiting_connection"
                },
                {
                    "id": "rule_creative_3d_assets",
                    "name": "Carpeta de Shaders & Assets 3D",
                    "media_type": "folder",
                    "target_path": str(self.workspace_path / "frontend/src/assets"),
                    "is_enabled": True,
                    "auto_memory_routing": {
                        "enabled": True,
                        "target_brains": ["brain_oneiros", "brain_genesis"],
                        "memory_category": "Diseño Ciberdélico & UI 3D",
                        "index_files": True,
                        "file_extensions": [".glsl", ".frag", ".vert", ".css", ".jsx", ".svg"]
                    },
                    "trigger_imagination": {
                        "enabled": True,
                        "process_types": ["lucid_cyberdelic_creativity"],
                        "burst_cycles": 1
                    },
                    "capacity_limits_override": {
                        "enabled": True,
                        "imagination_max_percent": 35,
                        "swarm_max_percent": 35,
                        "capacity_mode": "auto"
                    },
                    "last_detected_at": now,
                    "last_detected_formatted": datetime.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S"),
                    "status": "connected"
                }
            ]
            self._save_rules()

    def get_detected_devices_and_volumes(self) -> Dict[str, Any]:
        """
        Escanea el sistema en vivo en busca de particiones, volúmenes montados (/Volumes),
        unidades USB y el espacio de trabajo local.
        """
        detected_list = []
        now = time.time()
        
        # 1. Scanned disk partitions via psutil
        try:
            partitions = psutil.disk_partitions(all=True)
            for part in partitions:
                try:
                    usage = psutil.disk_usage(part.mountpoint)
                    detected_list.append({
                        "device": part.device,
                        "mountpoint": part.mountpoint,
                        "fstype": part.fstype,
                        "opts": part.opts,
                        "total_gb": round(usage.total / (1024 ** 3), 2),
                        "free_gb": round(usage.free / (1024 ** 3), 2),
                        "percent_used": usage.percent,
                        "is_external": "/Volumes" in part.mountpoint and part.mountpoint != "/Volumes/Macintosh HD",
                        "is_connected": True
                    })
                except Exception:
                    pass
        except Exception as e:
            print(f"⚠️ Error escaneando particiones: {e}")

        # 2. Scan macOS /Volumes directory directly
        volumes_dir = Path("/Volumes")
        if volumes_dir.exists() and volumes_dir.is_dir():
            try:
                for vol in volumes_dir.iterdir():
                    if vol.is_dir() and not any(d["mountpoint"] == str(vol) for d in detected_list):
                        try:
                            usage = psutil.disk_usage(str(vol))
                            detected_list.append({
                                "device": str(vol),
                                "mountpoint": str(vol),
                                "fstype": "APFS / ExFAT",
                                "opts": "rw",
                                "total_gb": round(usage.total / (1024 ** 3), 2),
                                "free_gb": round(usage.free / (1024 ** 3), 2),
                                "percent_used": usage.percent,
                                "is_external": str(vol) != "/Volumes/Macintosh HD",
                                "is_connected": True
                            })
                        except Exception:
                            detected_list.append({
                                "device": str(vol),
                                "mountpoint": str(vol),
                                "fstype": "Volume",
                                "opts": "rw",
                                "total_gb": 0,
                                "free_gb": 0,
                                "percent_used": 0,
                                "is_external": True,
                                "is_connected": True
                            })
            except Exception as e:
                print(f"⚠️ Error escaneando /Volumes: {e}")

        # 3. Add active local workspace
        if not any(d["mountpoint"] == str(self.workspace_path) for d in detected_list):
            try:
                usage = psutil.disk_usage(str(self.workspace_path))
                detected_list.append({
                    "device": "Workspace Soberano",
                    "mountpoint": str(self.workspace_path),
                    "fstype": "APFS Local",
                    "opts": "rw",
                    "total_gb": round(usage.total / (1024 ** 3), 2),
                    "free_gb": round(usage.free / (1024 ** 3), 2),
                    "percent_used": usage.percent,
                    "is_external": False,
                    "is_connected": True
                })
            except Exception:
                pass

        return {
            "timestamp": now,
            "devices_count": len(detected_list),
            "devices": detected_list
        }

    async def scan_and_execute_rules(self, force_all: bool = False) -> List[Dict[str, Any]]:
        """
        Escanea todos los medios/folders configurados. Si detecta un nuevo medio conectado
        o modificado, ejecuta el enrutamiento de memorias, procesos de imaginación y ajuste de capacidades.
        """
        devices_info = self.get_detected_devices_and_volumes()
        current_mounts = {d["mountpoint"] for d in devices_info["devices"]}
        
        events_triggered = []
        now = time.time()

        for rule in self.rules:
            if not rule.get("is_enabled", True):
                continue

            target_path = Path(rule["target_path"])
            path_str = str(target_path)
            
            is_present = target_path.exists() or any(path_str.startswith(m) for m in current_mounts)
            was_known = path_str in self.known_connected_paths
            
            if is_present:
                rule["status"] = "connected"
                if not was_known or force_all:
                    self.known_connected_paths.add(path_str)
                    rule["last_detected_at"] = now
                    rule["last_detected_formatted"] = datetime.fromtimestamp(now).strftime("%d/%m/%Y %H:%M:%S")
                    
                    # Execute automation for this rule
                    evt = await self._execute_rule_automation(rule)
                    events_triggered.append(evt)
            else:
                rule["status"] = "disconnected"
                if was_known:
                    self.known_connected_paths.discard(path_str)
                    system_notifications_engine.add_notification({
                        "title": f"🔌 Medio Desconectado: {rule['name']}",
                        "message": f"Se ha retirado el medio en {path_str}. Las memorias continúan persistidas en la Bóveda Soberana.",
                        "category": "Almacenamiento",
                        "severity": "info"
                    })

        self._save_rules()
        return events_triggered

    async def _execute_rule_automation(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ejecuta las 3 acciones clave al detectar/conectar un medio:
          1. Enrutamiento de memorias y archivos a cerebros específicos.
          2. Disparo de procesos de Imaginación Intuitiva asociados.
          3. Ajuste de límites de capacidades de procesamiento (Doble Tronco).
        """
        target_path = Path(rule["target_path"])
        rule_name = rule.get("name", target_path.name)
        now = time.time()
        
        indexed_files = []
        brains_str = "brain_genesis"

        # 1. Index and Connect Memories
        mem_cfg = rule.get("memory_routing", {})
        if mem_cfg.get("enabled", True):
            exts = mem_cfg.get("allowed_extensions", [".md", ".txt", ".json", ".pdf", ".py", ".cpp"])
            try:
                if target_path.is_file():
                    indexed_files.append(target_path.name)
                elif target_path.is_dir():
                    for f in list(target_path.glob("**/*.*"))[:25]:
                        if f.is_file() and f.suffix in exts:
                            indexed_files.append(f.name)
            except Exception as e:
                print(f"⚠️ Error indexando archivos para regla {rule['id']}: {e}")

            # Register StarSeed memory node
            cat = mem_cfg.get("memory_category", "Almacenamiento Enrutado")
            brains_str = ", ".join(mem_cfg.get("target_brains", ["brain_genesis"]))
            starseed_memory_engine.add_memory_node({
                "concept": f"📁 [Medio Enrutado] {rule_name}",
                "definition": f"Conexión detectada en {target_path}. Indexados {len(indexed_files)} archivos clave. Enrutado a cerebros: {brains_str}.",
                "category": cat,
                "resonance": 0.95
            })

        # 2. Trigger Imagination Processes
        imag_cfg = rule.get("trigger_imagination", {})
        imag_triggered = []
        if imag_cfg.get("enabled", True):
            from .intuitive_imagination_engine import intuitive_imagination_engine
            procs = imag_cfg.get("process_types", ["rem_synaptic_consolidation"])
            for p_type in procs:
                try:
                    theme_seed = f"Ingesta Automática de {rule_name}: {', '.join(indexed_files[:4])}"
                    res = await intuitive_imagination_engine.trigger_cycle(theme_seed, p_type)
                    imag_triggered.append(res.get("process_type", {}).get("name", p_type))
                except Exception as e:
                    print(f"⚠️ Error disparando proceso onírico {p_type}: {e}")

        # 3. Override Adaptive Capacity Limits
        cap_cfg = rule.get("capacity_limits_override", {})
        if cap_cfg.get("enabled", True):
            from .intuitive_imagination_engine import intuitive_imagination_engine
            from ..agents.swarm_manager import swarm_manager
            
            new_imag_pct = cap_cfg.get("imagination_max_percent", 30)
            new_swarm_pct = cap_cfg.get("swarm_max_percent", 45)
            mode = cap_cfg.get("capacity_mode", "auto")
            
            intuitive_imagination_engine.set_dual_trunk_limits(new_imag_pct, new_swarm_pct)
            if hasattr(swarm_manager, "set_capacity_mode"):
                swarm_manager.set_capacity_mode(mode, new_swarm_pct)

        # 4. Dispatch System Notification
        system_notifications_engine.add_notification({
            "title": f"⚡ Medio Detectado: {rule_name}",
            "message": f"Enrutamiento a {brains_str} activado. {len(indexed_files)} archivos indexados. Procesos disparados: {len(imag_triggered)}.",
            "category": "Almacenamiento & Memoria",
            "severity": "success"
        })

        event_result = {
            "type": "storage_media_connected",
            "rule_id": rule["id"],
            "rule_name": rule_name,
            "target_path": str(target_path),
            "indexed_files_count": len(indexed_files),
            "indexed_files": indexed_files[:10],
            "imagination_processes_triggered": imag_triggered,
            "capacity_override_applied": cap_cfg,
            "timestamp": now
        }
        self._notify_callbacks(event_result)
        return event_result

    # ================= Background Watcher Loop =================

    async def start_watcher_loop(self):
        print("💾 [StorageRoutingEngine] Bucle de vigilancia de medios y volúmenes iniciado...")
        while True:
            try:
                await asyncio.sleep(8)
                if self.is_watching:
                    await self.scan_and_execute_rules(force_all=False)
            except Exception as e:
                print(f"⚠️ Error en vigilante de almacenamiento: {e}")
                await asyncio.sleep(10)

    # ================= CRUD Operations =================

    def get_all_rules(self) -> List[Dict[str, Any]]:
        return self.rules

    def create_or_update_rule(self, rule_data: Dict[str, Any]) -> Dict[str, Any]:
        rule_id = rule_data.get("id") or f"rule_{int(time.time())}"
        rule_data["id"] = rule_id
        rule_data["updated_at"] = time.time()
        
        found = False
        for idx, r in enumerate(self.rules):
            if r["id"] == rule_id:
                self.rules[idx] = rule_data
                found = True
                break
        
        if not found:
            self.rules.append(rule_data)
        
        self._save_rules()
        return {"success": True, "rule": rule_data}

    def delete_rule(self, rule_id: str) -> Dict[str, Any]:
        self.rules = [r for r in self.rules if r["id"] != rule_id]
        self._save_rules()
        return {"success": True, "deleted_rule_id": rule_id}

    async def simulate_media_connection(self, rule_id: str) -> Dict[str, Any]:
        rule = next((r for r in self.rules if r["id"] == rule_id), None)
        if not rule:
            return {"success": False, "error": f"Regla {rule_id} no encontrada"}
        
        evt = await self._execute_rule_automation(rule)
        return {"success": True, "event": evt}

    def register_callback(self, cb):
        self.callbacks.append(cb)

    def _notify_callbacks(self, evt: Dict[str, Any]):
        for cb in self.callbacks:
            try:
                cb(evt)
            except Exception:
                pass

    def register_accessed_folder(self, folder_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Registra una carpeta accedida vía File System Access API.
        La agrega como dispositivo detectado para enrutamiento automático.
        """
        folder_name = folder_info.get("folder_name", "carpeta_desconocida")
        folder_path = folder_info.get("folder_path", "/")
        file_count = folder_info.get("file_count", 0)
        access_type = folder_info.get("access_type", "filesystem_api")

        # Agregar como dispositivo conocido
        self.known_connected_paths.add(folder_path)

        # Crear dispositivo virtual para el almacenamiento
        device = {
            "id": f"fs_{folder_path.replace('/', '_').replace(' ', '_')[:64]}",
            "name": folder_name,
            "path": folder_path,
            "type": "filesystem_api_virtual",
            "filesystem": "File System Access API",
            "storage_drive": folder_name,
            "isConnected": True,
            "capacity_mode": "auto",
            "lastConnected": time.time(),
            "permissions": {
                "mode": "bidirectional_merge",
                "access_type": access_type,
                "file_count": file_count,
                "registered_at": folder_info.get("registered_at", time.time())
            },
            "hasStorageAccess": True,
            "isExternalBrain": False,
            "brain_id": None,
            "fused_at": None,
            "fuse_mode": None,
            "lastFuseSync": None,
            "sync_status": "synced"
        }

        # Agregar regla de enrutamiento automático si no existe
        rule_exists = any(
            r.get("target_path", "").startswith(folder_path)
            for r in self.rules
        )
        if not rule_exists:
            default_rule = {
                "id": f"rule_fs_{folder_path.replace('/', '_')[:32]}",
                "name": f"Enrutamiento {folder_name}",
                "target_path": folder_path,
                "pattern": "**/*",
                "trigger_imagination": {
                    "enabled": True,
                    "process_types": ["starseed_memory_consolidation", "auto_code_optimization"],
                    "memory_routing": {
                        "enabled": True,
                        "target_brains": ["brain_genesis", "brain_hermes", "brain_hephaestus"]
                    }
                },
                "source": "filesystem_api_registration",
                "created_at": time.time(),
                "capacity_mode": "auto"
            }
            self.rules.append(default_rule)
            self._save_rules()

        self._notify_callbacks({
            "type": "new_storage_device",
            "device": device,
            "action": "register_folder"
        })

        return {
            "success": True,
            "device": device,
            "message": f"Carpeta '{folder_name}' registrada y enrutada automáticamente."
        }

storage_routing_engine = StorageRoutingEngine()
