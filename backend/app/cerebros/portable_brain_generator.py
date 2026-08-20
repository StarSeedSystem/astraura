"""
Universal Portable Brain Capsule & Self-Mounting App Generator
Exports and synchronizes any StarSeed Brain and its memories to any storage drive (USB, SSD, SD, Network, Cloud)
packaging a cross-platform self-installing and auto-launching universal application.
"""

import os
import sys
import json
import shutil
import zipfile
import time
from pathlib import Path
from typing import Dict, List, Any, Optional

from app.tools.storage_adapters import universal_storage_manager

class PortableBrainGenerator:
    """
    Generador de Cápsulas Cerebrales Portables Universales.
    Sincroniza cerebros 1.58-bit en cualquier medio de almacenamiento y crea una app
    autoinstalable y autoejecutable para macOS, Windows, Linux y Android.
    """
    def __init__(self):
        self.workspace_root = Path(os.getcwd())

    def sync_brain_to_storage_drive(
        self,
        brain_id: str,
        target_drive_path: str,
        include_projects: bool = True,
        include_voice_studio: bool = True,
        include_all_brains: bool = True
    ) -> Dict[str, Any]:
        """
        Sincroniza el cerebro con todas sus memorias y empaqueta la app universal en la unidad de almacenamiento.
        """
        target_dir = Path(target_drive_path)
        if not target_dir.exists():
            try:
                target_dir.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                return {"success": False, "error": f"No se pudo acceder o crear la ruta de destino: {str(e)}"}

        app_root = target_dir / "Astraura_Portable_App"
        app_root.mkdir(parents=True, exist_ok=True)
        vault_root = app_root / "Astraura_Portable_Brain"
        vault_root.mkdir(parents=True, exist_ok=True)

        try:
            # 1. Export Brain Manifest
            manifest = {
                "brain_id": brain_id,
                "exported_at": time.time(),
                "generator_version": "1.5.8-Sovereign-Enterprise",
                "bitnet_version": "BitNet b1.58 Ternary {-1, 0, 1} ARM NEON SIMD",
                "personalities": ["Génesis", "Hephaestus", "Hermes", "Atenea", "Oneiros", "Mnemosyne"],
                "permissions": "bidirectional_merge",
                "auto_mount_on_boot": True
            }
            with open(vault_root / "cerebro_manifest.json", "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)

            # 2. Copy StarSeed Memory Root
            src_mem = Path("backend/data/starseed_memory_root")
            if not src_mem.exists():
                src_mem = Path("data/starseed_memory_root")
            if src_mem.exists():
                dest_mem = vault_root / "starseed_memory_root"
                dest_mem.mkdir(parents=True, exist_ok=True)
                for item in src_mem.glob("*.json"):
                    shutil.copy2(item, dest_mem / item.name)

            # 3. Copy Knowledge Graph & Vectors
            for g_dir in ["knowledge_graph", "vector_store", "mem0"]:
                src_p = Path("data") / g_dir
                if src_p.exists():
                    dest_p = vault_root / g_dir
                    dest_p.mkdir(parents=True, exist_ok=True)
                    for item in src_p.glob("*.json"):
                        shutil.copy2(item, dest_p / item.name)

            # 4. Copy Voice Studio Acoustic Memories if requested
            if include_voice_studio:
                src_voice = Path("data/voice_studio")
                if src_voice.exists():
                    dest_voice = vault_root / "voice_studio"
                    shutil.copytree(src_voice, dest_voice, dirs_exist_ok=True)

            # 5. Copy Projects Vault if requested
            if include_projects:
                src_proj = Path("backend/vault/projects")
                if src_proj.exists():
                    dest_proj = vault_root / "projects"
                    shutil.copytree(src_proj, dest_proj, dirs_exist_ok=True)

            # 6. Copy Storage Routing Rules
            src_routing = Path("data/storage_routing")
            if src_routing.exists():
                dest_routing = vault_root / "storage_routing"
                shutil.copytree(src_routing, dest_routing, dirs_exist_ok=True)

            # 7. Generate Universal Cross-Platform Launchers inside the Storage
            self._generate_universal_launchers(app_root, vault_root)

            return {
                "success": True,
                "message": f"Cerebro '{brain_id}' sincronizado exitosamente en {target_drive_path}.",
                "installed_path": str(app_root.resolve()),
                "vault_path": str(vault_root.resolve()),
                "launchers_created": [
                    "Astraura_Portable_Launcher.command (macOS)",
                    "Astraura_Portable_Launcher.bat (Windows)",
                    "Astraura_Portable_Launcher.ps1 (Windows PowerShell)",
                    "Astraura_Portable_Launcher.sh (Linux)",
                    "Astraura_Android_Setup.sh (Android Termux)",
                    "Astraura_Universal_Offline_Web.html (Web Standalone)"
                ]
            }

        except Exception as e:
            return {"success": False, "error": f"Fallo al sincronizar cerebro a almacenamiento: {str(e)}"}

    def _generate_universal_launchers(self, app_root: Path, vault_root: Path):
        """
        Genera los scripts lanzadores universales inteligentes que detectan el sistema anfitrión.
        """
        # A. macOS Launcher (.command)
        macos_script = app_root / "Astraura_Portable_Launcher.command"
        macos_content = """#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit // Lanzador Universal Portable para macOS (Apple Silicon & Intel)
# ==============================================================================
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "========================================================================"
echo "🧠 ASTRAURA 1.58-BIT // INICIANDO CEREBRO PORTABLE EN MACOS"
echo "========================================================================"

# Auto-instalar motor base si no existe localmente
if [ ! -d "$HOME/.astraura" ]; then
    echo "📦 Desplegando motor soberano en este dispositivo..."
    bash -c "$(curl -fsSL https://raw.githubusercontent.com/StarSeedSystem/astraura/main/deploy/vercel-app/install.sh)"
fi

# Montar y sincronizar memorias de este cerebro portable en el motor anfitrión
echo "🌌 Montando memorias del cerebro portable en el motor local..."
if [ -d "$DIR/Astraura_Portable_Brain/starseed_memory_root" ]; then
    mkdir -p "$HOME/.astraura/backend/data/starseed_memory_root"
    cp -r "$DIR/Astraura_Portable_Brain/starseed_memory_root/"* "$HOME/.astraura/backend/data/starseed_memory_root/" 2>/dev/null || true
fi
if [ -d "$DIR/Astraura_Portable_Brain/voice_studio" ]; then
    mkdir -p "$HOME/.astraura/data/voice_studio"
    cp -r "$DIR/Astraura_Portable_Brain/voice_studio/"* "$HOME/.astraura/data/voice_studio/" 2>/dev/null || true
fi

cd "$HOME/.astraura"
source .venv/bin/activate
(sleep 1.5 && open "http://127.0.0.1:8000") &
python3 backend/run_backend.py
"""
        with open(macos_script, "w", encoding="utf-8") as f:
            f.write(macos_content)
        try:
            os.chmod(macos_script, 0o755)
        except Exception:
            pass

        # B. Windows Launcher (.bat & .ps1)
        win_bat = app_root / "Astraura_Portable_Launcher.bat"
        win_bat_content = """@echo off
TITLE Astraura 1.58-Bit Portable Brain
COLOR 0B

echo ========================================================================
echo 🧠 ASTRAURA 1.58-BIT // INICIANDO CEREBRO PORTABLE EN WINDOWS
echo ========================================================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Astraura_Portable_Launcher.ps1"
pause
"""
        with open(win_bat, "w", encoding="utf-8") as f:
            f.write(win_bat_content)

        win_ps1 = app_root / "Astraura_Portable_Launcher.ps1"
        win_ps1_content = """# Astraura 1.58-Bit Universal Portable Launcher for Windows
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetDir = "$env:LOCALAPPDATA\\Astraura"

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🧠 ASTRAURA 1.58-BIT // MONTANDO CEREBRO PORTABLE EN WINDOWS" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

if (-not (Test-Path "$TargetDir\\.venv")) {
    Write-Host "📦 Configurando entorno soberano en este equipo..." -ForegroundColor Yellow
    irm https://raw.githubusercontent.com/StarSeedSystem/astraura/main/deploy/vercel-app/install.ps1 | iex
}

# Sync portable brain memories
Write-Host "🌌 Sincronizando memorias del cerebro portable..." -ForegroundColor Green
$SrcMem = "$ScriptDir\\Astraura_Portable_Brain\\starseed_memory_root"
$DestMem = "$TargetDir\\backend\\data\\starseed_memory_root"
if (Test-Path $SrcMem) {
    New-Item -ItemType Directory -Path $DestMem -Force | Out-Null
    Copy-Item -Path "$SrcMem\\*" -Destination $DestMem -Recurse -Force
}

Set-Location -Path $TargetDir
Start-Process "http://127.0.0.1:8000"
& "$TargetDir\\.venv\\Scripts\\python.exe" backend\\run_backend.py
"""
        with open(win_ps1, "w", encoding="utf-8") as f:
            f.write(win_ps1_content)

        # C. Linux Launcher (.sh)
        linux_script = app_root / "Astraura_Portable_Launcher.sh"
        linux_content = """#!/usr/bin/env bash
# ==============================================================================
# Astraura 1.58-Bit // Lanzador Universal Portable para Linux
# ==============================================================================
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "========================================================================"
echo "🧠 ASTRAURA 1.58-BIT // INICIANDO CEREBRO PORTABLE EN GNU/LINUX"
echo "========================================================================"

if [ ! -d "$HOME/.astraura" ]; then
    echo "📦 Instalando motor soberano..."
    curl -fsSL https://raw.githubusercontent.com/StarSeedSystem/astraura/main/deploy/vercel-app/install.sh | bash
fi

# Sync memories
if [ -d "$DIR/Astraura_Portable_Brain/starseed_memory_root" ]; then
    mkdir -p "$HOME/.astraura/backend/data/starseed_memory_root"
    cp -r "$DIR/Astraura_Portable_Brain/starseed_memory_root/"* "$HOME/.astraura/backend/data/starseed_memory_root/" 2>/dev/null || true
fi

cd "$HOME/.astraura"
source .venv/bin/activate
(sleep 1.5 && (xdg-open "http://127.0.0.1:8000" 2>/dev/null || sensible-browser "http://127.0.0.1:8000" 2>/dev/null)) &
python3 backend/run_backend.py
"""
        with open(linux_script, "w", encoding="utf-8") as f:
            f.write(linux_content)
        try:
            os.chmod(linux_script, 0o755)
        except Exception:
            pass

        # D. Android Termux Launcher
        android_script = app_root / "Astraura_Android_Setup.sh"
        android_content = """#!/data/data/com.termux/files/usr/bin/bash
echo "📱 Configurando Cerebro Portable en Android Termux..."
termux-setup-storage
curl -fsSL https://raw.githubusercontent.com/StarSeedSystem/astraura/main/deploy/installers/mobile/install_termux.sh | bash
"""
        with open(android_script, "w", encoding="utf-8") as f:
            f.write(android_content)
        try:
            os.chmod(android_script, 0o755)
        except Exception:
            pass

        # E. Standalone Offline Web App Bootstrapper
        web_bootstrapper = app_root / "Astraura_Universal_Offline_Web.html"
        web_content = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Astraura 1.58-Bit // Cápsula Cerebral Portable</title>
    <style>
        body { background: #07090e; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #0f172a; border: 1px solid #06b6d4; padding: 2rem; border-radius: 1rem; max-width: 500px; text-align: center; box-shadow: 0 10px 25px -5px rgba(6,182,212,0.3); }
        h1 { color: #38bdf8; margin-top: 0; }
        .btn { display: inline-block; background: #06b6d4; color: #000; font-weight: bold; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; margin-top: 1rem; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🧠 Cerebro Portable StarSeed OS (1.58-Bit)</h1>
        <p>Esta unidad de almacenamiento contiene un cerebro soberano autoejecutable.</p>
        <p>Para abrir en este dispositivo, haz doble clic en:</p>
        <ul style="text-align: left; background: #1e293b; padding: 1rem; border-radius: 0.5rem;">
            <li>🍎 <b>macOS:</b> <code>Astraura_Portable_Launcher.command</code></li>
            <li>🪟 <b>Windows:</b> <code>Astraura_Portable_Launcher.bat</code></li>
            <li>🐧 <b>Linux:</b> <code>Astraura_Portable_Launcher.sh</code></li>
        </ul>
        <a class="btn" href="https://astraura.vercel.app" target="_blank">Abrir en Línea (Vercel)</a>
    </div>
</body>
</html>
"""
        with open(web_bootstrapper, "w", encoding="utf-8") as f:
            f.write(web_content)

        # F. User Guide
        guide_file = app_root / "LEEME_INSTRUCCIONES_UNIVERSALES.txt"
        guide_content = """==============================================================================
🧠 ASTRAURA 1.58-BIT // CÁPSULA CEREBRAL PORTABLE & AUTO-EJECUTABLE
StarSeed OS // Repositorio Oficial: https://github.com/StarSeedSystem/astraura
==============================================================================

¡Has sincronizado exitosamente este Cerebro Soberano de StarSeed OS!

CÓMO ABRIR EN CUALQUIER DISPOSITIVO:
1. En macOS (Apple Silicon M1/M2/M3/M4 o Intel):
   - Haz doble clic en "Astraura_Portable_Launcher.command".
2. En Windows (10/11):
   - Haz doble clic en "Astraura_Portable_Launcher.bat".
3. En GNU/Linux (Ubuntu, Fedora, Arch, SteamDeck):
   - Ejecuta "bash Astraura_Portable_Launcher.sh".
4. En Android (Termux):
   - Ejecuta "bash Astraura_Android_Setup.sh".

El lanzador detectará automáticamente el hardware anfitrión, configurará
las dependencias necesarias, montará todas las memorias y abrirá la interfaz
en tiempo real en http://127.0.0.1:8000.
==============================================================================
"""
        with open(guide_file, "w", encoding="utf-8") as f:
            f.write(guide_content)

portable_brain_generator = PortableBrainGenerator()
