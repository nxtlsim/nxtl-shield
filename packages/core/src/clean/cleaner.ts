import clearurlsJson from "../../data/clearurls.json";
import { LIMITS, tooBig } from "../limits";

export interface CleanResult {
  ok: boolean;
  changed: boolean;
  preserved: boolean;
  reason: string;
  original: string;
  cleaned: string;
  removed: string[];
  skippedRules: number;
  timestamp: string;
  transmission: "local";
  scope: string;
}

interface Provider {
  urlPattern: string;
  rules?: string[];
  rawRules?: string[];
  exceptions?: string[];
  referralMarketing?: string[];
}

const DATA = clearurlsJson as { providers: Record<string, Provider> };

/** Names removed on ordinary http(s) URLs. Not applied when the URL is preserved. */
export const GLOBAL_TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_name",
  "utm_cid",
  "utm_reader",
  "utm_referrer",
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "twclid",
  "ttclid",
  "igshid",
  "igsh",
  "mc_cid",
  "mc_eid",
  "_hsenc",
  "_hsmi",
  "mkt_tok",
  "vero_id",
  "vero_conv",
  "oly_anon_id",
  "oly_enc_id",
  "_ga",
  "_gl",
  "yclid",
  "rb_clickid",
  "irclickid",
  "li_fat_id",
] as const;

const GLOBAL = new Set<string>(GLOBAL_TRACKING_PARAMS.map((name) => name.toLowerCase()));

const PRESERVE_HOSTS = new Set([
  "checkout.stripe.com",
  "pay.google.com",
  "paypal.com",
  "www.paypal.com",
  "accounts.google.com",
  "login.microsoftonline.com",
  "login.live.com",
]);

const PROBES = [
  "id",
  "q",
  "v",
  "t",
  "s",
  "k",
  "key",
  "code",
  "state",
  "file",
  "url",
  "next",
  "redirect",
  "token",
  "sig",
  "signature",
  "session",
  "email",
  "password",
  "search",
  "type",
  "name",
  "value",
  "data",
  "path",
  "continue",
  "login",
  "user",
  "order",
  "item",
  "sku",
  "qty",
  "amount",
  "currency",
  "ref",
  "tag",
];

function sensitiveParam(name: string): boolean {
  const n = name.toLowerCase();
  if (n.startsWith("x-amz-")) return true;
  if (/^(sig|signature|token|password|secret|jwt|credential)$/.test(n)) return true;
  if (/(^|_)(sig|signature|token|password|secret|jwt|credential)($|_)/.test(n)) return true;
  if (n === "payment_intent" || n === "payment_intent_client_secret") return true;
  if (n === "access_token" || n === "id_token" || n === "refresh_token") return true;
  return false;
}

export function preservationReason(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (PRESERVE_HOSTS.has(host)) {
    return `Host ${host} is treated as a sign-in or payment host, so the URL was not modified.`;
  }
  if (host.endsWith(".stripe.com") && /\/(pay|checkout)(\/|$)/.test(url.pathname)) {
    return "Stripe payment path: the URL was not modified.";
  }
  const names = [...url.searchParams.keys()];
  if (names.some((name) => sensitiveParam(name))) {
    return "A signature, token, password, or payment parameter is present, so the whole URL was left unchanged.";
  }
  const lower = new Set(names.map((name) => name.toLowerCase()));
  if (lower.has("code") && lower.has("state")) {
    return "The query has both code and state, so this was treated as an OAuth return URL and left unchanged.";
  }
  const segments = url.pathname.split("/").filter(Boolean).map((part) => part.toLowerCase());
  if (segments.some((part) => part === "oauth" || part === "authorize")) {
    return "The path looks like an OAuth endpoint, so the URL was not modified.";
  }
  return null;
}

function compileRule(rule: string): RegExp | null {
  if (rule.length < 2 || rule.length > 80) return null;
  const body = rule.startsWith("^") || rule.endsWith("$") ? rule : `^(?:${rule})$`;
  try {
    const re = new RegExp(body, "i");
    if (PROBES.some((probe) => re.test(probe))) return null;
    return re;
  } catch {
    return null;
  }
}

