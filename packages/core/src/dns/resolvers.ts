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
    name: "Block ads, trackers & scams (recommended)",
    provider: "AdGuard DNS",
    dohUrl: "https://dns.adguard-dns.com/dns-query",
    dotHost: "dns.adguard-dns.com",
    blocks: "Blocks ads, trackers, and phishing domains.",
    privacyUrl: "https://adguard-dns.io/en/privacy.html",
    verifyUrl: "https://adguard.com/en/test.html",
    verifyNote: "Verification runs on the provider's test page.",
    jurisdiction: "Cyprus (EU)",
    bundling: "Free public encrypted DNS resolver.",
  },
  {
    id: "adguard-family",
    name: "Family: also blocks adult sites",
    provider: "AdGuard DNS",
    dohUrl: "https://family.adguard-dns.com/dns-query",
    dotHost: "family.adguard-dns.com",
    blocks: "Blocks ads, trackers, scams, and adult content.",
    privacyUrl: "https://adguard-dns.io/en/privacy.html",
    verifyUrl: "https://adguard.com/en/test.html",
    verifyNote: "Verification runs on the provider's test page.",
    jurisdiction: "Cyprus (EU)",
    bundling: "Free public encrypted DNS resolver.",
  },
  {
    id: "adguard-unfiltered",
    name: "Unfiltered: encryption only",
    provider: "AdGuard DNS",
    dohUrl: "https://unfiltered.adguard-dns.com/dns-query",
    dotHost: "unfiltered.adguard-dns.com",
    blocks: "Encryption only (no blocking).",
    privacyUrl: "https://adguard-dns.io/en/privacy.html",
    verifyUrl: "https://adguard.com/en/test.html",
    verifyNote: "Verification runs on the provider's test page.",
    jurisdiction: "Cyprus (EU)",
    bundling: "Free public encrypted DNS resolver.",
  },
  {
    id: "quad9",
    name: "Block scams & malware only",
    provider: "Quad9",
    dohUrl: "https://dns.quad9.net/dns-query",
    dotHost: "dns.quad9.net",
    blocks: "Blocks malware, phishing, and scam domains.",
    privacyUrl: "https://quad9.net/privacy/policy/",
    verifyUrl: "https://on.quad9.net/",
    verifyNote: "Verified with Quad9's confirmation service.",
    paste: { positive: "you are using quad9", negative: "not using quad9" },
    jurisdiction: "Switzerland",
    bundling: "Non-profit privacy-focused DNS resolver.",
  },
  {
    id: "cloudflare-security",
    name: "Malware protection only",
    provider: "Cloudflare",
    dohUrl: "https://security.cloudflare-dns.com/dns-query",
    dotHost: "security.cloudflare-dns.com",
    blocks: "Blocks malware and known phishing domains.",
    privacyUrl: "https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/",
    verifyUrl: "https://1.1.1.1/help",
    verifyNote: "Verification runs on the provider's test page.",
    jurisdiction: "United States",
    bundling: "Free public encrypted DNS resolver.",
  },
  {
    id: "cloudflare-family",
    name: "Family: malware & adult sites",
    provider: "Cloudflare",
    dohUrl: "https://family.cloudflare-dns.com/dns-query",
    dotHost: "family.cloudflare-dns.com",
    blocks: "Blocks malware and adult content.",
    privacyUrl: "https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/",
    verifyUrl: "https://1.1.1.1/help",
    verifyNote: "Verification runs on the provider's test page.",
    jurisdiction: "United States",
    bundling: "Free public encrypted DNS resolver.",
  },
  {
    id: "mullvad-base",
    name: "Ads, trackers & malware",
    provider: "Mullvad DNS",
    dohUrl: "https://base.dns.mullvad.net/dns-query",
    dotHost: "base.dns.mullvad.net",
    blocks: "Blocks ads, trackers, and malware.",
    privacyUrl: "https://mullvad.net/en/help/privacy-policy",
    verifyUrl: "https://mullvad.net/en/check",
    verifyNote: "Verification runs on the provider's test page.",
    jurisdiction: "Sweden (EU)",
    bundling: "Privacy-focused encrypted DNS resolver.",
  },
  {
    id: "mullvad-adblock",
    name: "Ads & trackers only",
    provider: "Mullvad DNS",
    dohUrl: "https://adblock.dns.mullvad.net/dns-query",
    dotHost: "adblock.dns.mullvad.net",
    blocks: "Blocks ads and trackers.",
    privacyUrl: "https://mullvad.net/en/help/privacy-policy",
    verifyUrl: "https://mullvad.net/en/check",
    verifyNote: "Verification runs on the provider's test page.",
    jurisdiction: "Sweden (EU)",
    bundling: "Privacy-focused encrypted DNS resolver.",
  },
  {
    id: "mullvad-dns",
    name: "Unfiltered encrypted DNS",
    provider: "Mullvad DNS",
    dohUrl: "https://dns.dns.mullvad.net/dns-query",
    dotHost: "dns.dns.mullvad.net",
    blocks: "Encryption only (no blocking).",
    privacyUrl: "https://mullvad.net/en/help/privacy-policy",
    verifyUrl: "https://mullvad.net/en/check",
    verifyNote: "Verification runs on the provider's test page.",
    jurisdiction: "Sweden (EU)",
    bundling: "Privacy-focused encrypted DNS resolver.",
  },
  {
    id: "controld-p2",
    name: "Ads, tracking & malware",
    provider: "Control D",
    dohUrl: "https://freedns.controld.com/p2",
    dotHost: "p2.freedns.controld.com",
    blocks: "Blocks ads, tracking, and malware.",
    privacyUrl: "https://controld.com/privacy",
    verifyUrl: null,
    verifyNote: "Verification runs directly on your device.",
    jurisdiction: "Canada",
    bundling: "Free encrypted DNS resolver.",
  },
  {
    id: "controld-p0",
    name: "Unfiltered standard resolver",
    provider: "Control D",
    dohUrl: "https://freedns.controld.com/p0",
    dotHost: "p0.freedns.controld.com",
    blocks: "Encryption only (no blocking).",
    privacyUrl: "https://controld.com/privacy",
    verifyUrl: null,
    verifyNote: "Verification runs directly on your device.",
    jurisdiction: "Canada",
    bundling: "Free encrypted DNS resolver.",
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
      summary: "The provider check page reports this resolver is not in use on this connection.",
    };
  }
  if (text.includes(resolver.paste.positive)) {
    return {
      verdict: "verified",
      summary: "Verified: Safe DNS is active and protecting your lookups.",
    };
  }
  return {
    verdict: "inconclusive",
    summary: "The pasted check result was inconclusive. Please ensure the full check page text was copied.",
  };
}
