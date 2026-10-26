# Compilar_Instalador.ps1
# Genera el instalador oficial de Windows (Instalador_Placas_xTool_Setup.exe)
# empaquetando la aplicación completa con su motor autónomo node.exe y desinstalador.

$ErrorActionPreference = "Stop";
$ROOT = $PSScriptRoot;
if (-not $ROOT) { $ROOT = (Get-Location).Path };
Set-Location $ROOT;

$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe";
if (-not (Test-Path $csc)) {
    throw "No se encontró el compilador csc.exe en: $csc";
}

Add-Type -AssemblyName System.IO.Compression.FileSystem;

Write-Host "==========================================================" -ForegroundColor Cyan;
Write-Host "  COMPILANDO INSTALADOR OFICIAL — PLACAS XTOOL SETUP" -ForegroundColor Cyan;
Write-Host "==========================================================" -ForegroundColor Cyan;

# 1. Compilar Desinstalar.exe
Write-Host "1. Compilando Desinstalar.exe..." -ForegroundColor Yellow;
& $csc /target:winexe /out:"Desinstalar.exe" /win32icon:"Placas_xTool_Icon_v6.ico" /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll "src_installer\UninstallProgram.cs";

# 2. Compilar ejecutable principal
Write-Host "2. Compilando Generador_Placas_xTool.exe..." -ForegroundColor Yellow;
& $csc /target:winexe /out:"Generador_Placas_xTool.exe" /win32icon:"Placas_xTool_Icon_v6.ico" /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll "src_launcher\Program.cs";

# 3. Preparar stage
Write-Host "3. Empaquetando archivos del programa en el payload..." -ForegroundColor Yellow;
$stage = Join-Path $ROOT "build_stage";
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force };
New-Item -ItemType Directory -Path $stage | Out-Null;

$filesToCopy = @(
    "Generador_Placas_xTool.exe", "Desinstalar.exe", "server.js",
    "index.html", "installer.html", "version.json", "README.md",
    "app-icon.svg", "app-icon.ico", "Placas_xTool_Icon_v6.ico"
);
foreach ($f in $filesToCopy) {
    if (Test-Path (Join-Path $ROOT $f)) {
        Copy-Item (Join-Path $ROOT $f) $stage;
    }
}
Get-ChildItem -Path $ROOT -Filter "icon_*.png" | Copy-Item -Destination $stage;

# Copiar carpetas
foreach ($dir in @("css", "js", "fonts", "img")) {
    $srcDir = Join-Path $ROOT $dir;
    if (Test-Path $srcDir) {
        Copy-Item $srcDir $stage -Recurse;
    }
}

New-Item -ItemType Directory -Path (Join-Path $stage "data") | Out-Null;
if (Test-Path (Join-Path $ROOT "data\maquinas.json")) {
    Copy-Item (Join-Path $ROOT "data\maquinas.json") (Join-Path $stage "data");
}

New-Item -ItemType Directory -Path (Join-Path $stage "Exportados_xTool\Vorma") | Out-Null;
New-Item -ItemType Directory -Path (Join-Path $stage "Exportados_xTool\Olsen & Kael") | Out-Null;
New-Item -ItemType Directory -Path (Join-Path $stage "Exportados_xTool\Zybra") | Out-Null;

# Incluir node.exe autónomo
$nodePath = "C:\Program Files\nodejs\node.exe";
if (Test-Path $nodePath) {
    Copy-Item $nodePath (Join-Path $stage "node.exe");
}

$zipPath = Join-Path $ROOT "app_payload.zip";
if (Test-Path $zipPath) { Remove-Item $zipPath -Force };
[System.IO.Compression.ZipFile]::CreateFromDirectory((Resolve-Path $stage).Path, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false);
Remove-Item $stage -Recurse -Force;

# 4. Compilar SetupProgram.cs con el payload embebido
Write-Host "4. Compilando Instalador_Placas_xTool_Setup.exe..." -ForegroundColor Yellow;
$setupExe = Join-Path $ROOT "Instalador_Placas_xTool_Setup.exe";
& $csc /target:winexe /out:"$setupExe" /win32icon:"Placas_xTool_Icon_v6.ico" /resource:"$zipPath",AppPayload.zip /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll "src_installer\SetupProgram.cs";

Remove-Item $zipPath -Force -ErrorAction SilentlyContinue;

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green;
Write-Host " [OK] Instalador generado con éxito:" -ForegroundColor Green;
Write-Host "      $setupExe ($([math]::Round((Get-Item $setupExe).Length / 1MB, 2)) MB)" -ForegroundColor White;
Write-Host "==========================================================" -ForegroundColor Green;
