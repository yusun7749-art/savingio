$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$nested = Join-Path $root 'savingio-live'

$required = @('factory','articles','calculators','css','js')
$missing = @($required | Where-Object { -not (Test-Path (Join-Path $root $_)) })
if ($missing.Count -gt 0) {
    Write-Host ('FAIL: run this file inside the real savingio-live folder. Missing: ' + ($missing -join ', ')) -ForegroundColor Red
    exit 1
}

if (Test-Path $nested) {
    Remove-Item -LiteralPath $nested -Recurse -Force
    Write-Host 'Removed duplicated savingio-live/savingio-live folder.' -ForegroundColor Green
}

$junk = @(
    'factory/PATCH002_MANIFEST.json',
    'factory/output/factory_build_state.json',
    'factory/output/factory_progress.json'
)
foreach ($rel in $junk) {
    $path = Join-Path $root $rel
    if (Test-Path $path) { Remove-Item -LiteralPath $path -Force }
}

if (Test-Path (Join-Path $root 'savingio-live')) {
    Write-Host 'FAIL: duplicated folder still exists.' -ForegroundColor Red
    exit 2
}

Write-Host 'PASS: Savingio house restored to one root with factory inside it.' -ForegroundColor Green
Read-Host 'Press Enter to close'
