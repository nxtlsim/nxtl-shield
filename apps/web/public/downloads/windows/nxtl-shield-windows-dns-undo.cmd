<# :
@echo off
setlocal
title NXTL Shield: turning Safe DNS off

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Asking Windows for permission to change DNS...
    powershell.exe -NoProfile -Command "Start-Process -LiteralPath '%~f0' -Verb RunAs"
    exit /b
)

set "SCRIPT_PATH=%~f0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$script = [System.IO.File]::ReadAllText($env:SCRIPT_PATH); Invoke-Expression $script"
if %errorlevel% neq 0 (
    echo.
    echo Script ended with code %errorlevel%.
)
pause
exit /b %errorlevel%
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$BackupDir = Join-Path $env:LOCALAPPDATA "NXTL-Shield"
$BackupFile = Join-Path $BackupDir "dns-backup.json"

Write-Host "`n=== NXTL Shield: turning Safe DNS off ===" -ForegroundColor Cyan

$activeAdapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Up" }

if (Test-Path $BackupFile) {
    try {
        $raw = Get-Content $BackupFile -Raw -Encoding UTF8
        $backupData = $raw | ConvertFrom-Json
        if ($backupData -isnot [System.Array]) {
            $backupData = @($backupData)
        }
        foreach ($item in $backupData) {
            $alias = $item.InterfaceAlias
            $addrs = if ($item.ServerAddresses) { @($item.ServerAddresses) } else { @() }
            if ($item.Dhcp -eq $true -or $addrs.Count -eq 0) {
                Set-DnsClientServerAddress -InterfaceAlias $alias -ResetServerAddresses -ErrorAction SilentlyContinue
            } else {
                Set-DnsClientServerAddress -InterfaceAlias $alias -ServerAddresses $addrs -ErrorAction SilentlyContinue
            }
        }
        Remove-Item $BackupFile -Force -ErrorAction SilentlyContinue
        Write-Host "`n[✓] DNS was restored from the saved backup." -ForegroundColor Green
    } catch {
        Write-Warning "Could not read backup file: $_"
        if ($activeAdapters) {
            foreach ($adapter in $activeAdapters) {
                Set-DnsClientServerAddress -InterfaceAlias $adapter.InterfaceAlias -ResetServerAddresses -ErrorAction SilentlyContinue
            }
        }
        Write-Host "`n[✓] Active connections now use automatic DNS." -ForegroundColor Green
    }
} else {
    if ($activeAdapters) {
        foreach ($adapter in $activeAdapters) {
            Set-DnsClientServerAddress -InterfaceAlias $adapter.InterfaceAlias -ResetServerAddresses -ErrorAction SilentlyContinue
        }
    }
    Write-Host "`n[✓] Active connections now use automatic DNS." -ForegroundColor Green
}

Write-Host "Restart your browser to finish." -ForegroundColor Cyan

