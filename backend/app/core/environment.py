import os
import time
import psutil
from datetime import datetime
from typing import Dict, Any

class EnvironmentSensor:
    """
    Monitors live physical and system environment parameters (battery, CPU load,
    thermal state, active node metrics, time-of-day) to dynamically modulate AI personality
    and operational parameters (as outlined in Astraura / StarSeed OS principles).
    """
    def __init__(self, workspace_path: str = "."):
        self.workspace_path = workspace_path
        
    def get_live_metrics(self) -> Dict[str, Any]:
        # 1. Power & Battery Status
        battery = psutil.sensors_battery()
        if battery:
            battery_percent = round(battery.percent, 1)
            power_plugged = battery.power_plugged
            secs_left = battery.secsleft if battery.secsleft != psutil.POWER_TIME_UNLIMITED else -1
        else:
            # Fallback for desktops or virtualized containers
            battery_percent = 100.0
            power_plugged = True
            secs_left = -1
            
        # 2. CPU & Memory Utilization
        cpu_percent = psutil.cpu_percent(interval=0.06)
        if cpu_percent <= 0.0 and hasattr(os, "getloadavg"):
            try:
                load1, _, _ = os.getloadavg()
                cores = psutil.cpu_count(logical=True) or 8
                cpu_percent = min(100.0, max(2.5, round((load1 / cores) * 100.0, 1)))
            except Exception:
                cpu_percent = 4.5
        mem = psutil.virtual_memory()
        
        # 3. Workspace File & Storage Context
        active_files = 0
        total_size_mb = 0.0
        try:
            for root, _, files in os.walk(self.workspace_path):
                if ".venv" in root or ".git" in root or "node_modules" in root:
                    continue
                for f in files:
                    fp = os.path.join(root, f)
                    if os.path.exists(fp):
                        active_files += 1
                        total_size_mb += os.path.getsize(fp) / (1024 * 1024)
        except Exception:
            pass

        # 4. Contextual Persona Modulation (Astraura Behavioral Directives)
        if battery_percent <= 20 and not power_plugged:
            mode = "Eco-Conserve / Ultra-Concise"
            energy_directive = "Modo crítico de energía: Respuestas directas, esenciales, mínimas llamadas a sub-agentes para conservar batería."
        elif battery_percent >= 80 or power_plugged:
            mode = "Expansive / Full Cognitive Depth"
            energy_directive = "Energía óptima: Capacidad analítica máxima, exploración asociativa profunda y síntesis creativa."
        else:
            mode = "Balanced Standard"
            energy_directive = "Modo balanceado: Razonamiento fluido y optimización continua."

        current_time = datetime.now()
        
        return {
            "timestamp": current_time.isoformat(),
            "time_formatted": current_time.strftime("%Y-%m-%d %H:%M:%S"),
            "battery": {
                "percent": battery_percent,
                "is_charging": power_plugged,
                "seconds_left": secs_left
            },
            "system_load": {
                "cpu_percent": cpu_percent,
                "ram_used_gb": round((mem.total - mem.available) / (1024 ** 3), 2),
                "ram_available_gb": round(mem.available / (1024 ** 3), 2),
                "ram_percent": mem.percent
            },
            "workspace": {
                "active_files_count": active_files,
                "total_size_mb": round(total_size_mb, 2)
            },
            "behavioral_state": {
                "mode": mode,
                "directive": energy_directive
            }
        }

environment_sensor = EnvironmentSensor()

if __name__ == "__main__":
    import json
    print(json.dumps(environment_sensor.get_live_metrics(), indent=2))
