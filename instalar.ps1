# instalar.ps1
# Script de instalacion directa de 1 clic para Windows
# Descarga, desbloquea la marca de internet (Zone.Identifier) y abre el instalador oficial.

$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Instalador Oficial - Generador de Placas xTool" -ForegroundColor Cyan
Write-Host "   Zybra & Vorma Maschinen GmbH" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Descargando instalador oficial desde GitHub..." -ForegroundColor Yellow

$url = "https://github.com/raul-OO8/Placas-Ident/releases/latest/download/Instalador_Placas_xTool_Setup.exe"
$dest = Join-Path $env:TEMP "Instalador_Placas_xTool_Setup.exe"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing

Write-Host "2. Desbloqueando permisos de Windows (sin advertencias)..." -ForegroundColor Yellow
Unblock-File -Path $dest -ErrorAction SilentlyContinue

Write-Host "3. Abriendo instalador visual..." -ForegroundColor Green
Start-Process -FilePath $dest
Write-Host ""
Write-Host "[OK] Instalador en ejecucion." -ForegroundColor Green
