param(
  [int]$Port = 4000,
  [string]$DbHost = 'localhost',
  [int]$DbPort = 5432,
  [string]$DbUser = 'postgres',
  [string]$DbPassword = 'postgres',
  [string]$DbName = 'postgres'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

$env:PORT = "$Port"
$env:DB_HOST = $DbHost
$env:DB_PORT = "$DbPort"
$env:DB_USER = $DbUser
$env:DB_PASSWORD = $DbPassword
$env:DB_NAME = $DbName
if (-not $env:JWT_SECRET) {
  $env:JWT_SECRET = 'change_this_in_production_super_secret_key_256bits'
}
$env:DISABLE_REDIS = 'true'
$env:DISABLE_OTP_RATE_LIMIT = 'true'

Write-Host "==> API locale PayMe Africa: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "DB: $DbUser@$DbHost`:$DbPort/$DbName" -ForegroundColor Yellow
Write-Host "Redis desactive et limite OTP desactivee pour les tests locaux." -ForegroundColor Yellow
Write-Host ""

node backend/src/app.js
