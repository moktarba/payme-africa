param(
  [int]$Port = 8081,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-DockerDaemon {
  $processInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $processInfo.FileName = 'docker'
  $processInfo.Arguments = 'info --format "{{.ServerVersion}}"'
  $processInfo.RedirectStandardOutput = $true
  $processInfo.RedirectStandardError = $true
  $processInfo.UseShellExecute = $false
  $processInfo.CreateNoWindow = $true

  $process = [System.Diagnostics.Process]::Start($processInfo)

  if (-not $process.WaitForExit(20000)) {
    try {
      $process.Kill($true)
    } catch {
      $process.Kill()
    }
    return $false
  }

  $output = $process.StandardOutput.ReadToEnd()
  return ($process.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($output))
}

if (-not (Test-Command 'docker')) {
  throw 'Docker est introuvable. Installez/lancez Docker Desktop puis relancez npm run ui.'
}

if (-not (Test-Command 'node')) {
  throw 'Node.js est introuvable. Installez Node.js 20+ puis relancez npm run ui.'
}

if (-not (Test-DockerDaemon)) {
  throw 'Docker ne repond pas. Ouvrez Docker Desktop, attendez que le moteur soit demarre, puis relancez npm run ui.'
}

if (-not (Test-Path '.env')) {
  Write-Step 'Creation du fichier .env depuis .env.example'
  Copy-Item '.env.example' '.env'
}

Write-Step 'Demarrage du backend, PostgreSQL et Redis'
docker compose up -d

Write-Step 'Attente de l API http://localhost:4000/health'
$deadline = (Get-Date).AddSeconds(90)
$apiReady = $false

while ((Get-Date) -lt $deadline) {
  try {
    $response = Invoke-WebRequest -Uri 'http://localhost:4000/health' -UseBasicParsing -TimeoutSec 3
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
      $apiReady = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

if (-not $apiReady) {
  Write-Host ""
  docker compose ps
  throw 'L API ne repond pas encore. Consultez les logs avec: docker compose logs -f backend'
}

Write-Host "API prete: http://localhost:4000" -ForegroundColor Green

if (-not $SkipInstall -and -not (Test-Path 'mobile/node_modules')) {
  Write-Step 'Installation des dependances mobile'
  Push-Location 'mobile'
  npm install --legacy-peer-deps
  Pop-Location
}

$env:EXPO_PUBLIC_API_URL = 'http://localhost:4000'

Write-Step "Lancement de l interface web Expo sur http://localhost:$Port"
Write-Host "Compte de test: +221771234567" -ForegroundColor Yellow
Write-Host "Pour demander un OTP de test depuis un autre terminal: npm run otp" -ForegroundColor Yellow
Write-Host "Arret interface: Ctrl+C. Arret backend: npm run dev:stop" -ForegroundColor Yellow
Write-Host ""

Push-Location 'mobile'
npx expo start --web --localhost --port $Port
Pop-Location
