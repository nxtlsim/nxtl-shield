import { parse } from "tldts";
import { hostMatchesAllowlist } from "../blocking";
import { LIMITS, tooBig } from "../limits";
import { redactRaw } from "../redact";
import type { CheckBase, Evidence } from "../types";
import { BRAND_DOMAINS, mixedScripts, skeletonLabel } from "./brands";
import { inspectHostLiteral, rawHostFromInput } from "./ip";

export interface Reputation {
  badware: Map<string, "all" | "doc">;
  tif: Set<string>;
  trackers: Set<string>;
  /** False when the snapshot failed to load. Heuristics still run. */
  available: boolean;
  stale: boolean;
  version: string;
  retrieved: string;
}

export interface UrlCheck extends CheckBase {
  hostname: string | null;
  registrableDomain: string | null;
  listMatch: null | {
    sourceId: "uassets-badware" | "hagezi-tif-mini";
    matchedHost: string;
    tag?: "all" | "doc";
  };
  trackerMatch: string | null;
  blockingRecommendation: "block" | "allow_allowlist" | "none" | "lists_unavailable";
}

export interface UrlCheckOptions {
  now?: Date;
  allowlist?: readonly string[];
}

const BIDI = /[\u202A-\u202E\u2066-\u2069\u200B-\u200F\uFEFF]/;

function candidates(hostname: string): string[] {
  const parsed = parse(hostname, { allowPrivateDomains: true });
  const host = (parsed.hostname ?? hostname).toLowerCase().replace(/\.$/, "");
  if (!host || host.includes("..")) return [];
  const reg = parsed.domain?.toLowerCase() ?? null;
  const labels = host.split(".");
  const out: string[] = [];
  for (let i = 0; i < labels.length - 1; i += 1) {
    const cand = labels.slice(i).join(".");
    out.push(cand);
    if (reg && cand === reg) break;
  }
  if (!out.length) out.push(host);
  return out;
}

function brandHit(hostname: string): { brand: string; registrable: string } | null {
  const parsed = parse(hostname, { allowPrivateDomains: true });
  const reg = parsed.domain?.toLowerCase();
  const host = (parsed.hostname ?? hostname).toLowerCase();
  if (!reg || !host) return null;
  const labels = host.split(".").map((label) => skeletonLabel(label).skeleton);
  for (const [brand, allowed] of Object.entries(BRAND_DOMAINS)) {
    if (allowed.includes(reg)) continue;
    if (labels.some((label) => label === brand || label.startsWith(`${brand}-`) || label.endsWith(`-${brand}`))) {
      return { brand, registrable: reg };
    }
  }
  return null;
}

function push(evidence: Evidence[], item: Evidence) {
  evidence.push(item);
}

