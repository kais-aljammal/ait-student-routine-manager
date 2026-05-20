# Smoke-test GET /api/send-alerts. Loads CRON_SECRET from .env.local unless -Secret is set.
param(
  [string]$BaseUrl = "https://ai-student-routine-manager.vercel.app",
  [string]$Secret = ""
)

$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.local"
if (-not $Secret -and (Test-Path $envFile)) {
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*CRON_SECRET=(.+)$') {
      $Secret = $Matches[1].Trim()
      break
    }
  }
}

if (-not $Secret) {
  Write-Error "Set CRON_SECRET in .env.local or pass -Secret."
  exit 1
}

$uri = "$($BaseUrl.TrimEnd('/'))/api/send-alerts"
$headers = @{ Authorization = "Bearer $Secret" }
Write-Host "GET $uri"
try {
  $result = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
  $result | ConvertTo-Json -Depth 5
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
