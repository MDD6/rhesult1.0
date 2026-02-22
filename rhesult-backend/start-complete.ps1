$ErrorActionPreference = "Stop"

Write-Host "== RHesult Backend Start Complete ==" -ForegroundColor Cyan

$backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $backendDir

function Get-MySqlService {
  $services = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
  if (-not $services) {
    return $null
  }

  return $services | Sort-Object Name | Select-Object -First 1
}

$mysqlService = Get-MySqlService
if (-not $mysqlService) {
  throw "Serviço MySQL não encontrado. Instale e configure o MySQL no Windows."
}

if ($mysqlService.Status -ne "Running") {
  Write-Host "Iniciando serviço $($mysqlService.Name)..." -ForegroundColor Yellow
  Start-Service -Name $mysqlService.Name
  Start-Sleep -Seconds 2
  $mysqlService = Get-MySqlService
}

Write-Host "MySQL: $($mysqlService.Name) ($($mysqlService.Status))" -ForegroundColor Green

Write-Host "Validando conexão com banco..." -ForegroundColor Yellow
node check-users.js | Out-Null
Write-Host "Banco de dados OK" -ForegroundColor Green

$alreadyRunning = Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -match "node(\.exe)?\s+server\.js" -and
    $_.CommandLine -match "rhesult-backend"
  } |
  Select-Object -First 1

if (-not $alreadyRunning) {
  Write-Host "Iniciando backend (npm start)..." -ForegroundColor Yellow
  Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory $backendDir -WindowStyle Hidden | Out-Null
} else {
  Write-Host "Backend já estava em execução." -ForegroundColor Yellow
}

$healthOk = $false
for ($i = 1; $i -le 25; $i++) {
  try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 3
    if ($response.status -eq "OK") {
      $healthOk = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds 800
  }
}

if (-not $healthOk) {
  throw "Backend não respondeu em http://localhost:4000/health"
}

Write-Host "Backend OK em http://localhost:4000/health" -ForegroundColor Green
Write-Host "Pronto. Ambiente completo ativo (MySQL + Backend + validação)." -ForegroundColor Cyan
