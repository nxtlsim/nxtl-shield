import { getResolver } from "./resolvers";

export interface SetupSteps {
  platform: string;
  title: string;
  steps: string[];
  removal: string[];
  caveats: string[];
}

export function androidPrivateDnsSteps(resolverId: string): SetupSteps {
  const resolver = getResolver(resolverId);
  if (!resolver) throw new Error("Unknown resolver.");
  return {
    platform: "android",
    title: "Android Private DNS (Android 9+)",
    steps: [
      "Open Settings → Network & internet (or Wi-Fi & internet) → Advanced → Private DNS.",
      "Choose Private DNS provider hostname.",
      `Enter ${resolver.dotHost}`,
      "Enter the hostname only. Do not include https:// and do not enter an IP address.",
      "Save, then open the provider's check page from this Shield page. A web page cannot read the Private DNS setting back.",
    ],
    removal: [
      "Open the same Private DNS screen and choose Automatic or Off.",
      "Removing Private DNS does not remove a separate tunnel app. If a tunnel app is connected, it can override Private DNS.",
    ],
    caveats: [
      "OEM menus differ. Samsung's path is often Settings → Connections → More connection settings → Private DNS. That Samsung path was not re-verified on 2026-11-09 (UNVERIFIED).",
      `Queries go to ${resolver.provider}. ${resolver.bundling}`,
    ],
  };
}

export function windowsDohSteps(resolverId: string): SetupSteps {
  const resolver = getResolver(resolverId);
  if (!resolver) throw new Error("Unknown resolver.");
  const known =
    resolver.id === "quad9"
      ? "Quad9 9.9.9.9 and 149.112.112.112 are in Windows' known DoH server list."
      : "This resolver is not in the default Windows known-DoH list described in the Server 2022 documentation. Adding it needs an administrator PowerShell command, shown below as a template.";
  return {
    platform: "windows",
    title: "Windows DNS over HTTPS",
    steps: [
      "The Windows 11 Settings labels were UNVERIFIED on 2026-11-09 (the consumer support article returned 404). The mechanism below is from the Windows Server DoH client document and is believed to be shared with Windows 11. Confirm the labels on your PC.",
      "Settings → Network & internet → Ethernet or Wi-Fi → DNS server assignment → Edit → Manual.",
      "Enter the provider's IPv4 addresses as Preferred and Alternate DNS. If the address is in the known DoH list, set Preferred DNS encryption to Encrypted only (DNS over HTTPS).",
      known,
      resolver.id === "quad9"
        ? "Preferred 9.9.9.9, alternate 149.112.112.112."
        : `Template, run in an elevated PowerShell if you choose to: Add-DnsClientDohServerAddress -ServerAddress '<ip>' -DohTemplate '${resolver.dohUrl}' -AllowFallbackToUdp $False -AutoUpgrade $True`,
      "Check the known list with Get-DnsClientDohServerAddress. Shield cannot run that command for you.",
    ],
    removal: [
      "Set DNS server assignment back to Automatic, or remove the DoH server address you added.",
      "Shield does not change Windows settings from the browser.",
    ],
    caveats: [
      "A browser DoH setting is not the same as the Windows resolver. Chrome or Firefox can still use their own secure DNS.",
      resolver.bundling,
    ],
  };
}

export function chromeSecureDnsSteps(resolverId: string): SetupSteps {
  const resolver = getResolver(resolverId);
  if (!resolver) throw new Error("Unknown resolver.");
  return {
    platform: "chrome",
    title: "Chrome Use secure DNS",
    steps: [
      "Menu → Settings → Privacy and security → Security.",
      "Under Advanced, turn Use secure DNS on.",
      `Choose a listed provider or a custom provider and enter ${resolver.dohUrl}`,
      "On ChromeOS the control is labelled Use secure connections to look up sites.",
    ],
    removal: [
      "Turn Use secure DNS off, or choose another provider. This changes Chrome only, not the operating system resolver.",
    ],
    caveats: [
      "Source: https://support.google.com/chrome/answer/10468685 reviewed via the 2026-11-09 facts pack.",
      "This does not prove other browsers or apps use the same resolver.",
      resolver.bundling,
    ],
  };
}

export function firefoxDohSteps(resolverId: string): SetupSteps {
  const resolver = getResolver(resolverId);
  if (!resolver) throw new Error("Unknown resolver.");
  return {
    platform: "firefox",
    title: "Firefox DNS over HTTPS",
    steps: [
      "The current Firefox Settings path (Settings → Privacy & Security → DNS over HTTPS) was UNVERIFIED on 2026-11-09 because the SUMO article was behind a challenge.",
      "Mozilla's Trusted Recursive Resolver documentation says to use Network Settings in about:preferences, not about:config.",
      "network.trr.mode: 0 off, 2 with fallback, 3 only. network.trr.uri is the DoH URL.",
      `If you set a custom provider, the URL is ${resolver.dohUrl}`,
      "Support was added in Firefox 62.",
    ],
    removal: [
      "Set DNS over HTTPS to Off, or set network.trr.mode to 0. Shield does not change Firefox preferences.",
    ],
    caveats: ["This is the browser resolver only.", resolver.bundling],
  };
}

export function appleRemovalSteps(): string[] {
  return [
    "Install only if you downloaded the profile yourself. Shield never installs a profile onto a device.",
    "iPhone: download from Safari. You are asked for permission to install the profile. View and remove under Settings > General > VPN & Device Management.",
    "If you delete a profile, all of the settings, apps, and data associated with the profile are also deleted. Source: Apple's iPhone guide, version picker shows iOS 27.",
    "The intermediate “Profile Downloaded” wording on iOS 27 is UNVERIFIED.",
    "After install, the DNS entry is described under Settings > General > VPN & Device Management > DNS.",
    "macOS: System Settings → Privacy & Security → Profiles, or General → Device Management on newer macOS. The exact macOS 27 path is UNVERIFIED.",
  ];
}

export function setupBundle(resolverId: string) {
  return {
    resolver: getResolver(resolverId),
    android: androidPrivateDnsSteps(resolverId),
    windows: windowsDohSteps(resolverId),
    chrome: chromeSecureDnsSteps(resolverId),
    firefox: firefoxDohSteps(resolverId),
    appleRemoval: appleRemovalSteps(),
  };
}
