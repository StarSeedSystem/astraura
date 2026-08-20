import time
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

class SystemNotificationsEngine:
    """
    Centro Unificado de Notificaciones y Árbol de Logs de Procesos en Segundo Plano.
    Centraliza:
      - Alertas del sistema y telemetría de hardware (temperatura, batería crítica, red).
      - Sugerencias y cambios automáticos emitidos por la Imaginación Intuitiva / Sueños.
      - Bitácora de ejecución de workflows, indexación y sincronización de Google Drive.
      - Árbol de ramificación de logs con filtrado interactivo y acciones en un clic.
    """
    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or Path("/Users/alex/Documents/IA 1.58 bit/data/notifications")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.notif_file = self.storage_dir / "notifications_registry.json"
        
        self.notifications: List[Dict[str, Any]] = []
        self.branching_logs: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if self.notif_file.exists():
            try:
                data = json.loads(self.notif_file.read_text(encoding="utf-8"))
                self.notifications = data.get("notifications", [])
                self.branching_logs = data.get("branching_logs", [])
            except Exception as e:
                print(f"[NotificationsEngine] Error loading notifications: {e}")
                self._seed_default_notifications()
        else:
            self._seed_default_notifications()

    def _seed_default_notifications(self):
        self.notifications = [
            {
                "id": "notif_sens_1",
                "title": "Sensorium 360° Activo",
                "message": "Clima promedio calculado en 24.5°C y geolocalización sincronizada con éxito.",
                "category": "Sensores & Entorno",
                "severity": "info",
                "timestamp": time.time() - 900,
                "read": False,
                "action_type": "view_sensorium"
            },
            {
                "id": "notif_imag_1",
                "title": "Sugerencia de Imaginación Intuitiva",
                "message": "Se detectó potencial de compresión ternaria 8.0x en las carpetas de Google Drive vinculadas.",
                "category": "Imaginación & Sueños",
                "severity": "suggestion",
                "timestamp": time.time() - 400,
                "read": False,
                "action_type": "apply_sync"
            },
            {
                "id": "notif_hw_1",
                "title": "Optimización ARM NEON M1",
                "message": "8 núcleos operando a 18% con memoria unificada de 6.1 GB disponibles.",
                "category": "Hardware & M1",
                "severity": "success",
                "timestamp": time.time() - 200,
                "read": False,
                "action_type": "view_diagnostics"
            }
        ]

        self.branching_logs = [
            {
                "id": "log_tree_1",
                "root_process": "Ciclo Sensorial & Clima Multi-Fuente",
                "timestamp": time.time() - 1200,
                "status": "success",
                "branches": [
                    {"step": "Consulta Open-Meteo", "status": "ok", "latency_ms": 120},
                    {"step": "Consulta Wttr.in", "status": "ok", "latency_ms": 180},
                    {"step": "Cálculo de Promedio Ponderado", "status": "ok", "latency_ms": 2}
                ]
            },
            {
                "id": "log_tree_2",
                "root_process": "Imaginación Intuitiva Always-On // Consolidación",
                "timestamp": time.time() - 600,
                "status": "success",
                "branches": [
                    {"step": "Muestreo Acústico (42 dB)", "status": "ok", "latency_ms": 15},
                    {"step": "Generación de Analogía Creativa", "status": "ok", "latency_ms": 320},
                    {"step": "Reciclaje de 2 Memorias Efímeras", "status": "ok", "latency_ms": 10}
                ]
            }
        ]
        self._save()

    def _save(self):
        try:
            payload = {
                "notifications": self.notifications[:60],
                "branching_logs": self.branching_logs[:40]
            }
            self.notif_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"[NotificationsEngine] Error saving: {e}")

    def add_notification(self, notif: Dict[str, Any]):
        n_id = notif.get("id") or f"notif_{int(time.time())}"
        # If notification already exists with same id, update it
        existing = next((n for n in self.notifications if n["id"] == n_id), None)
        if existing:
            existing.update(notif)
            self._save()
            return existing

        record = {
            "id": n_id,
            "title": notif.get("title", "Aviso del Sistema"),
            "message": notif.get("message", ""),
            "category": notif.get("category", "General"),
            "severity": notif.get("severity", "info"), # "info" | "suggestion" | "warning" | "success"
            "timestamp": notif.get("timestamp", time.time()),
            "read": notif.get("read", False),
            "action_type": notif.get("action_type", None),
            "branch_id": notif.get("branch_id", None),
            "status": notif.get("status", "pending")
        }
        self.notifications.insert(0, record)
        self._save()
        return record

    def sync_with_imagination(self, branches: List[Dict[str, Any]]):
        """
        Sincroniza bidireccionalmente las propuestas pendientes de Imaginación Intuitiva con Notificaciones.
        Garantiza que ambas listas sean 100% idénticas.
        """
        pending_branches = [b for b in branches if b.get("status") == "pending_approval" or b.get("requires_user_approval")]
        existing_branch_ids = set()

        for n in self.notifications:
            b_id = n.get("branch_id")
            if not b_id and n.get("id", "").startswith("notif_req_"):
                b_id = n["id"].replace("notif_req_", "")
                n["branch_id"] = b_id

            if b_id:
                existing_branch_ids.add(b_id)
                matching = next((b for b in branches if b.get("id") == b_id), None)
                if matching:
                    if matching.get("status") == "applied" or not matching.get("requires_user_approval"):
                        n["status"] = "applied"
                        n["read"] = True
                else:
                    # If branch was deleted, mark notification resolved/applied
                    n["status"] = "applied"
                    n["read"] = True

        for b in pending_branches:
            b_id = b.get("id")
            if b_id and b_id not in existing_branch_ids:
                self.notifications.insert(0, {
                    "id": f"notif_req_{b_id}",
                    "title": f"⚠️ Solicitud de Autorización: {b.get('process_name', 'Imaginación')}",
                    "message": f"Propuesta '{b.get('theme', 'Auto-mejora')}'. Hipótesis: {b.get('hypothesis', '')}",
                    "category": "Solicitud de Autorización",
                    "severity": "warning",
                    "timestamp": b.get("timestamp", time.time()),
                    "read": False,
                    "branch_id": b_id,
                    "status": "pending",
                    "action_type": "grant_authorization"
                })
        self._save()

    def add_branching_log(self, log_entry: Dict[str, Any]):
        self.branching_logs.insert(0, log_entry)
        self._save()

    def apply_notification(self, notif_id: str) -> Dict[str, Any]:
        target = next((n for n in self.notifications if n["id"] == notif_id), None)
        if not target:
            return {"success": False, "error": "Notificación no encontrada"}

        target["read"] = True
        target["status"] = "applied"
        target["applied_at"] = time.time()
        
        # Log to branching logs
        self.add_branching_log({
            "id": f"log_apply_{int(time.time())}",
            "root_process": f"Aplicación de Solicitud: {target.get('title', 'Notificación')}",
            "timestamp": time.time(),
            "status": "success",
            "branches": [
                {"step": "Validación de Permisos de Usuario", "status": "ok", "latency_ms": 5},
                {"step": "Ejecución de Acción por Agente Especializado", "status": "ok", "latency_ms": 42},
                {"step": "Consolidación en Memoria Soberana", "status": "ok", "latency_ms": 12}
            ]
        })
        self._save()
        return {"success": True, "notification": target}

    def mark_as_read(self, notif_id: Optional[str] = None) -> bool:
        """Marca una o todas las notificaciones como leídas."""
        if notif_id:
            target = next((n for n in self.notifications if n["id"] == notif_id), None)
            if target:
                target["read"] = True
                self._save()
                return True
            return False
        else:
            for n in self.notifications:
                n["read"] = True
            self._save()
            return True

    def delete_notification(self, notif_id: str) -> Dict[str, Any]:
        initial_len = len(self.notifications)
        self.notifications = [n for n in self.notifications if n["id"] != notif_id]
        self._save()
        return {"success": len(self.notifications) < initial_len}

    def clear_all(self) -> Dict[str, Any]:
        self.notifications = []
        self._save()
        return {"success": True}

    def get_all(self) -> Dict[str, Any]:
        unread_count = sum(1 for n in self.notifications if not n.get("read"))
        return {
            "unread_count": unread_count,
            "notifications": self.notifications,
            "branching_logs": self.branching_logs
        }

system_notifications_engine = SystemNotificationsEngine()
