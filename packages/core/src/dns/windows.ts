import { getResolver, RESOLVERS } from "./resolvers";

export function buildWindowsCmd(resolverId: string): string {
  const resolver = getResolver(resolverId) ?? RESOLVERS[0];
  const ipv4Formatted = resolver.ipv4.map((ip) => `"${ip}"`).join(", ");
  const ipv6Formatted = resolver.ipv6.map((ip) => `"${ip}"`).join(", ");
  const doh = resolver.dohUrl;

  const lines = [
    "<# :",
    "@echo off",
    "setlocal",
    "title NXTL Shield: turning Safe DNS on",
    "",
    "net session >nul 2>&1",
    "if %errorlevel% neq 0 (",
    "    echo Asking Windows for permission to change DNS...",
    '    powershell.exe -NoProfile -Command "Start-Process -LiteralPath \'%~f0\' -Verb RunAs"',
    "    exit /b",
    ")",
    "",
    'set "SCRIPT_PATH=%~f0"',
    'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$script = [System.IO.File]::ReadAllText($env:SCRIPT_PATH); Invoke-Expression $script"',
    "if %errorlevel% neq 0 (",
    "    echo.",
    "    echo Script ended with code %errorlevel%.",
    ")",
    "pause",
    "exit /b %errorlevel%",
    "#>",
    "[CmdletBinding()]",
    "param()",
    "",
    '$ErrorActionPreference = "Stop"',
    "",
    '$BackupDir = Join-Path $env:LOCALAPPDATA "NXTL-Shield"',
    '$BackupFile = Join-Path $BackupDir "dns-backup.json"',
    `$ResolverIPv4 = @(${ipv4Formatted})`,
    `$ResolverIPv6 = @(${ipv6Formatted})`,
    `$DohTemplate = "${doh}"`,
    "",
    'Write-Host "`n=== NXTL Shield: turning Safe DNS on ===" -ForegroundColor Cyan',
    "",
    "# Verify active network adapters",
    '$activeAdapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Up" }',
    "if (-not $activeAdapters) {",
    '    Write-Host "[!] No active network connections found." -ForegroundColor Yellow',
    "    exit 1",
    "}",
    "",
    "# Create backup directory",
    "if (-not (Test-Path $BackupDir)) {",
    "    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null",
    "}",
    "",
    "$backupItems = @()",
    "",
    "foreach ($adapter in $activeAdapters) {",
    "    $alias = $adapter.InterfaceAlias",
    "",
    "    # Save existing IPv4 and IPv6 DNS settings (skip link-local IPv6)",
    "    $current4 = Get-DnsClientServerAddress -InterfaceAlias $alias -AddressFamily IPv4 -ErrorAction SilentlyContinue",
    "    $current6 = Get-DnsClientServerAddress -InterfaceAlias $alias -AddressFamily IPv6 -ErrorAction SilentlyContinue",
    "    $saved4 = if ($current4 -and $current4.ServerAddresses) { @($current4.ServerAddresses) } else { @() }",
    "    $saved6 = @()",
    "    if ($current6 -and $current6.ServerAddresses) {",
    '        foreach ($ip in @($current6.ServerAddresses)) {',
    '            if ($ip -and -not $ip.StartsWith("fe80:")) { $saved6 += $ip }',
    "        }",
    "    }",
    "    $isDhcp = ($saved4.Count -eq 0 -and $saved6.Count -eq 0)",
    "    $savedAddrs = @($saved4) + @($saved6)",
    "",
    "    $backupItems += [PSCustomObject]@{",
    "        InterfaceAlias = $alias",
    "        Dhcp = $isDhcp",
    "        ServerAddresses = $savedAddrs",
    "    }",
    "",
    "    # Set Safe DNS addresses",
    "    $allServers = @($ResolverIPv4) + @($ResolverIPv6)",
    "    try {",
    "        Set-DnsClientServerAddress -InterfaceAlias $alias -ServerAddresses $allServers -ErrorAction Stop",
    "    } catch {",
    '        Write-Warning "Could not set DNS on \'$alias\': $_"',
    "    }",
    "",
    "    # Windows 11 DoH Registration (when cmdlet exists)",
    "    if (Get-Command Add-DnsClientDohServerAddress -ErrorAction SilentlyContinue) {",
    "        foreach ($ip in ($ResolverIPv4 + $ResolverIPv6)) {",
    "            try {",
    "                Add-DnsClientDohServerAddress -ServerAddress $ip -DohTemplate $DohTemplate -AllowFallbackToUdp $true -AutoUpgrade $true -ErrorAction SilentlyContinue",
    "            } catch {",
    "                # Already registered or unsupported",
    "            }",
    "        }",
    "    }",
    "}",
    "",
    "# Save backup file",
    "$json = $backupItems | ConvertTo-Json",
    "if ($backupItems.Count -eq 1) {",
    '    $json = "[$json]"',
    "}",
    "$json | Set-Content -Path $BackupFile -Encoding UTF8",
    "",
    "# Read back and verify addresses",
    "$verified = $true",
    "foreach ($adapter in $activeAdapters) {",
    "    $alias = $adapter.InterfaceAlias",
    "    $current = Get-DnsClientServerAddress -InterfaceAlias $alias -AddressFamily IPv4 -ErrorAction SilentlyContinue",
    "    if (-not $current -or $current.ServerAddresses.Count -eq 0) {",
    "        $verified = $false",
    "    }",
    "}",
    "",
    "if ($verified) {",
    '    Write-Host "`n[✓] Safe DNS is on for your active connections." -ForegroundColor Green',
    '    Write-Host "Restart your browser to finish." -ForegroundColor Cyan',
    "} else {",
    '    Write-Host "`n[!] Some connections could not be verified." -ForegroundColor Yellow',
    '    Write-Host "Restart your browser to finish." -ForegroundColor Cyan',
    "}",
    "",
  ];

  return lines.join("\r\n") + "\r\n";
}

