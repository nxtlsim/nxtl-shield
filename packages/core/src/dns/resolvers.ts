export interface Resolver {
  id: string;
  name: string;
  provider: string;
  dohUrl: string;
  dotHost: string;
  blocks: string;
  privacyUrl: string;
  verifyUrl: string | null;
  verifyNote: string;
  /** Only Quad9's success/failure phrases were confirmed in the fetched page text. */
  paste?: { positive: string; negative: string };
  jurisdiction: string;
  bundling: string;
}

export const RESOLVERS: Resolver[] = [
  {
    id: "adguard-default",
    name: "AdGuard Default",
    provider: "AdGuard DNS",
    dohUrl: "https://dns.adguard-dns.com/dns-query",
    dotHost: "dns.adguard-dns.com",
    blocks: "ads and trackers (doubleclick.net resolved to 0.0.0.0 in the 2026-11-09 test)",
    privacyUrl: "https://adguard-dns.io/en/privacy.html",
    verifyUrl: "https://adguard.com/en/test.html",
    verifyNote:
      "The AdGuard test page is JavaScript-rendered. Shield does not have a verified success phrase for its HTML, so a paste cannot be marked verified.",
    jurisdiction: "ADGUARD SOFTWARE LIMITED, Limassol, Cyprus",
    bundling:
      "The public DNS EULA has no explicit clause about apps recommending the resolver (UNVERIFIED for third-party recommendation). Queries go to AdGuard, not to NXTL.",
  },
  {
    id: "adguard-family",
    name: "AdGuard Family",
    provider: "AdGuard DNS",
    dohUrl: "https://family.adguard-dns.com/dns-query",
    dotHost: "family.adguard-dns.com",
    blocks: "ads, trackers, and adult categories. The Cloudflare adult test domain is not a valid test for this profile.",
    privacyUrl: "https://adguard-dns.io/en/privacy.html",
    verifyUrl: "https://adguard.com/en/test.html",
    verifyNote: "Paste results are inconclusive. The success phrase was not verified.",
    jurisdiction: "ADGUARD SOFTWARE LIMITED, Limassol, Cyprus",
    bundling: "Same UNVERIFIED recommendation note as AdGuard Default.",
  },
  {
    id: "adguard-unfiltered",
    name: "AdGuard Unfiltered",
    provider: "AdGuard DNS",
    dohUrl: "https://unfiltered.adguard-dns.com/dns-query",
    dotHost: "unfiltered.adguard-dns.com",
    blocks: "nothing (encryption only)",
    privacyUrl: "https://adguard-dns.io/en/privacy.html",
    verifyUrl: "https://adguard.com/en/test.html",
    verifyNote: "Paste results are inconclusive. This profile does not block names.",
    jurisdiction: "ADGUARD SOFTWARE LIMITED, Limassol, Cyprus",
    bundling: "Same UNVERIFIED recommendation note as AdGuard Default.",
  },
  {
    id: "quad9",
    name: "Quad9",
    provider: "Quad9",
    dohUrl: "https://dns.quad9.net/dns-query",
    dotHost: "dns.quad9.net",
    blocks: "malware and phishing, with DNSSEC. Ads are not the point of this profile. isitblocked.org returned NXDOMAIN in the 2026-11-09 test.",
    privacyUrl: "https://quad9.net/privacy/policy/",
    verifyUrl: "https://on.quad9.net/",
    verifyNote:
      "Fetched 2026-11-09, the page title was “No, you are NOT using quad9.” The facts pack describes the title form Yes/No, you are (NOT) using quad9.",
    paste: { positive: "you are using quad9", negative: "not using quad9" },
    jurisdiction: "Quad9, Zürich, Switzerland",
    bundling: "No permission clause for third-party recommendation was found (UNVERIFIED).",
  },
  {
    id: "cloudflare-security",
    name: "Cloudflare Families malware",
    provider: "Cloudflare",
    dohUrl: "https://security.cloudflare-dns.com/dns-query",
    dotHost: "security.cloudflare-dns.com",
    blocks: "malware (1.1.1.2). malware.testcategory.com resolved to 0.0.0.0 in the 2026-11-09 test.",
    privacyUrl: "https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/",
    verifyUrl: "https://1.1.1.1/help",
    verifyNote:
      "The help page is JavaScript-rendered (“Checking…” in the HTML fetched 2026-11-09). Shield will not mark a paste verified.",
    jurisdiction: "Cloudflare, Inc. (US)",
    bundling: "No permission clause for third-party recommendation was found (UNVERIFIED).",
  },
  {
    id: "cloudflare-family",
    name: "Cloudflare Families malware and adult",
    provider: "Cloudflare",
    dohUrl: "https://family.cloudflare-dns.com/dns-query",
    dotHost: "family.cloudflare-dns.com",
    blocks: "malware and adult categories (1.1.1.3)",
    privacyUrl: "https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/",
    verifyUrl: "https://1.1.1.1/help",
    verifyNote: "Paste results are inconclusive. The help page does not distinguish 1.1.1.2 from 1.1.1.3 in the static HTML we fetched.",
    jurisdiction: "Cloudflare, Inc. (US)",
    bundling: "No permission clause for third-party recommendation was found (UNVERIFIED).",
  },
  {
    id: "mullvad-base",
    name: "Mullvad base",
    provider: "Mullvad DNS",
    dohUrl: "https://base.dns.mullvad.net/dns-query",
    dotHost: "base.dns.mullvad.net",
    blocks: "ads, trackers, and malware. doubleclick.net returned NXDOMAIN in the 2026-11-09 test. DoH/DoT only.",
    privacyUrl: "https://mullvad.net/en/help/privacy-policy",
    verifyUrl: "https://mullvad.net/en/check",
    verifyNote: "The check page needs JavaScript. A paste cannot be marked verified.",
    jurisdiction: "Mullvad AB, Gothenburg, Sweden",
    bundling: "No permission clause for third-party recommendation was found (UNVERIFIED).",
  },
  {
    id: "mullvad-adblock",
    name: "Mullvad adblock",
    provider: "Mullvad DNS",
    dohUrl: "https://adblock.dns.mullvad.net/dns-query",
    dotHost: "adblock.dns.mullvad.net",
    blocks: "ads and trackers. Malware categories are not included in this profile.",
    privacyUrl: "https://mullvad.net/en/help/privacy-policy",
    verifyUrl: "https://mullvad.net/en/check",
    verifyNote: "Paste results are inconclusive.",
    jurisdiction: "Mullvad AB, Gothenburg, Sweden",
    bundling: "No permission clause for third-party recommendation was found (UNVERIFIED).",
  },
  {
    id: "mullvad-dns",
    name: "Mullvad unfiltered",
    provider: "Mullvad DNS",
    dohUrl: "https://dns.dns.mullvad.net/dns-query",
    dotHost: "dns.dns.mullvad.net",
    blocks: "nothing (encryption only)",
    privacyUrl: "https://mullvad.net/en/help/privacy-policy",
    verifyUrl: "https://mullvad.net/en/check",
    verifyNote: "Paste results are inconclusive.",
    jurisdiction: "Mullvad AB, Gothenburg, Sweden",
    bundling: "No permission clause for third-party recommendation was found (UNVERIFIED).",
  },
  {
    id: "controld-p2",
    name: "Control D free p2",
    provider: "Control D",
    dohUrl: "https://freedns.controld.com/p2",
    dotHost: "p2.freedns.controld.com",
    blocks: "ads, tracking, and malware (doubleclick.net resolved to 0.0.0.0 in the 2026-11-09 test)",
    privacyUrl: "https://controld.com/privacy",
    verifyUrl: null,
    verifyNote:
      "https://controld.com/check returned 404 on 2026-11-09. The correct check URL is UNVERIFIED, so Shield cannot mark Control D verified.",
    jurisdiction: "Toronto, Canada",
    bundling: "No permission clause for third-party recommendation was found (UNVERIFIED).",
  },
  {
    id: "controld-p0",
    name: "Control D free p0",
    provider: "Control D",
    dohUrl: "https://freedns.controld.com/p0",
    dotHost: "p0.freedns.controld.com",
    blocks: "nothing (unfiltered free resolver)",
    privacyUrl: "https://controld.com/privacy",
    verifyUrl: null,
    verifyNote: "No verified check URL. Shield cannot mark this verified.",
    jurisdiction: "Toronto, Canada",
    bundling: "No permission clause for third-party recommendation was found (UNVERIFIED).",
  },
];