export function checkUrl(input: string, reputation: Reputation, options: UrlCheckOptions = {}): UrlCheck {
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const scope = "URL syntax, host heuristics, and the bundled host snapshots. No request was sent to the address.";
  const base = {
    scope,
    timestamp,
    transmission: "local" as const,
    staleLists: reputation.stale,
  };
  if (typeof input !== "string" || input.trim() === "") {
    return finish(null, null, "unsupported", "Nothing to check.", [], "Enter a URL.", reputation, options, input ?? "");
  }
  if (tooBig(input, LIMITS.url)) {
    return finish(
      null,
      null,
      "unsupported",
      "This input is longer than the 8192 character limit and was not parsed.",
      [],
      "Shorten the URL and try again. Nothing was sent.",
      reputation,
      options,
      input.slice(0, 80),
    );
  }
  const trimmed = input.trim();
  const evidence: Evidence[] = [];
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return finish(
      null,
      null,
      "unsupported",
      "This text is not a URL the checker can parse.",
      [],
      "Check the scheme and host. A failed parse is not a clean result.",
      reputation,
      options,
      redactRaw(trimmed),
    );
  }

  const scheme = url.protocol.replace(":", "");
  if (scheme !== "http" && scheme !== "https") {
    push(evidence, {
      id: "scheme",
      title: "Unsupported scheme",
      detail: `The scheme “${scheme}” is not checked against reputation lists. javascript and data URLs can be dangerous in a browser. Shield did not open this.`,
      severity: scheme === "javascript" || scheme === "data" || scheme === "vbscript" ? "indicator" : "info",
    });
    const verdict = evidence.some((item) => item.severity === "indicator") ? "suspicious_indicators" : "unsupported";
    return finish(url.hostname, null, verdict, "This scheme is outside http(s) reputation checks.", evidence, "No network request was made.", reputation, options, redactRaw(trimmed));
  }

  if (url.username || url.password) {
    push(evidence, {
      id: "userinfo",
      title: "Credentials in the URL",
      detail: "The URL has a username or password before the host. Browsers may send it with the request. It was redacted in this result.",
      severity: "indicator",
    });
  }
  if (BIDI.test(trimmed)) {
    push(evidence, {
      id: "bidi",
      title: "Hidden or bidirectional characters",
      detail: "The raw URL contains a bidirectional control or zero-width character. That can disguise the real host or file name.",
      severity: "indicator",
    });
  }
  const encodedCount = trimmed.match(/%[0-9a-f]{2}/gi)?.length ?? 0;
  if (/%00/i.test(trimmed) || /%0d|%0a/i.test(trimmed) || /%25[0-9a-f]{2}/i.test(trimmed) || encodedCount > 40) {
    push(evidence, {
      id: "encoding",
      title: "Suspicious encoding",
      detail: "The URL contains a null byte, a line break, double-encoding, or a very high number of percent-escapes.",
      severity: "indicator",
    });
  }
  if (scheme === "http") {
    push(evidence, {
      id: "http",
      title: "Not HTTPS",
      detail: "The scheme is http. That is not by itself a phishing verdict. Traffic on this URL is not protected by HTTPS.",
      severity: "info",
    });
  }

  const rawHost = rawHostFromInput(trimmed) ?? url.hostname;
  const ip = inspectHostLiteral(rawHost, url.hostname);
  if (ip) {
    const special = ip.special.length ? ` Special range: ${ip.special.join(", ")}.` : "";
    push(evidence, {
      id: "ip-literal",
      title: "IP address used as the host",
      detail: `The host is an IP literal${ip.canonical ? ` (${ip.canonical})` : ""}.${ip.alternateEncoding ? " The raw host uses a non-decimal or shortened encoding." : ""} Shield did not connect to it.${special}`,
      severity: "indicator",
    });
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const parsed = parse(hostname, { allowPrivateDomains: true });
  const unicodeHost = rawHost.replace(/^\[|\]$/g, "");
  if (unicodeHost !== hostname && /[^\u0000-\u007f]/.test(unicodeHost)) {
    push(evidence, {
      id: "idn",
      title: "Internationalised domain name",
      detail: `The host was entered with non-ASCII characters and the ASCII form is ${hostname}. Look at both forms before opening it.`,
      severity: "info",
    });
  } else if (hostname.startsWith("xn--") || hostname.includes(".xn--")) {
    push(evidence, {
      id: "punycode",
      title: "Punycode host",
      detail: `The host contains punycode (${hostname}). Compare it with the name you expected to see.`,
      severity: "info",
    });
  }

  const labels = unicodeHost.split(".");
  for (const label of labels) {
    const scripts = mixedScripts(label);
    const real = scripts.filter((script) => script !== "latin");
    if (scripts.includes("latin") && real.length) {
      push(evidence, {
        id: "mixed-script",
        title: "Mixed-script host label",
        detail: `The label “${label}” mixes Latin with ${real.join(" and ")}. That is a common lookalike pattern.`,
        severity: "indicator",
      });
      break;
    }
  }
  const skeletonHost = labels.map((label) => skeletonLabel(label).skeleton).join(".");
  const skeletonChanged = labels.some((label) => skeletonLabel(label).changed);
  const brand = brandHit(hostname) ?? (skeletonChanged ? brandHit(skeletonHost) : null);
  if (brand) {
    push(evidence, {
      id: "misleading-host",
      title: "Brand-like name outside that brand's domain",
      detail: `A label looks like “${brand.brand}”, but the registrable domain is ${brand.registrable}. The small allowed-domain list for that name does not include it. This is a heuristic, not proof of phishing.${skeletonChanged ? " Confusable characters were folded before this comparison." : ""}`,
      severity: "indicator",
    });
  }

  let listMatch: UrlCheck["listMatch"] = null;
  let trackerMatch: string | null = null;
  if (reputation.available && hostname && !ip) {
    for (const cand of candidates(hostname)) {
      const tag = reputation.badware.get(cand);
      if (tag && !listMatch) {
        listMatch = { sourceId: "uassets-badware", matchedHost: cand, tag };
      }
      if (reputation.tif.has(cand) && !listMatch) {
        listMatch = { sourceId: "hagezi-tif-mini", matchedHost: cand };
      } else if (reputation.tif.has(cand) && listMatch?.sourceId !== "hagezi-tif-mini") {
        /* keep the first match; TIF is recorded if it is the only one */
      }
      if (!trackerMatch && reputation.trackers.has(cand)) trackerMatch = cand;
    }
    // If both badware and TIF match, prefer reporting TIF as the malicious-list match when badware is only $doc.
    for (const cand of candidates(hostname)) {
      if (reputation.tif.has(cand)) {
        listMatch = { sourceId: "hagezi-tif-mini", matchedHost: cand };
        break;
      }
    }
    if (!listMatch) {
      for (const cand of candidates(hostname)) {
        const tag = reputation.badware.get(cand);
        if (tag) {
          listMatch = { sourceId: "uassets-badware", matchedHost: cand, tag };
          break;
        }
      }
    }
  }

  if (listMatch?.sourceId === "hagezi-tif-mini") {
    push(evidence, {
      id: "list-tif",
      title: "Threat-list match",
      detail: `${listMatch.matchedHost} matched a bundled threat host list (retrieved ${reputation.retrieved}, version ${reputation.version}). This is a list match, not a courtroom finding.`,
      severity: "match",
      source: {
        name: "Bundled threat hosts",
        retrieved: reputation.retrieved,
        licence: "GPL-3.0",
      },
    });
  } else if (listMatch?.sourceId === "uassets-badware") {
    push(evidence, {
      id: "list-badware",
      title: "Badware-risk list match",
      detail: `${listMatch.matchedHost} matched a bundled badware-risk host list (${listMatch.tag === "doc" ? "document-level rule" : "host rule"}). Retrieved ${reputation.retrieved}.`,
      severity: "match",
      source: {
        name: "Bundled badware hosts",
        retrieved: reputation.retrieved,
        licence: "GPL-3.0",
      },
    });
  }
  if (trackerMatch) {
    push(evidence, {
      id: "tracker-host",
      title: "Tracker-host list",
      detail: `${trackerMatch} is on the partial EasyPrivacy-derived tracker host list used by the optional extension ruleset. That is not a malware judgement and does not by itself change the verdict.`,
      severity: "info",
      source: {
        name: "EasyPrivacy token-filtered hosts",
        retrieved: reputation.retrieved,
        licence: "GPL-3.0-or-later AND CC-BY-SA-3.0",
      },
    });
  }
  if (!reputation.available) {
    push(evidence, {
      id: "lists-unavailable",
      title: "Reputation lists unavailable",
      detail: "The bundled snapshot failed to load or failed its integrity check. No list match can be claimed. The last good snapshot was not replaced.",
      severity: "info",
    });
  }

  const allowlisted = hostname ? hostMatchesAllowlist(hostname, options.allowlist ?? []) : false;
  let verdict: UrlCheck["verdict"] = "no_known_match";
  let summary = "No known match in the bundled snapshots, and no suspicious indicator was found.";
  if (listMatch) {
    verdict = "known_malicious_match";
    summary =
      listMatch.sourceId === "hagezi-tif-mini"
        ? "Known list match on the bundled threat-intelligence snapshot."
        : "Known list match on the bundled badware-risk snapshot.";
  } else if (evidence.some((item) => item.severity === "indicator")) {
    verdict = "suspicious_indicators";
    summary = "Suspicious indicators were found. This is not proof of fraud, and it is not a clean result.";
  } else if (!reputation.available) {
    verdict = "inconclusive";
    summary = "Inconclusive: reputation lists were unavailable, and no heuristic indicator fired.";
  }

  let uncertainty = "A short or new address can be dangerous with no indicator. A list miss is not a promise that the page is safe.";
  if (reputation.stale) {
    uncertainty += " The bundled list snapshot may be outdated and is not auto-updated.";
  }
  if (allowlisted && listMatch) {
    uncertainty += " This host is also on the supplied allowlist. An extension following that allowlist would not block it. The list match is still shown.";
  }

  const blockingRecommendation: UrlCheck["blockingRecommendation"] = !reputation.available
    ? "lists_unavailable"
    : listMatch
      ? allowlisted
        ? "allow_allowlist"
        : "block"
      : "none";

  return {
    ...base,
    verdict,
    summary,
    evidence,
    inputRedacted: redactRaw(trimmed),
    uncertainty,
    hostname: hostname || null,
    registrableDomain: parsed.domain ?? null,
    listMatch,
    trackerMatch,
    blockingRecommendation,
    staleLists: reputation.stale,
  };
}

function finish(
  hostname: string | null,
  registrableDomain: string | null,
  verdict: UrlCheck["verdict"],
  summary: string,
  evidence: Evidence[],
  uncertainty: string,
  reputation: Reputation,
  options: UrlCheckOptions,
  redacted: string,
): UrlCheck {
  const now = options.now ?? new Date();
  return {
    verdict,
    summary,
    evidence,
    scope: "URL syntax, host heuristics, and the bundled host snapshots. No request was sent to the address.",
    timestamp: now.toISOString(),
    inputRedacted: redacted,
    uncertainty,
    transmission: "local",
    staleLists: reputation.stale,
    hostname,
    registrableDomain,
    listMatch: null,
    trackerMatch: null,
    blockingRecommendation: reputation.available ? "none" : "lists_unavailable",
  };
}
