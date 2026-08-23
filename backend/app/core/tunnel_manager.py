"""
Astraura 1.58-Bit Sovereign Tunnel & Mesh Manager
Automatically starts, monitors, and advertises HTTPS Cloudflare Tunnels and local LAN endpoints
so that web clients (including https://astraura.vercel.app and mobile devices) automatically connect to the real sovereign engine.
"""

import os
import sys
import re
import json
import time
import socket
import shutil
import subprocess
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional

class SovereignTunnelManager:
    def __init__(self, port: int = 8000):
        self.port = port
        self.active_url: Optional[str] = None
        self.tunnel_process: Optional[subprocess.Popen] = None
        self.is_running: bool = False
        self.started_at: float = 0
        self.lock = threading.Lock()
        self.last_error: Optional[str] = None
        self.monitor_thread: Optional[threading.Thread] = None

        # Data paths
        self.base_dir = Path(__file__).resolve().parent.parent.parent
        self.data_file = self.base_dir / "data" / "active_tunnel.json"
        self.frontend_public_file = self.base_dir.parent / "frontend" / "public" / "active_tunnel.json"
        self.vercel_public_file = self.base_dir.parent / "deploy" / "vercel-app" / "active_tunnel.json"

        # Load previously saved tunnel if available
        self._load_saved_tunnel()

    def _load_saved_tunnel(self):
        try:
            if self.data_file.exists():
                with open(self.data_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("active") and data.get("url"):
                        self.active_url = data["url"]
        except Exception:
            pass

    def get_local_ip_addresses(self) -> List[str]:
        """Returns all non-loopback local IPv4 addresses (LAN/Wi-Fi)."""
        ips = []
        try:
            # Primary default route IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0.5)
            s.connect(("8.8.8.8", 80))
            primary_ip = s.getsockname()[0]
            s.close()
            if primary_ip and primary_ip not in ips:
                ips.append(primary_ip)
        except Exception:
            pass

        try:
            host_name = socket.gethostname()
            for ip in socket.gethostbyname_ex(host_name)[2]:
                if not ip.startswith("127.") and ip not in ips:
                    ips.append(ip)
        except Exception:
            pass

        return ips

    def _save_tunnel_metadata(self, url: str, is_active: bool = True):
        payload = {
            "active": is_active,
            "url": url,
            "port": self.port,
            "lan_ips": self.get_local_ip_addresses(),
            "updated_at": time.time(),
            "iso_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "provider": "cloudflare_quick_tunnel"
        }

        # Write to backend data
        try:
            self.data_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
        except Exception as e:
            print(f"⚠️ [TunnelManager] Error saving to {self.data_file}: {e}")

        # Write to frontend/public
        try:
            self.frontend_public_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.frontend_public_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
        except Exception:
            pass

        # Write to deploy/vercel-app
        try:
            self.vercel_public_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.vercel_public_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
        except Exception:
            pass

    def start_tunnel_in_background(self) -> bool:
        """Starts cloudflared tunnel in a dedicated monitoring background thread."""
        # (OS · Ola 3) Air-Gap REAL: con el aislamiento activo NO se abre ningún túnel
        # público (ni al arrancar ni desde /api/system/tunnel/start|restart).
        try:
            from .privacy_manager import is_air_gapped
            if is_air_gapped():
                self.last_error = "air-gap activo: túnel público deshabilitado."
                print(f"🔒 [TunnelManager] {self.last_error}")
                return False
        except Exception:
            pass
        with self.lock:
            if self.is_running and self.tunnel_process and self.tunnel_process.poll() is None:
                return True

            cloudflared_bin = shutil.which("cloudflared") or "/opt/homebrew/bin/cloudflared" or "/usr/local/bin/cloudflared"
            if not os.path.exists(str(cloudflared_bin)) and not shutil.which("cloudflared"):
                self.last_error = "cloudflared no está instalado en el sistema."
                print(f"⚠️ [TunnelManager] {self.last_error}")
                return False

            self.monitor_thread = threading.Thread(target=self._run_tunnel_loop, args=(str(cloudflared_bin),), daemon=True)
            self.monitor_thread.start()
            return True

    def start_tunnel(self) -> bool:
        """(OS · Ola 3) Alias explícito: respeta el Air-Gap igual que start_tunnel_in_background."""
        return self.start_tunnel_in_background()

    def _run_tunnel_loop(self, cloudflared_bin: str):
        cmd = [
            cloudflared_bin,
            "tunnel",
            "--url", f"http://127.0.0.1:{self.port}",
            "--no-autoupdate"
        ]

        print(f"🌐 [TunnelManager] Iniciando túnel HTTPS seguro hacia puerto {self.port}...")
        try:
            self.tunnel_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            self.is_running = True
            self.started_at = time.time()

            url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")

            for line in iter(self.tunnel_process.stdout.readline, ""):
                if not line:
                    break
                
                # Check for tunnel URL match
                match = url_pattern.search(line)
                if match:
                    discovered_url = match.group(0)
                    if discovered_url != self.active_url:
                        self.active_url = discovered_url
                        print(f"✨ [TunnelManager] ¡Túnel HTTPS Soberano ACTIVO!: {self.active_url}")
                        self._save_tunnel_metadata(self.active_url, True)

            # Process exited
            self.is_running = False
            self.tunnel_process.poll()
            print("⚠️ [TunnelManager] El proceso de túnel ha finalizado.")
        except Exception as e:
            self.last_error = str(e)
            self.is_running = False
            print(f"❌ [TunnelManager] Error en el túnel: {e}")

    def stop_tunnel(self):
        """Stops the active tunnel process."""
        with self.lock:
            if self.tunnel_process:
                try:
                    self.tunnel_process.terminate()
                    self.tunnel_process.wait(timeout=3)
                except Exception:
                    try:
                        self.tunnel_process.kill()
                    except Exception:
                        pass
                self.tunnel_process = None
            self.is_running = False
            if self.active_url:
                self._save_tunnel_metadata(self.active_url, False)

    def get_status(self) -> Dict[str, Any]:
        """Returns the full status and connectivity metadata of the tunnel and LAN."""
        local_ips = self.get_local_ip_addresses()
        lan_endpoints = [f"http://{ip}:{self.port}" for ip in local_ips]
        
        # Test if active URL is set
        url = self.active_url
        if not url and self.data_file.exists():
            self._load_saved_tunnel()
            url = self.active_url

        return {
            "active": self.is_running or (url is not None),
            "url": url,
            "lan_ips": local_ips,
            "lan_endpoints": lan_endpoints,
            "port": self.port,
            "provider": "cloudflare_quick_tunnel",
            "uptime_seconds": time.time() - self.started_at if self.started_at else 0,
            "last_error": self.last_error,
            "connect_links": {
                "vercel_app_linked": f"https://astraura.vercel.app/?gateway={url}" if url else "https://astraura.vercel.app/",
                "direct_api": f"{url}/api" if url else f"http://127.0.0.1:{self.port}/api",
                "direct_ws": f"{url.replace('https://', 'wss://')}/ws/chat" if url else f"ws://127.0.0.1:{self.port}/ws/chat"
            }
        }

# Global singleton
tunnel_manager = SovereignTunnelManager(port=8000)
