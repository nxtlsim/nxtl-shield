<#
.SYNOPSIS
    NXTL Shield - System-Wide Safe DNS Configuration for Windows 10 & 11
.DESCRIPTION
    Configures active network adapters to use ad & tracker blocking encrypted DNS.
    Uses IPv4 (94.140.14.14, 94.140.15.15) and IPv6 (2a10:50c0::ad1:ff, 2a10:50c0::ad2:ff).
    On Windows 11, registers the DoH server template for automatic opportunistic encryption.
    Saves a backup of existing settings to restore via -Undo.
.PARAMETER Undo
    Restores the network adapters' DNS configuration from backup, or resets to DHCP.
#>
[CmdletBinding()]
param(
    [switch]$Undo
)

$ErrorActionPreference = "Stop"

$BackupDir = Join-Path $env:LOCALAPPDATA "NXTL-Shield"
$BackupFile = Join-Path $BackupDir "dns-backup.json"
$ResolverIPv4 = @("94.140.14.14", "94.140.15.15")
$ResolverIPv6 = @("2a10:50c0::ad1:ff", "2a10:50c0::ad2:ff")
$DohTemplate = "https://dns.adguard-dns.com/dns-query"

# Verify Administrator privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "[!] Administrator privileges required. Please run PowerShell as Administrator." -ForegroundColor Red
    exit 1
}

if ($Undo) {
    Write-Host "`n=== NXTL Shield: Restoring DNS Settings ===" -ForegroundColor Cyan
    if (Test-Path $BackupFile) {
        try {
            $backupData = Get-Content $BackupFile -Raw | ConvertFrom-Json
            foreach ($item in $backupData) {
                $alias = $item.InterfaceAlias
                Write-Host "Restoring adapter '$alias'..." -ForegroundColor Yellow
                if ($item.Dhcp -eq $true) {
                    Set-DnsClientServerAddress -InterfaceAlias $alias -ResetServerAddresses
                } elseif ($item.ServerAddresses -and $item.ServerAddresses.Count -gt 0) {
                    Set-DnsClientServerAddress -InterfaceAlias $alias -ServerAddresses $item.ServerAddresses
                } else {
                    Set-DnsClientServerAddress -InterfaceAlias $alias -ResetServerAddresses
                }
            }
            Remove-Item $BackupFile -Force -ErrorAction SilentlyContinue
            Write-Host "`n[✓] DNS settings successfully restored from backup." -ForegroundColor Green
        } catch {
            Write-Warning "Could not restore from backup file: $_"
            Write-Host "Resetting active adapters to DHCP (automatic)..." -ForegroundColor Yellow
            Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | ForEach-Object {
                Set-DnsClientServerAddress -InterfaceAlias $_.InterfaceAlias -ResetServerAddresses
            }
            Write-Host "`n[✓] Reset active adapters to DHCP." -ForegroundColor Green
        }
    } else {
        Write-Host "No backup file found. Resetting active adapters to DHCP (automatic)..." -ForegroundColor Yellow
        Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | ForEach-Object {
            Set-DnsClientServerAddress -InterfaceAlias $_.InterfaceAlias -ResetServerAddresses
        }
        Write-Host "`n[✓] All active adapters reset to automatic (DHCP) DNS." -ForegroundColor Green
    }
    Write-Host "Done. Please restart your browser." -ForegroundColor Cyan
    exit 0
}

Write-Host "`n=== NXTL Shield: Setting Up Safe DNS ===" -ForegroundColor Cyan
Write-Host "Ad & Tracker Blocking Resolver:"
Write-Host "  IPv4: $($ResolverIPv4 -join ', ')"
Write-Host "  IPv6: $($ResolverIPv6 -join ', ')"
Write-Host "  DoH Template: $DohTemplate`n"

# Create backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$activeAdapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
if (-not $activeAdapters) {
    Write-Host "[!] No active network adapters found." -ForegroundColor Yellow
    exit 0
}

$backupItems = @()

foreach ($adapter in $activeAdapters) {
    $alias = $adapter.InterfaceAlias
    Write-Host "Processing adapter: $alias..." -ForegroundColor Gray

    # Save existing DNS
    $current = Get-DnsClientServerAddress -InterfaceAlias $alias -AddressFamily IPv4 -ErrorAction SilentlyContinue
    $isDhcp = (-not $current) -or ($current.ServerAddresses.Count -eq 0)

    $backupItems += [PSCustomObject]@{
        InterfaceAlias = $alias
        Dhcp = $isDhcp
        ServerAddresses = if ($current) { $current.ServerAddresses } else { @() }
    }

    # Configure static DNS servers
    try {
        Set-DnsClientServerAddress -InterfaceAlias $alias -ServerAddresses ($ResolverIPv4 + $ResolverIPv6)
        Write-Host "  [✓] Applied Safe DNS addresses to '$alias'." -ForegroundColor Green
    } catch {
        Write-Warning "  Could not set DNS on '$alias': $_"
    }

    # Windows 11 DoH Registration
    if (Get-Command Add-DnsClientDohServerAddress -ErrorAction SilentlyContinue) {
        foreach ($ip in $ResolverIPv4) {
            try {
                Add-DnsClientDohServerAddress -ServerAddress $ip -DohTemplate $DohTemplate -AllowFallbackToUdp $true -AutoUpgrade $true -ErrorAction SilentlyContinue
            } catch {
                # Already exists or unsupported
            }
        }
    }
}

# Save backup to file
$backupItems | ConvertTo-Json | Set-Content -Path $BackupFile -Encoding UTF8
Write-Host "`n[✓] Safe DNS is now active across your active connections!" -ForegroundColor Green
Write-Host "Backup saved to: $BackupFile" -ForegroundColor DarkGray
Write-Host "To undo at any time, run: .\nxtl-shield-windows-dns.ps1 -Undo" -ForegroundColor Cyan
Write-Host "Please restart your web browser for changes to take full effect." -ForegroundColor Cyan
