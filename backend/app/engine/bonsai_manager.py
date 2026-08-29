# ═══════════════════════════════════════════════════════════════════════════
# BONSAI 1-BIT & TERNARY MANAGER (Adenda 174)
# ---------------------------------------------------------------------------
# Gestor de modelos Bonsai (1-bit / Q1_0) y Ternary-Bonsai (1.58-bit / Q2_0 / PQ2_0)
# con soporte nativo para aceleración por GPU Metal en Apple Silicon (macOS),
# CUDA/Vulkan en Linux/Windows y CPU.
#
# Integra las innovaciones de PrismML Bonsai con Astraura 1.58-bit:
#   • Modelos Ternary (1.7B, 4B, 8B, 27B) y 1-bit (1.7B, 4B, 8B, 27B).
#   • Offload a GPU Metal (-ngl 99) en Apple Silicon sin cuelgues (superando el
#     límite CPU-only de BitNet i2_s).
#   • Visión multimodal (VLM 27B) vía proyector multimodal (--mmproj).
#   • Tool calling nativo OpenAI con plantillas Jinja y soporte MCP.
#   • Contexto largo de hasta 256k con Flash Attention y KV Cache Q4_0 (BONSAI_KV4).
# ═══════════════════════════════════════════════════════════════════════════

import os
import sys
import json
import time
import socket
import logging
import platform
import subprocess
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("astraura.bonsai")

# Directorios de búsqueda de modelos Bonsai
BONSAI_SEARCH_DIRS = [
    Path(__file__).parent.parent.parent / "BitNet" / "models",
    Path(__file__).parent.parent.parent / "models" / "bonsai",
    Path.home() / ".cache" / "bonsai",
    Path.home() / ".cache" / "huggingface" / "hub",
]

BONSAI_CATALOG_INFO = {
    "ternary-27b": {
        "repo": "prism-ml/Ternary-Bonsai-27B-gguf",
        "family": "ternary",
        "size": "27B",
        "bits": 1.7,
        "has_vision": True,
        "context": 262144,
        "description": "Ternary 1.58-bit VLM con visión multimodal y tool calling nativo",
    },
    "ternary-8b": {
        "repo": "prism-ml/Ternary-Bonsai-8B-gguf",
        "family": "ternary",
        "size": "8B",
        "bits": 1.7,
        "has_vision": False,
        "context": 262144,
        "description": "Ternary 1.58-bit para razonamiento profundo y contexto largo",
    },
    "ternary-4b": {
        "repo": "prism-ml/Ternary-Bonsai-4B-gguf",
        "family": "ternary",
        "size": "4B",
        "bits": 1.7,
        "has_vision": False,
        "context": 65536,
        "description": "Ternary 1.58-bit para código y ejecución rápida de agentes",
    },
    "ternary-1.7b": {
        "repo": "prism-ml/Ternary-Bonsai-1.7B-gguf",
        "family": "ternary",
        "size": "1.7B",
        "bits": 1.7,
        "has_vision": False,
        "context": 32768,
        "description": "Ternary 1.58-bit ultra-rápido para voz en tiempo real",
    },
    "bonsai-27b": {
        "repo": "prism-ml/Bonsai-27B-gguf",
        "family": "bonsai",
        "size": "27B",
        "bits": 1.125,
        "has_vision": True,
        "context": 262144,
        "description": "1-bit VLM con huella ultraligera (~1.125 bits/peso) y visión",
    },
}