let cachedRules: { pattern: RegExp; exceptions: RegExp[]; names: RegExp[] }[] | null = null;

function providerRules() {
  if (cachedRules) return cachedRules;
  const compiled: { pattern: RegExp; exceptions: RegExp[]; names: RegExp[] }[] = [];
  for (const provider of Object.values(DATA.providers)) {
    if (!provider.urlPattern) continue;
    let pattern: RegExp;
    try {
      pattern = new RegExp(provider.urlPattern, "i");
    } catch {
      continue;
    }
    const exceptions: RegExp[] = [];
    for (const exception of provider.exceptions ?? []) {
      try {
        exceptions.push(new RegExp(exception, "i"));
      } catch {
        /* skip invalid upstream exception */
      }
    }
    const names: RegExp[] = [];
    for (const rule of provider.rules ?? []) {
      const re = compileRule(rule);
      if (re) names.push(re);
    }
    if (names.length) compiled.push({ pattern, exceptions, names });
  }
  cachedRules = compiled;
  return compiled;
}

export function cleanUrl(input: string, now = new Date()): CleanResult {
  const scope =
    "Local removal of a conservative tracking-parameter list, plus ClearURLs provider rules that do not match functional parameter names. Path rewriting is not applied. Signed, auth, and payment URLs are left unchanged.";
  const base = {
    timestamp: now.toISOString(),
    transmission: "local" as const,
    scope,
    original: input,
  };
  if (typeof input !== "string" || !input.trim()) {
    return { ...base, ok: false, changed: false, preserved: false, reason: "Nothing to clean.", cleaned: "", removed: [], skippedRules: 0 };
  }
  if (tooBig(input, LIMITS.url)) {
    return {
      ...base,
      ok: false,
      changed: false,
      preserved: true,
      reason: "The URL is longer than 8192 characters and was not modified.",
      cleaned: input.slice(0, 200),
      removed: [],
      skippedRules: 0,
    };
  }
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ...base, ok: false, changed: false, preserved: true, reason: "This text is not a URL, so it was not modified.", cleaned: trimmed, removed: [], skippedRules: 0, original: trimmed };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ...base, ok: false, changed: false, preserved: true, reason: "Only http and https URLs are cleaned.", cleaned: trimmed, removed: [], skippedRules: 0, original: trimmed };
  }
  if (url.username || url.password) {
    return {
      ...base,
      ok: true,
      changed: false,
      preserved: true,
      reason: "The URL contains a username or password and was not modified.",
      cleaned: trimmed,
      removed: [],
      skippedRules: 0,
      original: trimmed,
    };
  }
  const preserve = preservationReason(url);
  if (preserve) {
    return { ...base, ok: true, changed: false, preserved: true, reason: preserve, cleaned: trimmed, removed: [], skippedRules: 0, original: trimmed };
  }

  const href = url.toString();
  const extra: RegExp[] = [];
  let skippedRules = 0;
  for (const provider of providerRules()) {
    if (!provider.pattern.test(href)) continue;
    if (provider.exceptions.some((exception) => exception.test(href))) {
      skippedRules += 1;
      continue;
    }
    extra.push(...provider.names);
  }
  const remove = new Set<string>();
  for (const key of url.searchParams.keys()) {
    const lower = key.toLowerCase();
    if (sensitiveParam(key)) continue;
    if (GLOBAL.has(lower) || extra.some((re) => re.test(key))) remove.add(key);
  }
  if (remove.size === 0) {
    return {
      ...base,
      ok: true,
      changed: false,
      preserved: false,
      reason: "No conservative tracking parameters were found.",
      cleaned: trimmed,
      removed: [],
      skippedRules,
      original: trimmed,
    };
  }
  for (const key of remove) url.searchParams.delete(key);
  return {
    ...base,
    ok: true,
    changed: true,
    preserved: false,
    reason: `Removed ${remove.size} tracking parameter${remove.size === 1 ? "" : "s"}.`,
    cleaned: url.toString(),
    removed: [...remove],
    skippedRules,
    original: trimmed,
  };
}

/** Parameter names the extension may strip. Signature-like names are absent on purpose. */
export function extensionCleaningParams(): string[] {
  return [...GLOBAL_TRACKING_PARAMS];
}
