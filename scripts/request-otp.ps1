param(
  [string]$Phone = '+221771234567'
)

$ErrorActionPreference = 'Stop'

$body = @{
  phone = $Phone
  purpose = 'login'
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri 'http://localhost:4000/auth/send-otp' `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body

$response | ConvertTo-Json -Depth 8
