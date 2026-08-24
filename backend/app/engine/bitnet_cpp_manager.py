import os
import subprocess
import shutil
import threading
import time
import urllib.request
from pathlib import Path
from typing import Dict, Any, List, Optional
from ..core.config import settings

# Plantilla de chat OFICIAL de BitNet-b1.58-2B-4T (tokenizer_config.json):
# «{Role}: {content}<|eot_id|>» por mensaje y «Assistant: » como prompt de
# generación. La que trae el GGUF es un placeholder roto («BITNETAssistant»),
# así que el servidor gestionado la sobreescribe con esta.
BITNET_CHAT_TEMPLATE = (
    "{%- for message in messages %}{%- if loop.first %}{{ bos_token }}{%- endif %}"
    "{%- if message['role'] == 'system' %}{{ 'System: ' + message['content'] + '<|eot_id|>' }}"
    "{%- elif message['role'] == 'user' %}{{ 'User: ' + message['content'] + '<|eot_id|>' }}"
    "{%- elif message['role'] == 'assistant' %}{{ 'Assistant: ' + message['content'] + '<|eot_id|>' }}"
    "{%- endif %}{%- endfor %}"
    "{%- if add_generation_prompt %}{{ 'Assistant: ' }}{%- endif %}"
)

class BitNetCppManager:
    """
    Manages the installation, compilation, model discovery, and native execution 
    of Microsoft's official BitNet framework (bitnet.cpp) optimized for ARM NEON and Apple Silicon.
    """
    def __init__(self):
        self.repo_dir = settings.bitnet_path
        self.models_dir = settings.models_path
        self.build_dir = self.repo_dir / "build"
        # ── Servidores nativos gestionados (llama-server del build de BitNet) ──
        # DOS perfiles sobre el MISMO GGUF (los pesos van por mmap → compartidos):
        #   · "interactive": chat/orbe — prioridad normal de CPU.
        #   · "background": imaginación/enjambre/director (cognition) — `nice` alto,
        #     para que el fondo NUNCA robe el turno al usuario en máquinas con pocos
        #     núcleos. El motor elige perfil según la prioridad del turno.
        self._servers: Dict[str, Dict[str, Any]] = {}
        self._server_log = Path(os.environ.get("ASTRAURA_BITNET_LOG") or (self.repo_dir.parent / "bitnet-server.log"))
        self.server_port = int(os.environ.get("ASTRAURA_BITNET_PORT") or 8790)
        self.server_ctx = int(os.environ.get("ASTRAURA_BITNET_CTX") or 4096)
        # 1 slot por perfil: cada petición usa el contexto COMPLETO y las demás
        # esperan en cola (con pocos núcleos, el paralelismo solo trocea la KV).
        self.server_parallel = max(1, int(os.environ.get("ASTRAURA_BITNET_PAR") or 1))
        self._server_lock = threading.Lock()  # un solo spawn aunque llamen N corrutinas a la vez
        
    def check_status(self) -> Dict[str, Any]:
        """
        Inspects whether bitnet.cpp is cloned, compiled, and what models are available.
        """
        is_cloned = (self.repo_dir / "setup_env.py").exists() or (self.repo_dir / "CMakeLists.txt").exists()
        # (Adenda 153) HONESTO: compilado = existe un binario de inferencia real. Antes
        # bastaba con que existiera `run_inference.py` (el submódulo sin build) y el
        # estado decía "BitNet instalado" sin serlo.
        bin_dir = self.build_dir / "bin"
        is_compiled = any((bin_dir / b).exists() for b in ("llama-cli", "main", "bitnet-cli", "llama-server"))
        
        # Check available GGUF models: carpeta de modelos del backend Y la carpeta
        # models/ del propio repo BitNet (donde deja el modelo `setup_env.py` /
        # `huggingface-cli download … --local-dir BitNet/models/…`). (Ola 3)
        found_models = []
        seen: set = set()
        for root in (self.models_dir, self.repo_dir / "models"):
            if not root.exists():
                continue
            for p in root.glob("**/*"):
                if p.suffix in [".gguf", ".bin"] and p.is_file():
                    rp = str(p.resolve())
                    if rp in seen:
                        continue
                    seen.add(rp)
                    found_models.append({
                        "name": p.name,
                        "path": rp,
                        "size_mb": round(p.stat().st_size / (1024 * 1024), 2),
                        "quantization": "i2_s (1.58-bit ternary)" if "i2_s" in p.name else "GGUF"
                    })
        # Preferimos i2_s (el formato ternario real) si hay varios.
        found_models.sort(key=lambda m: (0 if "i2_s" in m["name"] else 1, -m["size_mb"]))

        return {
            "is_cloned": is_cloned,
            "is_compiled": is_compiled,
            "repo_path": str(self.repo_dir),
            "models_available": found_models,
            "recommended_models": [
                {
                    "name": "BitNet-b1.58-2B-4T (i2_s)",
                    "repo_id": "microsoft/BitNet-b1.58-2B-4T",
                    "approx_size_mb": 750,
                    "description": "Official Microsoft 1.58-bit 2B model quantized with ternary weights."
                },
                {
                    "name": "BitNet-b1.58-Large (i2_s)",
                    "repo_id": "1bitLLM/bitnet_b1_58-large",
                    "approx_size_mb": 420,
                    "description": "Compact 1.58-bit research foundation model."
                }
            ]
        }

    # ───────────────────── Servidor nativo gestionado (Ola 3) ─────────────────────

    def server_binary(self) -> Optional[Path]:
        """Ruta del llama-server compilado (build oficial o build-avx2 alternativo)."""
        for rel in ("build/bin/llama-server", "build-avx2/bin/llama-server"):
            p = self.repo_dir / rel
            if p.exists():
                return p
        return None

    def _port_for(self, profile: str) -> int:
        return self.server_port if profile == "interactive" else self.server_port + 1

    def _alive(self, profile: str, timeout: float = 1.5) -> bool:
        st = self._servers.get(profile)
        if not st or not st.get("base"):
            return False
        try:
            with urllib.request.urlopen(f"{st['base']}/health", timeout=timeout) as res:
                return b"ok" in res.read()
        except Exception:
            return False

    def ensure_server(self, wait_seconds: float = 0.0, profile: str = "interactive") -> Optional[str]:
        """Arranca (si hace falta) el llama-server nativo del PERFIL pedido con el GGUF
        i2_s y devuelve su base URL, o None si no hay binario/modelo. `wait_seconds` > 0
        espera a que el modelo cargue (health ok); 0 = arranque sin bloquear."""
        if profile not in ("interactive", "background"):
            profile = "interactive"
        with self._server_lock:
            st = self._servers.get(profile) or {}
            proc = st.get("proc")
            if proc is not None and proc.poll() is not None:
                st = {}
                self._servers[profile] = st
            if st.get("base") and self._alive(profile):
                return st["base"]
            binary = self.server_binary()
            status = self.check_status()
            models = status.get("models_available") or []
            if binary is None or not models:
                return None
            model_path = models[0]["path"]
            port = self._port_for(profile)
            base = f"http://127.0.0.1:{port}"
            if not st.get("proc"):
                try:
                    tmpl = self.repo_dir.parent / "bitnet-chat-template.jinja"
                    tmpl.write_text(BITNET_CHAT_TEMPLATE, encoding="utf-8")
                    cpu = os.cpu_count() or 4
                    threads = max(1, min(int(getattr(settings, "threads", 4) or 4), cpu))
                    cmd = [
                        str(binary), "-m", model_path,
                        "--host", "127.0.0.1", "--port", str(port),
                        "-t", str(threads), "-c", str(self.server_ctx),
                        "--parallel", str(self.server_parallel),
                        "--jinja", "--chat-template-file", str(tmpl),
                        # El GGUF oficial no declara pre-tokenizer: fijamos el de Llama-3.
                        "--override-kv", "tokenizer.ggml.pre=str:llama-bpe",
                    ]
                    log = open(self._server_log, "ab")
                    preexec = None
                    if profile == "background" and hasattr(os, "nice"):
                        def preexec():  # noqa: ANN202 - prioridad baja para el fondo
                            try:
                                os.nice(15)
                            except Exception:
                                pass
                    proc = subprocess.Popen(cmd, stdout=log, stderr=log, cwd=str(self.repo_dir), preexec_fn=preexec)
                    self._servers[profile] = {"proc": proc, "base": base, "model": model_path, "port": port}
                    print(f"[BitNetCppManager] llama-server nativo ({profile}) lanzado (pid {proc.pid}, puerto {port}, modelo {Path(model_path).name})")
                except Exception as e:
                    print(f"[BitNetCppManager] no se pudo lanzar llama-server ({profile}): {e}")
                    self._servers[profile] = {}
                    return None
        deadline = time.time() + max(0.0, wait_seconds)
        while time.time() < deadline:
            if self._alive(profile):
                return self._servers[profile]["base"]
            proc = (self._servers.get(profile) or {}).get("proc")
            if proc is not None and proc.poll() is not None:
                self._servers[profile] = {}
                return None
            time.sleep(1.0)
        st = self._servers.get(profile) or {}
        return st.get("base") if (wait_seconds == 0 or self._alive(profile)) else None

    def server_ready(self, profile: str = "interactive") -> bool:
        """True solo si el servidor nativo del perfil responde /health (modelo cargado)."""
        return self._alive(profile)

    def server_status(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {
            "port": self.server_port,
            "ctx": self.server_ctx,
            "parallel": self.server_parallel,
            "log": str(self._server_log),
            "profiles": {},
        }
        for profile, st in self._servers.items():
            proc = st.get("proc")
            out["profiles"][profile] = {
                "running": proc is not None and proc.poll() is None,
                "ready": self._alive(profile),
                "base_url": st.get("base"),
                "port": st.get("port"),
                "model": st.get("model"),
            }
        inter = out["profiles"].get("interactive") or {}
        out["running"] = bool(inter.get("running"))
        out["ready"] = bool(inter.get("ready"))
        out["base_url"] = inter.get("base_url")
        out["model"] = inter.get("model")
        return out

    def stop_server(self) -> None:
        for profile, st in list(self._servers.items()):
            proc = st.get("proc")
            if proc is not None and proc.poll() is None:
                try:
                    proc.terminate()
                    proc.wait(timeout=8)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
            self._servers[profile] = {}


    # ───────────── Aceleradores alternativos de cuantización (Adenda 157) ─────────────

    def quantization_backends(self) -> Dict[str, Any]:
        """
        Inventario HONESTO de motores de inferencia ternaria disponibles en ESTA
        máquina. No promete nada que no pueda ejecutar: cada entrada dice si está
        disponible y, si no, POR QUÉ.

        · bitnet.cpp (nativo)  — el que usamos: llama-server con el GGUF i2_s.
        · spbitnet (CUDA 2:4)  — kernels ternarios + sparsidad 2:4 estructurada
          para GPUs NVIDIA Ampere+ (github.com/Artemarius/spbitnet, MIT). Requiere
          CUDA 12 y compute capability ≥ 8.0: en Apple Silicon NO es aplicable.
        """
        import platform
        import shutil as _shutil

        status = self.check_status()
        machine = platform.machine().lower()
        system = platform.system()

        native = {
            "id": "bitnet.cpp",
            "nombre": "BitNet nativo (llama-server i2_s)",
            "disponible": bool(status.get("is_compiled") and status.get("models_available")),
            "activo": self.server_ready("interactive") or self.server_ready("background"),
            "cuantizacion": "i2_s ternario {-1,0,+1} · 2 bits/peso",
            "detalle": "Motor por defecto del sistema soberano; CPU (ARM NEON / x86 AVX2).",
        }

        cuda = _shutil.which("nvcc") or os.path.exists("/usr/local/cuda/bin/nvcc")
        sp_bin = None
        for rel in ("spbitnet/build/spbitnet_infer", "../spbitnet/build/spbitnet_infer"):
            p = (self.repo_dir.parent / rel)
            if p.exists():
                sp_bin = str(p)
                break
        if sp_bin is None:
            sp_bin = _shutil.which("spbitnet_infer")

        if machine in ("arm64", "aarch64") and system == "Darwin":
            sp_reason = "Apple Silicon: spbitnet necesita GPU NVIDIA Ampere+ con CUDA 12; aquí no aplica."
        elif not cuda:
            sp_reason = "No se detecta CUDA 12 (nvcc) en esta máquina."
        elif not sp_bin:
            sp_reason = "CUDA presente pero falta compilar spbitnet (binario spbitnet_infer)."
        else:
            sp_reason = ""

        spbitnet = {
            "id": "spbitnet",
            "nombre": "spbitnet (ternario + sparsidad 2:4, CUDA)",
            "disponible": bool(sp_bin and cuda and not sp_reason),
            "activo": False,
            "cuantizacion": "ternario 2 bits + 2:4 estructurada ⇒ ~1.5 bits/peso efectivos",
            "binario": sp_bin,
            "detalle": sp_reason or "Listo para usarse como acelerador en esta neurona.",
            "url": "https://github.com/Artemarius/spbitnet",
            "requisitos": "CUDA 12 · NVIDIA compute capability ≥ 8.0 · modelo convertido a formato disperso",
        }

        return {
            "activo": "bitnet.cpp" if native["activo"] else ("ninguno" if not native["disponible"] else "en frío"),
            "motores": [native, spbitnet],
            "maquina": f"{system} {machine}",
            "nota": "La cuantización de PESOS la hace el motor; la de VECTORES de memoria la hace TurboQuant (ver memoria).",
        }

    def clone_and_build(self, force: bool = False) -> Dict[str, Any]:
        """
        Clones https://github.com/microsoft/BitNet.git and compiles with Apple Silicon SIMD flags.
        """
        if self.repo_dir.exists() and not force:
            status = self.check_status()
            if status["is_compiled"]:
                return {"success": True, "message": "BitNet is already compiled and ready."}

        logs = []
        try:
            # 1. Clone repository if not present
            if not self.repo_dir.exists():
                logs.append("Cloning microsoft/BitNet...")
                res = subprocess.run(
                    ["git", "clone", "--recursive", "https://github.com/microsoft/BitNet.git", str(self.repo_dir)],
                    capture_output=True, text=True, check=True
                )
                logs.append(res.stdout)

            # 2. Prepare build directory
            self.build_dir.mkdir(parents=True, exist_ok=True)
            
            # 3. Configure CMake with native SIMD / ARM NEON flags
            cmake_cmd = [
                "cmake", "..",
                "-DCMAKE_BUILD_TYPE=Release",
                "-DCMAKE_C_COMPILER=clang",
                "-DCMAKE_CXX_COMPILER=clang++",
                '-DCMAKE_C_FLAGS=-O3 -mcpu=native -ffast-math -fvectorize',
                '-DCMAKE_CXX_FLAGS=-O3 -mcpu=native -ffast-math -fvectorize'
            ]
            logs.append(f"Running CMake: {' '.join(cmake_cmd)}")
            res = subprocess.run(cmake_cmd, cwd=str(self.build_dir), capture_output=True, text=True)
            logs.append(res.stdout)
            
            # 4. Compile using available CPU cores
            num_cores = os.cpu_count() or 4
            make_cmd = ["cmake", "--build", ".", "-j", str(num_cores)]
            logs.append(f"Compiling with {num_cores} cores...")
            res = subprocess.run(make_cmd, cwd=str(self.build_dir), capture_output=True, text=True)
            logs.append(res.stdout)

            return {
                "success": True,
                "message": "BitNet compiled successfully with SIMD acceleration.",
                "logs": logs
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "logs": logs
            }

bitnet_cpp_manager = BitNetCppManager()
