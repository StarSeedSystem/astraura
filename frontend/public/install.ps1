# ==============================================================================
# Astraura 1.58-Bit AI Engine // Windows PowerShell Auto-Installer & Smart Updater
# Official GitHub: https://github.com/StarSeedSystem/astraura.git
# ==============================================================================

Write-Host "🚀 Iniciando Instalador Inteligente de Astraura 1.58-Bit (Windows)..." -ForegroundColor Cyan

$InstallDir = "$HOME\.astraura"
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir | Out-Null
}
Set-Location $InstallDir

# 1. Virtual Environment
if (!(Test-Path "$InstallDir\.venv")) {
    Write-Host "📦 Configurando entorno virtual Python..." -ForegroundColor Green
    python -m venv .venv
}

& "$InstallDir\.venv\Scripts\Activate.ps1"
pip install --upgrade pip

# 2. Clone or Update
if (!(Test-Path "$InstallDir\.git")) {
    Write-Host "📥 Clonando repositorio oficial de Astraura..." -ForegroundColor Green
    git clone https://github.com/StarSeedSystem/astraura.git .
} else {
    Write-Host "🔄 Comprobando e instalando actualizaciones automáticas desde GitHub..." -ForegroundColor Cyan
    git pull origin main --rebase
}

# 3. Install Dependencies
Write-Host "⚡ Instalando dependencias de aceleración ternaria..." -ForegroundColor Green
pip install fastapi uvicorn httpx numpy pydantic psutil beautifulsoup4

Write-Host "✅ Astraura 1.58-Bit instalado y listo." -ForegroundColor Green
Write-Host "🚀 Iniciando Backend..." -ForegroundColor Cyan
python backend/run_backend.py
