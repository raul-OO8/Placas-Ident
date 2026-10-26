# Actualizar_Release_GitHub.ps1
$ErrorActionPreference = "Stop"

$inputStr = "protocol=https`nhost=github.com`n`n"
$output = $inputStr | git credential fill
$token = ""
foreach ($line in ($output -split "`n")) {
    if ($line -match "^password=(.+)$") {
        $token = $matches[1].Trim()
    }
}

if (-not $token) {
    throw "No se pudo obtener el token de autenticacion de GitHub."
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
    "User-Agent" = "Placas-xTool-Deployer"
}

$tag = "v1.2.1"
$relName = "Placas xTool v1.2.1 - Firma Digital y Bypass SmartScreen"
$relNotes = @"
Novedades de la versión 1.2.1:
- Firma digital oficial Authenticode (Zybra & Vorma Maschinen GmbH) con sellado de tiempo DigiCert SHA-256.
- Paquete ZIP limpio con lanzador automático sin advertencias de seguridad de Windows.
- Optimización y verificación del sistema de actualización en 1 clic.
"@

# 1. Comprobar si existe la release v1.2.1, sino crearla
$rel = $null
try {
    $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/raul-OO8/Placas-Ident/releases/tags/$tag" -Headers $headers
    Write-Host "Release $tag ya existente encontrada (ID: $($rel.id))" -ForegroundColor Green
} catch {
    Write-Host "Creando release $tag en GitHub..." -ForegroundColor Cyan
    $createBody = @{
        tag_name = $tag
        name = $relName
        body = $relNotes
        draft = $false
        prerelease = $false
    } | ConvertTo-Json
    $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/raul-OO8/Placas-Ident/releases" -Method Post -Headers $headers -Body $createBody
    Write-Host "Release $tag creada con exito (ID: $($rel.id))" -ForegroundColor Green
}

# 2. Eliminar assets viejos si existen
if ($rel.assets) {
    foreach ($asset in $rel.assets) {
        Write-Host "Eliminando asset antiguo: $($asset.name) (ID: $($asset.id))..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "https://api.github.com/repos/raul-OO8/Placas-Ident/releases/assets/$($asset.id)" -Method Delete -Headers $headers
    }
}

# 3. Subir nuevo Instalador_Placas_xTool_Setup.exe firmado
Write-Host "Subiendo Instalador_Placas_xTool_Setup.exe (Firmado)..." -ForegroundColor Cyan
$exePath = Resolve-Path "Instalador_Placas_xTool_Setup.exe"
$exeBytes = [System.IO.File]::ReadAllBytes($exePath.Path)
$uploadUrlExe = "https://uploads.github.com/repos/raul-OO8/Placas-Ident/releases/$($rel.id)/assets?name=Instalador_Placas_xTool_Setup.exe"
$uploadHeaders = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/octet-stream"
    "User-Agent" = "Placas-xTool-Deployer"
}
$upResExe = Invoke-RestMethod -Uri $uploadUrlExe -Method Post -Headers $uploadHeaders -Body $exeBytes
Write-Host "  [OK] EXE subido: $($upResExe.browser_download_url)" -ForegroundColor Green

# 4. Subir Placas_xTool_Instalador.zip
Write-Host "Subiendo Placas_xTool_Instalador.zip..." -ForegroundColor Cyan
$zipPath = Resolve-Path "Placas_xTool_Instalador.zip"
$zipBytes = [System.IO.File]::ReadAllBytes($zipPath.Path)
$uploadUrlZip = "https://uploads.github.com/repos/raul-OO8/Placas-Ident/releases/$($rel.id)/assets?name=Placas_xTool_Instalador.zip"
$upResZip = Invoke-RestMethod -Uri $uploadUrlZip -Method Post -Headers $uploadHeaders -Body $zipBytes
Write-Host "  [OK] ZIP subido: $($upResZip.browser_download_url)" -ForegroundColor Green

Write-Host "Release $tag y todos sus activos fueron publicados con exito." -ForegroundColor Green
