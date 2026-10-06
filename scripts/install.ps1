# IQX CLI Windows Installer (PowerShell)
$ErrorActionPreference = "Stop"

$Repo = "accureteam/iqx-cli"
$BinDir = "$Home\.iqx\bin"
$ExePath = "$BinDir\iqx.exe"
$Url = "https://github.com/$Repo/releases/latest/download/iqx-windows-x64.exe"

Write-Host "⚡ Installing IQX CLI for Windows (x64)..." -ForegroundColor Cyan

if (!(Test-Path $BinDir)) {
    New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
}

Invoke-WebRequest -Uri $Url -OutFile $ExePath

# Add to User PATH if not already present
$UserPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
if ($UserPath -notlike "*$BinDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$BinDir", [EnvironmentVariableTarget]::User)
    $env:Path += ";$BinDir"
    Write-Host "✔ Added $BinDir to User PATH." -ForegroundColor Green
}

Write-Host "✔ IQX CLI installed successfully to $ExePath!" -ForegroundColor Green
Write-Host ""
Write-Host "Get started in a new PowerShell window:"
Write-Host "  iqx --help"
Write-Host "  iqx auth login"
Write-Host "  iqx chat"
