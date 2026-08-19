import subprocess
import os
from pathlib import Path
from typing import Dict, Any, Optional

class TerminalTool:
    """
    Real execution tool for local terminal commands on the host machine.
    Enables Astraura to run diagnostic probes, inspect system status, 
    compile modules, and perform file operations with full device access.
    """
    def __init__(self, default_cwd: Optional[str] = None):
        self.default_cwd = default_cwd or str(Path.home())

    def execute_command(self, command: str, cwd: Optional[str] = None, timeout_secs: int = 30) -> Dict[str, Any]:
        target_cwd = cwd if cwd and os.path.exists(cwd) else self.default_cwd
        
        try:
            # Run via zsh or bash
            proc = subprocess.run(
                command,
                shell=True,
                cwd=target_cwd,
                capture_output=True,
                text=True,
                timeout=timeout_secs,
                executable="/bin/zsh" if os.path.exists("/bin/zsh") else "/bin/bash"
            )

            stdout = proc.stdout.strip()
            stderr = proc.stderr.strip()
            
            return {
                "success": proc.returncode == 0,
                "command": command,
                "cwd": target_cwd,
                "return_code": proc.returncode,
                "stdout": stdout,
                "stderr": stderr,
                "output": stdout if stdout else stderr
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "command": command,
                "cwd": target_cwd,
                "return_code": -1,
                "stdout": "",
                "stderr": f"Error: Comando superó el tiempo límite de {timeout_secs} segundos",
                "output": "Timeout"
            }
        except Exception as e:
            return {
                "success": False,
                "command": command,
                "cwd": target_cwd,
                "return_code": -1,
                "stdout": "",
                "stderr": str(e),
                "output": str(e)
            }

terminal_tool = TerminalTool()
