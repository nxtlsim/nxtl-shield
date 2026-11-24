import { parse } from "tldts";
import { skeletonLabel } from "./brands";

const HF_SPACES = ["nxtl-shield", "trip-data-budget", "team-data-planner", "esim-compatibility-check"];

/**
 * Hosts that belong to NXTL eSIM. A host matches when it is one of these
 * names or a real subdomain of one (never a substring or prefix match).
 */
export const OFFICIAL_HOSTS: readonly string[] = [
  "nxtlsim.com",
  "nxtlsim.github.io",
  "nxtl-shield-relay.dagys-mantas.workers.dev",
  ...HF_SPACES.flatMap((space) => [`nxtl-esim-${space}.static.hf.space`, `nxtl-esim-${space}.hf.space`]),
];

export interface LookalikeTarget {
  /** The name shown to the person, e.g. "nxtlsim.com". */
  genuine: string;
  /** The label a lookalike copies, e.g. "nxtlsim". */
  base: string;
  /** Hosts that really belong to this name (exact or subdomain). */
  domains: readonly string[];
  /** Country domains such as google.de or amazon.co.uk are genuine too. */
  countryDomains?: boolean;
}

export const LOOKALIKE_TARGETS: readonly LookalikeTarget[] = [
  { genuine: "nxtlsim.com", base: "nxtlsim", domains: OFFICIAL_HOSTS },
  { genuine: "paypal.com", base: "paypal", domains: ["paypal.com", "paypal.me", "paypalobjects.com"] },
  { genuine: "apple.com", base: "apple", domains: ["apple.com", "icloud.com"] },
  {
    genuine: "google.com",
    base: "google",
    domains: ["google.com", "google-analytics.com", "googleusercontent.com", "gmail.com", "youtube.com"],
    countryDomains: true,
  },
  { genuine: "microsoft.com", base: "microsoft", domains: ["microsoft.com", "microsoftonline.com", "live.com", "office.com", "outlook.com"] },
  { genuine: "amazon.com", base: "amazon", domains: ["amazon.com", "amazon-adsystem.com", "amazonaws.com"], countryDomains: true },
  { genuine: "netflix.com", base: "netflix", domains: ["netflix.com", "netflix.net"] },
  { genuine: "facebook.com", base: "facebook", domains: ["facebook.com", "fb.com", "facebook.net"] },
  { genuine: "instagram.com", base: "instagram", domains: ["instagram.com"] },
];

function cleanHost(host: string): string {
  let h = (host ?? "").trim().toLowerCase();
  if (h.startsWith("[")) return "";
  h = h.replace(/:\d+$/, "").replace(/\.$/, "");
  return h;
}

/** Exact host or a real subdomain of one entry. Never a substring match. */
export function hostIsUnder(host: string, entries: readonly string[]): boolean {
  const h = cleanHost(host);
  if (!h) return false;
  return entries.some((raw) => {
    const entry = raw.toLowerCase().replace(/\.$/, "");
    return !!entry && (h === entry || h.endsWith(`.${entry}`));
  });
}

/** True for NXTL eSIM's own hosts, e.g. nxtlsim.com or nxtlsim.github.io. */
export function isOfficialHost(host: string): boolean {
  return hostIsUnder(host, OFFICIAL_HOSTS);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 1) return 2;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) d[i][0] = i;
  for (let j = 0; j <= n; j += 1) d[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[m][n];
}

function foldings(label: string): string[] {
  const s = skeletonLabel(label).skeleton.replace(/vv/g, "w").replace(/rn/g, "m").replace(/0/g, "o");
  return [...new Set([label, s.replace(/1/g, "i"), s.replace(/1/g, "l")])];
}

const COUNTRY_SUFFIX = /^(?:[a-z]{2}|(?:co|com)\.[a-z]{2})$/;

/**
 * Returns the genuine name a host imitates (e.g. "nxtlsim.com"), or null.
 * Only the host is compared. The path and query are never looked at.
 */
export function findLookalike(host: string): string | null {
  const clean = cleanHost(host);
  if (!clean || /^[\d.]+$/.test(clean) || clean.includes(":")) return null;
  if (isOfficialHost(clean)) return null;

  const parsed = parse(clean, { allowPrivateDomains: true });
  const main = parsed.domainWithoutSuffix?.toLowerCase();
  const suffix = parsed.publicSuffix?.toLowerCase() ?? "";
  if (!parsed.domain || !main) return null;

  for (const target of LOOKALIKE_TARGETS) {
    if (hostIsUnder(clean, target.domains)) return null;
    if (target.countryDomains && main === target.base && COUNTRY_SUFFIX.test(suffix)) return null;
  }

  const dotted = `.${clean}.`;
  for (const target of LOOKALIKE_TARGETS) {
    // A genuine name placed in front of another domain: nxtlsim.com.evil.io, nxtlsim.github.io.evil.com
    if (target.domains.some((d) => dotted.includes(`.${d.toLowerCase()}.`))) return target.genuine;

    const forms = foldings(main);
    // Swapped look-alike characters: nxt1sim, g00gle
    if (forms.includes(target.base)) return target.genuine;
    // Name plus extra words: nxtlsim-esim, paypal-login, nxtlsim-fake.github.io
    const parts = main.split("-");
    if (parts.length > 1 && parts.some((part) => foldings(part).includes(target.base))) return target.genuine;
    // One letter added, removed or changed, for longer names: nxxlsim
    if (target.base.length >= 6 && forms.some((form) => levenshtein(form, target.base) === 1)) return target.genuine;
  }
  return null;
}
