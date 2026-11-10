import type { Capability } from "./types";

const ACCESSED = "2026-11-09";

function row(
  id: string,
  name: string,
  userStatus: Capability["userStatus"],
  implementationStatus: Capability["implementationStatus"],
  summary: string,
  limitations: string,
  extra: Partial<Capability> = {},
): Capability {
  return {
    id,
    name,
    userStatus,
    implementationStatus,
    summary,
    scope: extra.scope ?? "This browser.",
    limitations,
    sourceUrl: extra.sourceUrl,
    sourceAccessed: extra.sourceUrl ? ACCESSED : undefined,
    costOwner: extra.costOwner ?? "No fee.",
  };
}

export const CAPABILITIES: Capability[] = [
  row("link-check", "Link check", "works_automatically", "implemented-and-verified", "Parse a link locally and compare the host with the bundled snapshots.", "A miss is not a promise that the page is safe. Lists are not auto-updated.", { scope: "The address you submit." }),
  row("message-check", "Message check", "works_automatically", "implemented-and-verified", "Paste a message. Links inside it are checked locally.", "Pasted text cannot prove who sent it. Shield does not read your SMS or email app."),
  row("qr-check", "QR check", "works_automatically", "implemented-and-verified", "Decode a QR image or the camera locally, then check the result before you open it.", "The camera needs your permission. Shield does not open the link on its own."),
  row("file-check", "File name and hash", "works_automatically", "implemented-and-verified", "Local SHA-256, double-extension, and a few magic-byte checks.", "This is not a malware scan."),
  row("url-cleaner", "Link cleaner", "works_automatically", "implemented-and-verified", "Remove a conservative set of tracking parameters, with undo.", "Signed, login, and payment links are left unchanged."),
  row("passwords", "Password tools", "works_automatically", "implemented-and-verified", "Web Crypto passwords and passphrases, plus a local strength estimate.", "The passphrase is not a wallet recovery phrase. The estimate is not a guarantee."),
  row("pwned-range", "Breached-password range check", "works_automatically", "implemented-and-verified", "Optional check of a five-character SHA-1 prefix against the Pwned Passwords range API.", "Not an email search. A miss is not proof of strength.", { scope: "This browser. The prefix is sent only if you ask.", costOwner: "The range API is free to call. Shield adds no fee." }),
  row("secure-share", "Private messages & files", "works_automatically", "implemented-and-verified", "Encrypt or decrypt a message or file you enter here, with a shared password.", "Protects only that content. It does not encrypt other apps. GnuPG 2.4 cannot open what Shield writes. Shield can open passphrase messages from GnuPG 2.4.", { sourceUrl: "https://github.com/openpgpjs/openpgpjs/releases/tag/v6.3.2", costOwner: "No fee. The library is LGPL-3.0-or-later." }),
  row("connection", "Connection Doctor", "works_automatically", "implemented-but-not-device-verified", "Browser hints, an optional public-IP lookup, and optional WebRTC candidate counts.", "These signals do not prove which SIM or tunnel is in use. Physical phones were not tested.", { scope: "This browser, and only the lookups you start." }),
  row("location", "Location privacy", "needs_setup", "implemented-but-not-device-verified", "Explains website permission, app permission, and IP-inferred location separately. The Chromium extension can block location and restore what it changed.", "Firefox cannot set this from an extension. Phone app permissions are manual steps.", { sourceUrl: "https://developer.chrome.com/docs/extensions/reference/api/contentSettings" }),
  row("esim", "NXTL eSIM guidance", "works_automatically", "implemented-but-not-device-verified", "London-exit explanation, setup steps, and live EUR-per-GB rates.", "Buying data is optional and unlocks nothing here. Shield cannot see whether the NXTL line is active.", { sourceUrl: "https://nxtlsim.com/global-routing/", costOwner: "NXTL eSIM is a separate paid service." }),
  row("dns", "Encrypted DNS setup", "needs_setup", "manual-only", "Download an Apple DNS profile or follow Android, Windows, Chrome, and Firefox steps for a public resolver you choose.", "A download is not an installed profile. Shield does not run a resolver.", { costOwner: "Queries go to the resolver you pick." }),
  row("extension-threats", "Threat blocking in the browser", "needs_setup", "implemented-but-not-device-verified", "The extension can warn on a capped copy of the bundled threat lists.", "The manual checker uses the full snapshot. The extension stays under the browser’s static-rule budget.", { scope: "This browser, after you turn the extension on." }),
  row("extension-trackers", "Tracker domains in the browser", "needs_setup", "implemented-but-not-device-verified", "Optional off-by-default rules for tracker-like hosts.", "Not a full cosmetic ad blocker, and not same-site ads."),
  row("extension-clean", "Link cleaning in the browser", "needs_setup", "implemented-but-not-device-verified", "The extension can strip the same conservative tracking parameters.", "Signed-looking links are skipped when the rule matches."),
  row("cookie-hide", "Cookie-banner hiding", "needs_setup", "implemented-but-not-device-verified", "The extension can hide a short list of common banners.", "Hiding is not rejecting consent."),
  row("reports", "Reports, theme, and export", "works_automatically", "implemented-and-verified", "Redacted check history stays in this browser. Light and dark follow the system or your choice.", "Passwords and file bytes are not stored."),
  row("install", "Install the page", "works_automatically", "implemented-and-verified", "Use the browser install prompt when it exists, otherwise the steps for that browser.", "Installing the page does not add system filtering or a tunnel."),
  row("android-companion", "Android companion", "needs_native", "not-yet-implemented", "A later signed app could add on-device filtering, call screening, and broader file checks.", "No app is built in this version. See docs/android-companion.md."),
  row("device-tunnel", "Device-wide encrypted tunnel", "not_built", "not-yet-implemented", "Shield does not run a tunnel or choose an exit city.", "NXTL mobile data has its own published London exit. That is a connection, not this feature."),
  row("malware-scan", "File-content malware scan", "not_built", "not-yet-implemented", "No antivirus engine is bundled.", "The file tool only hashes and checks the name and a few leading bytes."),
  row("call-screen", "Call screening", "needs_native", "not-yet-implemented", "No call-screening role and no number list.", "A website cannot screen calls."),
  row("vault", "Password vault", "not_built", "not-yet-implemented", "Shield does not store passwords.", "Use a separate maintained vault if you need one."),
  row("email-breach", "Email breach monitoring", "unsupported", "unavailable-data-source", "Shield does not look up email addresses.", "The password range check is not an email search."),
];

export function getCapabilities(): Capability[] {
  return CAPABILITIES;
}
