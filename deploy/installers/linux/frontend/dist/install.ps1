# ==============================================================================
# Astraura 1.58-Bit AI Engine // Windows PowerShell Sovereign Auto-Installer
# Official GitHub: https://github.com/StarSeedSystem/astraura.git
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🚀 ASTRAURA 1.58-BIT COGNITIVE ENGINE // WINDOWS AUTO-INSTALLER" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

$InstallDir = "$HOME\.astraura"
if (!(Test-Path -Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
Set-Location -Path $InstallDir

# 1. Check Python
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python 3.10+ no encontrado. Por favor instálalo desde python.org o Microsoft Store." -ForegroundColor Red
    exit 1
}

# 2. Virtual Environment
if (!(Test-Path -Path "$InstallDir\.venv")) {
    Write-Host "📦 Creando entorno virtual aislado en $InstallDir\.venv..." -ForegroundColor Yellow
    python -m venv .venv
}

$VenvPython = "$InstallDir\.venv\Scripts\python.exe"
$VenvPip = "$InstallDir\.venv\Scripts\pip.exe"

# 3. Clone or Update from GitHub
if (!(Test-Path -Path "$InstallDir\.git")) {
    Write-Host "📥 Clonando repositorio oficial de Astraura 1.58-bit..." -ForegroundColor Green
    git clone https://github.com/StarSeedSystem/astraura.git .
} else {
    Write-Host "🔄 Actualizando código soberano desde GitHub..." -ForegroundColor Green
    git fetch origin main
    git reset --hard origin/main
}

# 4. Install Dependencies
Write-Host "⚡ Instalando dependencias optimizadas de backend..." -ForegroundColor Yellow
& $VenvPip install --upgrade pip setuptools wheel | Out-Null
& $VenvPip install -r backend\requirements.txt

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "✅ Astraura 1.58-Bit instalado exitosamente en Windows." -ForegroundColor Green
Write-Host "🚀 Iniciando Astraura Engine en http://127.0.0.1:8000..." -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

Start-Process "http://127.0.0.1:8000"
& $VenvPython backend\run_backend.py
