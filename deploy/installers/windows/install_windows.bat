@echo off
TITLE Astraura 1.58-Bit Cognitive Engine
COLOR 0B

echo ========================================================================
echo 🚀 ASTRAURA 1.58-BIT // INICIANDO SISTEMA EN WINDOWS
echo ========================================================================

cd /d "%~dp0\..\..\.."
if exist .venv\Scripts\python.exe (
    start "" http://127.0.0.1:8000
    .venv\Scripts\python.exe backend\run_backend.py
) else (
    echo [!] No se encontro el entorno .venv. Ejecutando instalador PowerShell...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0\install_windows.ps1"
)
pause
