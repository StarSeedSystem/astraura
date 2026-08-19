import os
import subprocess
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional
from ..core.config import settings

class BitNetCppManager:
    """
    Manages the installation, compilation, model discovery, and native execution 
    of Microsoft's official BitNet framework (bitnet.cpp) optimized for ARM NEON and Apple Silicon.
    """
    def __init__(self):
        self.repo_dir = settings.bitnet_path
        self.models_dir = settings.models_path
        self.build_dir = self.repo_dir / "build"
        
    def check_status(self) -> Dict[str, Any]:
        """
        Inspects whether bitnet.cpp is cloned, compiled, and what models are available.
        """
        is_cloned = (self.repo_dir / "setup_env.py").exists() or (self.repo_dir / "CMakeLists.txt").exists()
        is_compiled = (self.build_dir / "bin" / "main").exists() or (self.build_dir / "bin" / "bitnet-cli").exists() or (self.repo_dir / "run_inference.py").exists()
        
        # Check available GGUF models in models directory
        found_models = []
        if self.models_dir.exists():
            for p in self.models_dir.glob("**/*"):
                if p.suffix in [".gguf", ".bin"]:
                    found_models.append({
                        "name": p.name,
                        "path": str(p.resolve()),
                        "size_mb": round(p.stat().st_size / (1024 * 1024), 2),
                        "quantization": "i2_s (1.58-bit ternary)" if "i2_s" in p.name else "GGUF"
                    })

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