class BonsaiManager:
    """Administrador de servidor e inferencia Bonsai 1-bit / Ternary."""

    def __init__(self, port: int = 8080, host: str = "127.0.0.1"):
        self.port = int(os.environ.get("BONSAI_PORT", str(port)))
        self.host = os.environ.get("BONSAI_HOST", host)
        self.base_url = f"http://{self.host}:{self.port}"
        self._proc: Optional[subprocess.Popen] = None
        self._lock = threading.Lock()

    def discover_local_models(self) -> List[Dict[str, Any]]:
        """Busca modelos GGUF y mmproj de Bonsai en los directorios locales."""
        found = []
        for d in BONSAI_SEARCH_DIRS:
            if not d.exists():
                continue
            for gguf in d.glob("**/*.gguf"):
                name = gguf.name.lower()
                # Filtrar si es Bonsai o Ternary
                if "bonsai" in name or "ternary" in name:
                    is_mmproj = "mmproj" in name
                    is_drafter = "dspark" in name or "dflash" in name
                    found.append({
                        "path": str(gguf),
                        "filename": gguf.name,
                        "size_mb": round(gguf.stat().st_size / (1024 * 1024), 1),
                        "is_mmproj": is_mmproj,
                        "is_drafter": is_drafter,
                        "dir": str(d),
                    })
        return found

    def find_best_model(self, prefer_size: str = "27B", prefer_family: str = "ternary") -> Tuple[Optional[Path], Optional[Path]]:
        """Devuelve (model_path, mmproj_path) según preferencias de tamaño y familia."""
        models = self.discover_local_models()
        main_models = [m for m in models if not m["is_mmproj"] and not m["is_drafter"]]
        mmprojs = [m for m in models if m["is_mmproj"]]

        # Priorizar coincidencias
        chosen_model: Optional[Path] = None
        for m in main_models:
            name = m["filename"].lower()
            if prefer_family in name and prefer_size.lower() in name:
                chosen_model = Path(m["path"])
                break

        if not chosen_model and main_models:
            chosen_model = Path(main_models[0]["path"])

        chosen_mmproj = Path(mmprojs[0]["path"]) if mmprojs else None
        return chosen_model, chosen_mmproj

    def probe_server(self, timeout: float = 2.0) -> Dict[str, Any]:
        """Comprueba si el servidor Bonsai está respondiendo en su puerto."""
        import urllib.request
        import urllib.error

        url = f"{self.base_url}/health"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Astraura/1.58"})
            with urllib.request.urlopen(req, timeout=timeout) as res:
                if res.status == 200:
                    return {"state": "listo", "base": self.base_url, "http": 200}
        except urllib.error.HTTPError as e:
            if e.code == 503:
                return {"state": "arrancando", "base": self.base_url, "http": 503}
            return {"state": "error", "base": self.base_url, "http": e.code}
        except Exception:
            pass

        # Comprobar socket TCP
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            r = s.connect_ex((self.host, self.port))
            s.close()
            if r == 0:
                return {"state": "respondiendo_sin_modelo", "base": self.base_url}
        except Exception:
            pass

        return {"state": "apagado", "base": self.base_url}

    def get_hardware_config(self) -> Dict[str, Any]:
        """Detecta aceleración óptima (Metal GPU en Apple Silicon vs CUDA vs CPU)."""
        is_darwin = sys.platform == "darwin"
        is_arm64 = platform.machine().lower() in ("arm64", "aarch64")

        gpu_backend = "cpu"
        ngl = 0

        if is_darwin and is_arm64:
            gpu_backend = "metal"
            # En Ternary (Q2_0 / PQ2_0) Metal acelera todas las capas sin error
            ngl = 99
        elif os.environ.get("CUDA_VISIBLE_DEVICES") or os.path.exists("/usr/local/cuda"):
            gpu_backend = "cuda"
            ngl = 99

        return {
            "gpu_backend": gpu_backend,
            "ngl": int(os.environ.get("BONSAI_NGL", str(ngl))),
            "flash_attn": True,
            "kv4_cache": os.environ.get("BONSAI_KV4") == "1",
            "speculative": os.environ.get("BONSAI_SPECULATIVE") == "1",
        }

    def get_status(self) -> Dict[str, Any]:
        """Estado completo del subsistema Bonsai para el dashboard y telemetría."""
        probe = self.probe_server()
        hw = self.get_hardware_config()
        local_models = self.discover_local_models()
        best_model, best_mmproj = self.find_best_model()

        return {
            "status": probe["state"],
            "ready": probe["state"] == "listo",
            "endpoint": self.base_url,
            "hardware": hw,
            "local_models_count": len(local_models),
            "best_model": str(best_model.name) if best_model else None,
            "has_vision_mmproj": best_mmproj is not None,
            "catalog": BONSAI_CATALOG_INFO,
        }


bonsai_manager = BonsaiManager()
