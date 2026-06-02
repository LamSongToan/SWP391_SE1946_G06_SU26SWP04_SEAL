$mailConfigPath = Join-Path $PSScriptRoot "local-mail.env.ps1"

if (-not (Test-Path $mailConfigPath)) {
    Write-Host "Missing local mail config: $mailConfigPath" -ForegroundColor Red
    Write-Host "Copy local-mail.env.ps1.example to local-mail.env.ps1 and fill in your Gmail SMTP values." -ForegroundColor Yellow
    exit 1
}

. $mailConfigPath

$requiredVars = @("MAIL_HOST", "MAIL_PORT", "MAIL_USERNAME", "MAIL_APP_PASSWORD", "MAIL_FROM")
$missing = @()

foreach ($varName in $requiredVars) {
    if (-not (Get-Item -Path "Env:$varName" -ErrorAction SilentlyContinue) -or [string]::IsNullOrWhiteSpace((Get-Item -Path "Env:$varName").Value)) {
        $missing += $varName
    }
}

if ($missing.Count -gt 0) {
    Write-Host "Missing required mail environment variables: $($missing -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host "Starting backend with local database + SMTP mail config..." -ForegroundColor Green
mvn spring-boot:run
