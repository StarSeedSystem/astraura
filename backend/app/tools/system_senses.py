import os
import time
import socket
import psutil
import platform
import subprocess
from typing import Dict, Any, List

class SystemSenses:
    """
    Real-time sensory perception of the host machine:
    Battery, thermal state, CPU core loads, memory allocation, storage partitions,
    network interfaces, uptime, and macOS hardware telemetry.
    """
    def get_full_telemetry(self) -> Dict[str, Any]:
        # 1. Battery & Power
        battery = psutil.sensors_battery()
        battery_data = {
            "percent": round(battery.percent, 1) if battery else 100.0,
            "is_charging": battery.power_plugged if battery else True,
            "power_plugged": battery.power_plugged if battery else True,
            "secs_left": battery.secsleft if battery and battery.secsleft != psutil.POWER_TIME_UNLIMITED else -1
        }

        # 2. CPU & Cores
        cpu_pct = psutil.cpu_percent(interval=None)
        per_cpu = psutil.cpu_percent(interval=None, percpu=True)
        cpu_freq = psutil.cpu_freq()

        # 3. RAM & Virtual Memory
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()

        # 4. Storage & Disks
        disk_partitions = []
        for part in psutil.disk_partitions(all=False):
            try:
                usage = psutil.disk_usage(part.mountpoint)
                disk_partitions.append({
                    "device": part.device,
                    "mountpoint": part.mountpoint,
                    "fstype": part.fstype,
                    "total_gb": round(usage.total / (1024 ** 3), 2),
                    "used_gb": round(usage.used / (1024 ** 3), 2),
                    "free_gb": round(usage.free / (1024 ** 3), 2),
                    "percent_used": usage.percent
                })
            except Exception:
                pass

        # 5. Network Interfaces & IP
        hostname = socket.gethostname()
        local_ip = "127.0.0.1"
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
        except Exception:
            pass

        net_io = psutil.net_io_counters()

        # 6. Host Uptime & OS
        boot_time = psutil.boot_time()
        uptime_seconds = int(time.time() - boot_time)
        uptime_formatted = self._format_uptime(uptime_seconds)

        return {
            "timestamp": time.time(),
            "hostname": hostname,
            "local_ip": local_ip,
            "uptime": uptime_formatted,
            "uptime_seconds": uptime_seconds,
            "os": f"{platform.system()} {platform.release()} ({platform.machine()})",
            "processor": platform.processor() or "Apple Silicon",
            "battery": battery_data,
            "cpu": {
                "total_percent": cpu_pct,
                "per_core_percent": per_cpu,
                "cores_count": len(per_cpu),
                "frequency_mhz": round(cpu_freq.current, 1) if cpu_freq else None
            },
            "memory": {
                "total_gb": round(mem.total / (1024 ** 3), 2),
                "available_gb": round(mem.available / (1024 ** 3), 2),
                "used_gb": round((mem.total - mem.available) / (1024 ** 3), 2),
                "percent_used": mem.percent,
                "swap_used_gb": round(swap.used / (1024 ** 3), 2)
            },
            "disks": disk_partitions,
            "network": {
                "bytes_sent_mb": round(net_io.bytes_sent / (1024 * 1024), 2),
                "bytes_recv_mb": round(net_io.bytes_recv / (1024 * 1024), 2)
            }
        }

    @staticmethod
    def _format_uptime(secs: int) -> str:
        hours, rem = divmod(secs, 3600)
        minutes, seconds = divmod(rem, 60)
        days, hours = divmod(hours, 24)
        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        return f"{hours}h {minutes}m {seconds}s"

system_senses = SystemSenses()
