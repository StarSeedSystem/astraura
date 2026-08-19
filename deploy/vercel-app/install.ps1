# Astraura 1.58-Bit AI Engine // Windows PowerShell Auto-Installer
# https://astraura.vercel.app

Write-Host "🚀 Iniciando Instalación Automática de Astraura 1.58-Bit AI Engine..." -ForegroundColor Cyan

$InstallDir = "$HOME\.astraura"
if (!(Test-Path -Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir | Out-Null
}
Set-Location $InstallDir

if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python no encontrado en el sistema. Por favor instala Python 3.10+." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Configurando entorno virtual..." -ForegroundColor Yellow
python -m venv .venv
& "$InstallDir\.venv\Scripts\Activate.ps1"
python -m pip install --upgrade pip --quiet
python -m pip install fastapi uvicorn httpx numpy pydantic psutil beautifulsoup4 playwright websockets --quiet

Write-Host "✅ Instalación completada con éxito!" -ForegroundColor Green
Write-Host "🚀 Para iniciar: cd $InstallDir; .\.venv\Scripts\Activate.ps1; python -m uvicorn backend.app.main:app --port 8000" -ForegroundColor Cyan
