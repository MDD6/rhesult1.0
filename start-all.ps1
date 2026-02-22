$ErrorActionPreference = "Stop"

Write-Host "== RHesult Local Start (DB + Backend + Frontend) ==" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $rootDir "rhesult-backend"
$webDir = Join-Path $rootDir "rhesult-web"

if (-not (Test-Path $backendDir)) {
  throw "Diretório do backend não encontrado: $backendDir"
}

if (-not (Test-Path $webDir)) {
  throw "Diretório do frontend não encontrado: $webDir"
}

Write-Host "1) Subindo banco + backend..." -ForegroundColor Yellow
Set-Location $backendDir
npm.cmd run start:complete

Write-Host "2) Verificando frontend na porta 3000..." -ForegroundColor Yellow
$frontendPortOpen = $false
try {
  $frontendPortOpen = (Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue).TcpTestSucceeded
} catch {
  $frontendPortOpen = $false
}

if (-not $frontendPortOpen) {
  Write-Host "Iniciando frontend (npm run dev)..." -ForegroundColor Yellow
  Set-Location $webDir
  Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $webDir -WindowStyle Hidden | Out-Null
  Start-Sleep -Seconds 3
} else {
  Write-Host "Frontend já estava em execução na porta 3000." -ForegroundColor Yellow
}

Write-Host "3) Validando serviços..." -ForegroundColor Yellow
$backendHealth = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 8
$frontendStatusCode = (Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 12).StatusCode

$localIp = (
  Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike '127.*' -and
    $_.IPAddress -notlike '169.254.*' -and
    $_.PrefixOrigin -ne 'WellKnown'
  } |
  Select-Object -First 1 -ExpandProperty IPAddress
)

Write-Host "" 
Write-Host "✅ Backend health: $($backendHealth.status)" -ForegroundColor Green
Write-Host "✅ Frontend HTTP: $frontendStatusCode" -ForegroundColor Green
Write-Host "" 
Write-Host "Acesso local:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "- Backend:  http://localhost:4000/health" -ForegroundColor White

if ($localIp) {
  Write-Host "" 
  Write-Host "Acesso na rede local:" -ForegroundColor Cyan
  Write-Host "- Frontend: http://$localIp`:3000" -ForegroundColor White
  Write-Host "- Backend:  http://$localIp`:4000/health" -ForegroundColor White
}

Write-Host "" 
Write-Host "Pronto. Ambiente local ativo." -ForegroundColor Cyan