export function buildWindowsUndoCmd(): string {
  const lines = [
    "<# :",
    "@echo off",
    "setlocal",
    "title NXTL Shield: turning Safe DNS off",
    "",
    "net session >nul 2>&1",
    "if %errorlevel% neq 0 (",
    "    echo Asking Windows for permission to change DNS...",
    '    powershell.exe -NoProfile -Command "Start-Process -LiteralPath \'%~f0\' -Verb RunAs"',
    "    exit /b",
    ")",
    "",
    'set "SCRIPT_PATH=%~f0"',
    'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$script = [System.IO.File]::ReadAllText($env:SCRIPT_PATH); Invoke-Expression $script"',
    "if %errorlevel% neq 0 (",
    "    echo.",
    "    echo Script ended with code %errorlevel%.",
    ")",
    "pause",
    "exit /b %errorlevel%",
    "#>",
    "[CmdletBinding()]",
    "param()",
    "",
    '$ErrorActionPreference = "Stop"',
    "",
    '$BackupDir = Join-Path $env:LOCALAPPDATA "NXTL-Shield"',
    '$BackupFile = Join-Path $BackupDir "dns-backup.json"',
    "",
    'Write-Host "`n=== NXTL Shield: turning Safe DNS off ===" -ForegroundColor Cyan',
    "",
    '$activeAdapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Up" }',
    "",
    "if (Test-Path $BackupFile) {",
    "    try {",
    "        $raw = Get-Content $BackupFile -Raw -Encoding UTF8",
    "        $backupData = $raw | ConvertFrom-Json",
    "        if ($backupData -isnot [System.Array]) {",
    "            $backupData = @($backupData)",
    "        }",
    "        foreach ($item in $backupData) {",
    "            $alias = $item.InterfaceAlias",
    "            $addrs = if ($item.ServerAddresses) { @($item.ServerAddresses) } else { @() }",
    "            if ($item.Dhcp -eq $true -or $addrs.Count -eq 0) {",
    "                Set-DnsClientServerAddress -InterfaceAlias $alias -ResetServerAddresses -ErrorAction SilentlyContinue",
    "            } else {",
    "                Set-DnsClientServerAddress -InterfaceAlias $alias -ServerAddresses $addrs -ErrorAction SilentlyContinue",
    "            }",
    "        }",
    "        Remove-Item $BackupFile -Force -ErrorAction SilentlyContinue",
    '        Write-Host "`n[✓] DNS was restored from the saved backup." -ForegroundColor Green',
    "    } catch {",
    '        Write-Warning "Could not read backup file: $_"',
    "        if ($activeAdapters) {",
    "            foreach ($adapter in $activeAdapters) {",
    "                Set-DnsClientServerAddress -InterfaceAlias $adapter.InterfaceAlias -ResetServerAddresses -ErrorAction SilentlyContinue",
    "            }",
    "        }",
    '        Write-Host "`n[✓] Active connections now use automatic DNS." -ForegroundColor Green',
    "    }",
    "} else {",
    "    if ($activeAdapters) {",
    "        foreach ($adapter in $activeAdapters) {",
    "            Set-DnsClientServerAddress -InterfaceAlias $adapter.InterfaceAlias -ResetServerAddresses -ErrorAction SilentlyContinue",
    "        }",
    "    }",
    '    Write-Host "`n[✓] Active connections now use automatic DNS." -ForegroundColor Green',
    "}",
    "",
    'Write-Host "Restart your browser to finish." -ForegroundColor Cyan',
    "",
  ];

  return lines.join("\r\n") + "\r\n";
}