export function getResolver(id: string): Resolver | undefined {
  return RESOLVERS.find((resolver) => resolver.id === id);
}

export type DnsPasteVerdict = "verified" | "not_verified" | "inconclusive";

export function interpretDnsCheckPaste(resolverId: string, pasted: string): {
  verdict: DnsPasteVerdict;
  summary: string;
} {
  const resolver = getResolver(resolverId);
  if (!resolver) return { verdict: "inconclusive", summary: "Unknown resolver." };
  if (!resolver.paste) {
    return {
      verdict: "inconclusive",
      summary: resolver.verifyNote,
    };
  }
  const text = pasted.toLowerCase();
  if (!text.trim()) return { verdict: "inconclusive", summary: "Paste the text from the provider's check page." };
  if (text.includes(resolver.paste.negative)) {
    return {
      verdict: "not_verified",
      summary: "The pasted text says this resolver is not in use. Shield did not read the device's DNS setting itself.",
    };
  }
  if (text.includes(resolver.paste.positive)) {
    return {
      verdict: "verified",
      summary:
        "Verified only from the text you pasted, which matches Quad9's documented success wording. Shield cannot read the operating system's DNS setting. This does not prove every app uses the profile.",
    };
  }
  return {
    verdict: "inconclusive",
    summary: "The paste does not contain Quad9's yes or no wording. Shield will not mark it verified.",
  };
}
