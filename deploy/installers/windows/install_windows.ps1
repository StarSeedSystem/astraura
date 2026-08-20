<#
.SYNOPSIS
    Astraura 1.58-Bit AI Engine - Windows Enterprise Sovereign Installer
    Configures Full Administrator Permissions, Long Paths, Firewall, and Multi-Drive Storage Access.
#>

# 1. Require Administrator Elevation
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "🛡️ Elevando permisos a Administrador para acceso total al sistema y discos..." -ForegroundColor Yellow
    Start-Process powershell.exe -Verb RunAs -ArgumentList ("-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"")
    exit
}

$ErrorActionPreference = "Stop"

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🪟 ASTRAURA 1.58-BIT // INSTALADOR NATIVO PARA WINDOWS 10 / 11" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

# 2. Enable Win32 Long Paths in Registry (Allows paths > 260 chars for deep vaults)
Write-Host "📂 Habilitando soporte de Rutas Largas (Win32 Long Paths > 260 chars)..." -ForegroundColor Yellow
try {
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -Force
    Write-Host "  ✅ Rutas largas habilitadas." -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ No se pudo modificar el registro de rutas largas: $_" -ForegroundColor DarkYellow
}

# 3. Configure Windows Defender Firewall Rule for Port 8000
Write-Host "🛡️ Configurando regla de Firewall para puerto cognitivo 8000..." -ForegroundColor Yellow
try {
    $existingRule = Get-NetFirewallRule -DisplayName "Astraura 1.58-Bit Cognitive Engine" -ErrorAction SilentlyContinue
    if (-not $existingRule) {
        New-NetFirewallRule -DisplayName "Astraura 1.58-Bit Cognitive Engine" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow | Out-Null
    }
    Write-Host "  ✅ Regla de Firewall TCP 8000 activa." -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ Omisión de firewall o no aplicable: $_" -ForegroundColor DarkYellow
}

# 4. Create App Directory
$InstallDir = "$env:LOCALAPPDATA\Astraura"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
Set-Location -Path $InstallDir

# 5. Clone or Sync Repo
Write-Host "📦 Configurando archivos de Astraura en $InstallDir..." -ForegroundColor Yellow
if (-not (Test-Path "$InstallDir\.git")) {
    git clone https://github.com/StarSeedSystem/astraura.git .
} else {
    git fetch origin main
    git reset --hard origin/main
}

# 6. Python Environment
Write-Host "🐍 Verificando entorno de ejecución Python 3..." -ForegroundColor Yellow
if (-not (Test-Path "$InstallDir\.venv")) {
    python -m venv .venv
}

$VenvPython = "$InstallDir\.venv\Scripts\python.exe"
$VenvPip = "$InstallDir\.venv\Scripts\pip.exe"

& $VenvPip install --upgrade pip setuptools wheel | Out-Null
& $VenvPip install -r backend\requirements.txt

# 7. Create Desktop Shortcut & Start Menu Item
$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\Astraura 1.58-Bit.lnk")
$Shortcut.TargetPath = "$InstallDir\deploy\installers\windows\install_windows.bat"
$Shortcut.WorkingDirectory = "$InstallDir"
$Shortcut.Description = "Astraura 1.58-Bit Cognitive AI Engine"
$Shortcut.Save()

Write-Host "✅ Acceso directo creado en el Escritorio: $DesktopPath\Astraura 1.58-Bit.lnk" -ForegroundColor Green

# 8. Launch System
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🚀 Iniciando Astraura 1.58-Bit Engine en http://127.0.0.1:8000..." -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

Start-Process "http://127.0.0.1:8000"
& $VenvPython backend\run_backend.py