export function buildBrowserDnsReg(resolverId: string): string {
  const resolver = getResolver(resolverId) ?? RESOLVERS[0];
  const url = resolver.dohUrl;
  const lines = [
    "Windows Registry Editor Version 5.00",
    "",
    "; NXTL Shield — encrypted DNS for Chrome and Edge",
    `; Resolver: ${url}`,
    "; To undo, apply nxtl-shield-browser-dns-undo.reg",
    "",
    "[HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Google\\Chrome]",
    '"DnsOverHttpsMode"="secure"',
    `"DnsOverHttpsTemplates"="${url}"`,
    "",
    "[HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Edge]",
    '"DnsOverHttpsMode"="secure"',
    `"DnsOverHttpsTemplates"="${url}"`,
    "",
  ];
  return lines.join("\r\n");
}

export function buildBrowserDnsUndoReg(): string {
  const lines = [
    "Windows Registry Editor Version 5.00",
    "",
    "; NXTL Shield — remove the encrypted DNS policy for Chrome and Edge",
    "",
    "[HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Google\\Chrome]",
    '"DnsOverHttpsMode"=-',
    '"DnsOverHttpsTemplates"=-',
    "",
    "[HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Edge]",
    '"DnsOverHttpsMode"=-',
    '"DnsOverHttpsTemplates"=-',
    "",
  ];
  return lines.join("\r\n");
}

export function buildFirefoxPoliciesJson(resolverId: string): string {
  const resolver = getResolver(resolverId) ?? RESOLVERS[0];
  return `${JSON.stringify(
    {
      policies: {
        DNSOverHTTPS: {
          Enabled: true,
          ProviderURL: resolver.dohUrl,
          Locked: false,
        },
      },
    },
    null,
    2,
  )}\n`;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Uint8Array {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value, true);
  return out;
}

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, true);
  return out;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Store-only zip of the Windows setup files for the chosen protection level. */
export function buildWindowsSetupZip(resolverId: string): Uint8Array {
  const files = [
    { name: "nxtl-shield-windows-dns.cmd", content: buildWindowsCmd(resolverId) },
    { name: "nxtl-shield-windows-dns-undo.cmd", content: buildWindowsUndoCmd() },
    { name: "nxtl-shield-browser-dns.reg", content: buildBrowserDnsReg(resolverId) },
    { name: "nxtl-shield-browser-dns-undo.reg", content: buildBrowserDnsUndoReg() },
    { name: "policies.json", content: buildFirefoxPoliciesJson(resolverId) },
  ];
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ]);
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralDir = concat(centrals);
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);
  return concat([...locals, centralDir, end]);
}

