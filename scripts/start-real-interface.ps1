param(
  [int]$Port = 8082,
  [string]$ApiUrl = 'http://localhost:4000',
  [switch]$SkipInstall,
  [switch]$SkipDocker,
  [switch]$Dev
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js est introuvable. Installez Node.js 20+ puis relancez npm run ui:real.'
}

if (-not $SkipInstall -and -not (Test-Path 'mobile/node_modules')) {
  Write-Host '==> Installation des dependances mobile' -ForegroundColor Cyan
  Push-Location 'mobile'
  npm install --legacy-peer-deps
  Pop-Location
}

if (-not $SkipDocker) {
  $docker = Get-Command docker -ErrorAction SilentlyContinue
  if ($docker) {
    Write-Host '==> Demarrage backend local avec Docker Compose' -ForegroundColor Cyan
    docker compose up -d postgres redis backend
  } else {
    Write-Host 'Docker introuvable: demarrez le backend manuellement sur http://localhost:4000.' -ForegroundColor Yellow
  }
}

Write-Host "==> Verification API: $ApiUrl/health" -ForegroundColor Cyan
$healthOk = $false
for ($i = 1; $i -le 40; $i++) {
  try {
    $health = Invoke-RestMethod -Uri "$ApiUrl/health" -Method Get -TimeoutSec 2
    if ($health.success) {
      $healthOk = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

if (-not $healthOk) {
  throw "API indisponible sur $ApiUrl. Lancez docker compose up -d ou npm run backend, puis relancez."
}

$env:EXPO_PUBLIC_DEMO_MODE = 'false'
$env:EXPO_PUBLIC_API_URL = $ApiUrl

if ($Dev) {
  Write-Host ""
  Write-Host "==> Interface API reelle dev: http://localhost:$Port" -ForegroundColor Cyan
  Write-Host "API: $ApiUrl" -ForegroundColor Yellow
  Write-Host "Compte test: +221 77 123 45 67. Le code OTP est pre-rempli en developpement." -ForegroundColor Yellow
  Write-Host ""

  Push-Location 'mobile'
  npx expo start --web --localhost --port $Port --clear
  Pop-Location
  exit
}

$outputDir = Join-Path $repoRoot '.expo-web-real'

Write-Host ""
Write-Host '==> Construction de l interface connectee au backend reel' -ForegroundColor Cyan
Write-Host "API: $ApiUrl" -ForegroundColor Yellow
Write-Host ""

Push-Location 'mobile'
npx expo export --platform web --output-dir $outputDir --clear
Pop-Location

$indexPath = Join-Path $outputDir 'index.html'
$indexHtml = Get-Content $indexPath -Raw
$indexHtml = $indexHtml -replace '<script src="/_expo/', '<script type="module" src="/_expo/'
Set-Content -Path $indexPath -Value $indexHtml -NoNewline

Write-Host ""
Write-Host "==> Interface API reelle prete: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Compte test: +221 77 123 45 67. Le code OTP est pre-rempli en developpement." -ForegroundColor Yellow
Write-Host "Arret interface: Ctrl+C" -ForegroundColor Yellow
Write-Host ""

node scripts/serve-static.js $outputDir $Port
