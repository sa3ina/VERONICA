$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $root 'frontend'
$backendDir = Join-Path $root 'backend'
$mlApiDir = Join-Path $root 'ml_model\frontend'

Write-Host 'Starting AZCON stack...' -ForegroundColor Cyan

Start-Process powershell -WorkingDirectory $backendDir -ArgumentList @(
  '-NoExit',
  '-Command',
  "npm run dev"
)

Start-Process powershell -WorkingDirectory $frontendDir -ArgumentList @(
  '-NoExit',
  '-Command',
  "npm run dev"
)

Start-Process powershell -WorkingDirectory $mlApiDir -ArgumentList @(
  '-NoExit',
  '-Command',
  "python api.py"
)

Write-Host 'Launched:' -ForegroundColor Green
Write-Host ' - Backend:  http://localhost:4000' -ForegroundColor Green
Write-Host ' - Frontend: http://localhost:3000' -ForegroundColor Green
Write-Host ' - ML API:   http://127.0.0.1:5000/status' -ForegroundColor Green
Write-Host ''
Write-Host 'If PowerShell blocks script execution, run once:' -ForegroundColor Yellow
Write-Host "Set-ExecutionPolicy -Scope CurrentUser RemoteSigned" -ForegroundColor Yellow
