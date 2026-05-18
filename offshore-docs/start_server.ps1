param(
  [int]$Port = 8000,
  [string]$HostName = "0.0.0.0",
  [switch]$Reload
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Python = Join-Path $Root ".venv\Scripts\python.exe"
$LogDir = Join-Path $Root "logs"

if (-not (Test-Path $Python)) {
  throw "Missing virtualenv Python at $Python. Run: python -m venv .venv; .\.venv\Scripts\pip.exe install -r backend\requirements.txt"
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique

foreach ($serverPid in $listeners) {
  $proc = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
  if ($proc) {
    Write-Host "Stopping process $serverPid on port $Port..."
    Stop-Process -Id $serverPid -Force
  }
}

$stdout = Join-Path $LogDir "server.out.log"
$stderr = Join-Path $LogDir "server.err.log"
$argsList = @("-m", "uvicorn", "main:app", "--host", $HostName, "--port", "$Port")
if ($Reload) {
  $argsList += "--reload"
}

$proc = Start-Process `
  -FilePath $Python `
  -ArgumentList $argsList `
  -WorkingDirectory $Backend `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

Start-Sleep -Seconds 2

try {
  $health = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/api/health" -TimeoutSec 5
  if ($health.StatusCode -ne 200) {
    throw "Health check returned HTTP $($health.StatusCode)"
  }
} catch {
  Write-Host "Server failed to respond. Recent stderr:"
  Get-Content $stderr -ErrorAction SilentlyContinue | Select-Object -Last 80
  throw
}

Write-Host "Server running on http://127.0.0.1:$Port (process $($proc.Id))"
Write-Host "Logs: $stdout and $stderr"
