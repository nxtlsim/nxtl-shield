import { getResolver, type Resolver } from "./resolvers";

export interface ProfileResult {
  filename: string;
  plist: string;
  resolver: Resolver;
  notes: string[];
}

function xml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildMobileconfig(resolverId: string, uuid = crypto.randomUUID(), payloadUuid = crypto.randomUUID()): ProfileResult {
  const resolver = getResolver(resolverId);
  if (!resolver) throw new Error("Unknown resolver.");
  const notes = [
    "Unsigned profile. Apple install sheets commonly say Not Signed or Unverified. That wording was not confirmed against an Apple page in the 2026-11-09 review (UNVERIFIED).",
    "Payload type com.apple.dnsSettings.managed is deprecated at iOS, iPadOS, macOS, and visionOS 27. Apple points to declarative configuration com.apple.configuration.network.dns-settings.",
    "Whether a manually installed profile still works on iOS 27 or macOS 27 was not device-tested (UNVERIFIED).",
    "Whether the declarative replacement can be installed without MDM was not verified (UNVERIFIED).",
    "When installed manually, Apple’s payload documentation says the setting also applies to cellular networks. When installed from MDM, it only applies to managed Wi-Fi. This profile is not installed by Shield.",
    `DNS queries go to ${resolver.provider} (${resolver.dotHost}), not to NXTL. Privacy policy: ${resolver.privacyUrl}`,
    resolver.bundling,
  ];
  const description = notes.join(" ");
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>DNSSettings</key>
      <dict>
        <key>DNSProtocol</key>
        <string>HTTPS</string>
        <key>ServerURL</key>
        <string>${xml(resolver.dohUrl)}</string>
      </dict>
      <key>PayloadDescription</key>
      <string>${xml(description)}</string>
      <key>PayloadDisplayName</key>
      <string>${xml(`NXTL Shield DNS — ${resolver.name}`)}</string>
      <key>PayloadIdentifier</key>
      <string>${xml(`com.nxtlsim.shield.dns.${resolver.id}`)}</string>
      <key>PayloadType</key>
      <string>com.apple.dnsSettings.managed</string>
      <key>PayloadUUID</key>
      <string>${xml(payloadUuid)}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>${xml(description)}</string>
  <key>PayloadDisplayName</key>
  <string>${xml(`NXTL Shield DNS — ${resolver.name}`)}</string>
  <key>PayloadIdentifier</key>
  <string>${xml(`com.nxtlsim.shield.dns.profile.${resolver.id}`)}</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${xml(uuid)}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
`;
  return {
    filename: `nxtl-shield-${resolver.id}.mobileconfig`,
    plist,
    resolver,
    notes,
  };
}
