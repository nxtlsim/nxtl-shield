<# :
@echo off
setlocal
title NXTL Shield: turning Safe DNS on

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
$ResolverIPv4 = @("94.140.14.14", "94.140.15.15")
$ResolverIPv6 = @("2a10:50c0::ad1:ff", "2a10:50c0::ad2:ff")
$DohTemplate = "https://dns.adguard-dns.com/dns-query"

Write-Host "`n=== NXTL Shield: turning Safe DNS on ===" -ForegroundColor Cyan

# Verify active network adapters
$activeAdapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Up" }
if (-not $activeAdapters) {
    Write-Host "[!] No active network connections found." -ForegroundColor Yellow
    exit 1
}

# Create backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$backupItems = @()

foreach ($adapter in $activeAdapters) {
    $alias = $adapter.InterfaceAlias

    # Save existing IPv4 and IPv6 DNS settings (skip link-local IPv6)
    $current4 = Get-DnsClientServerAddress -InterfaceAlias $alias -AddressFamily IPv4 -ErrorAction SilentlyContinue
    $current6 = Get-DnsClientServerAddress -InterfaceAlias $alias -AddressFamily IPv6 -ErrorAction SilentlyContinue
    $saved4 = if ($current4 -and $current4.ServerAddresses) { @($current4.ServerAddresses) } else { @() }
    $saved6 = @()
    if ($current6 -and $current6.ServerAddresses) {
        foreach ($ip in @($current6.ServerAddresses)) {
            if ($ip -and -not $ip.StartsWith("fe80:")) { $saved6 += $ip }
        }
    }
    $isDhcp = ($saved4.Count -eq 0 -and $saved6.Count -eq 0)
    $savedAddrs = @($saved4) + @($saved6)

    $backupItems += [PSCustomObject]@{
        InterfaceAlias = $alias
        Dhcp = $isDhcp
        ServerAddresses = $savedAddrs
    }

    # Set Safe DNS addresses
    $allServers = @($ResolverIPv4) + @($ResolverIPv6)
    try {
        Set-DnsClientServerAddress -InterfaceAlias $alias -ServerAddresses $allServers -ErrorAction Stop
    } catch {
        Write-Warning "Could not set DNS on '$alias': $_"
    }

    # Windows 11 DoH Registration (when cmdlet exists)
    if (Get-Command Add-DnsClientDohServerAddress -ErrorAction SilentlyContinue) {
        foreach ($ip in ($ResolverIPv4 + $ResolverIPv6)) {
            try {
                Add-DnsClientDohServerAddress -ServerAddress $ip -DohTemplate $DohTemplate -AllowFallbackToUdp $true -AutoUpgrade $true -ErrorAction SilentlyContinue
            } catch {
                # Already registered or unsupported
            }
        }
    }
}

# Save backup file
$json = $backupItems | ConvertTo-Json
if ($backupItems.Count -eq 1) {
    $json = "[$json]"
}
$json | Set-Content -Path $BackupFile -Encoding UTF8

# Read back and verify addresses
$verified = $true
foreach ($adapter in $activeAdapters) {
    $alias = $adapter.InterfaceAlias
    $current = Get-DnsClientServerAddress -InterfaceAlias $alias -AddressFamily IPv4 -ErrorAction SilentlyContinue
    if (-not $current -or $current.ServerAddresses.Count -eq 0) {
        $verified = $false
    }
}

if ($verified) {
    Write-Host "`n[✓] Safe DNS is on for your active connections." -ForegroundColor Green
    Write-Host "Restart your browser to finish." -ForegroundColor Cyan
} else {
    Write-Host "`n[!] Some connections could not be verified." -ForegroundColor Yellow
    Write-Host "Restart your browser to finish." -ForegroundColor Cyan
}

