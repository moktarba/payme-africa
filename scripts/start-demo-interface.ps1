param(
  [int]$Port = 8081,
  [switch]$SkipInstall,
  [switch]$Dev
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js est introuvable. Installez Node.js 20+ puis relancez npm run ui:demo.'
}

if (-not $SkipInstall -and -not (Test-Path 'mobile/node_modules')) {
  Write-Host '==> Installation des dependances mobile' -ForegroundColor Cyan
  Push-Location 'mobile'
  npm install --legacy-peer-deps
  Pop-Location
}

$env:EXPO_PUBLIC_DEMO_MODE = 'true'
$env:EXPO_PUBLIC_API_URL = 'http://localhost:4000'

if ($Dev) {
  Write-Host ""
  Write-Host "==> Lancement de l interface demo dev sur http://localhost:$Port" -ForegroundColor Cyan
  Write-Host "Mode demo: backend non requis, donnees factices activees." -ForegroundColor Yellow
  Write-Host "Si la page est blanche pendant la compilation, attendez la fin du bundle puis rechargez." -ForegroundColor Yellow
  Write-Host ""

  Push-Location 'mobile'
  npx expo start --web --localhost --port $Port --clear
  Pop-Location
  exit
}

$outputDir = Join-Path $repoRoot '.expo-web-demo'

Write-Host ""
Write-Host "==> Construction de l interface demo" -ForegroundColor Cyan
Write-Host "Mode demo: backend non requis, donnees factices activees." -ForegroundColor Yellow
Write-Host ""

Push-Location 'mobile'
npx expo export --platform web --output-dir $outputDir --clear
Pop-Location

$indexPath = Join-Path $outputDir 'index.html'
$indexHtml = Get-Content $indexPath -Raw
$indexHtml = $indexHtml -replace '<script src="/_expo/', '<script type="module" src="/_expo/'
Set-Content -Path $indexPath -Value $indexHtml -NoNewline

Write-Host ""
Write-Host "==> Interface prete: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Arret interface: Ctrl+C" -ForegroundColor Yellow
Write-Host ""

node scripts/serve-static.js $outputDir $Port
