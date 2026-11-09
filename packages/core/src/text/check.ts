import { LIMITS, tooBig } from "../limits";
import { redactRaw } from "../redact";
import type { CheckBase, Evidence, Verdict } from "../types";
import { checkUrl, type Reputation } from "../url/check";

export interface TextCheck extends CheckBase {
  urlCount: number;
  urlVerdicts: Array<{ redacted: string; verdict: Verdict }>;
}

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "cutt.ly", "rb.gy", "tiny.cc"];

function extractUrls(text: string): string[] {
  const found = new Set<string>();
  const re = /https?:\/\/[^\s<>"'`]+/gi;
  for (const match of text.matchAll(re)) {
    let url = match[0] ?? "";
    url = url.replace(/[),.;]+$/g, "");
    if (url.length <= LIMITS.url) found.add(url);
    if (found.size >= 30) break;
  }
  return [...found];
}

function hrefMismatches(text: string): Evidence[] {
  const evidence: Evidence[] = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  for (const match of text.matchAll(re)) {
    const href = match[1] ?? "";
    const label = (match[2] ?? "").replace(/<[^>]+>/g, " ").trim();
    const labelUrl = label.match(/https?:\/\/[^\s]+/i)?.[0];
    if (!labelUrl) continue;
    try {
      const a = new URL(href);
      const b = new URL(labelUrl);
      if (a.hostname !== b.hostname) {
        evidence.push({
          id: "href-mismatch",
          title: "Link text points at a different host",
          detail: `Visible host ${b.hostname} does not match href host ${a.hostname}. Pasted HTML cannot prove the message was really sent by either host.`,
          severity: "indicator",
        });
      }
    } catch {
      /* ignore unparsable fragments */
    }
    if (evidence.length >= 5) break;
  }
  return evidence;
}

export function checkText(input: string, reputation: Reputation, now = new Date()): TextCheck {
  const timestamp = now.toISOString();
  const scope = "The pasted text only. URLs inside it were checked locally. The message was not sent, and its sender was not contacted.";
  if (typeof input !== "string" || !input.trim()) {
    return empty("unsupported", "Nothing to check.", "Paste a message, SMS, or email.", timestamp, scope, "");
  }
  if (tooBig(input, LIMITS.text)) {
    return empty(
      "unsupported",
      "This text is longer than 100000 characters and was not checked.",
      "Paste a shorter excerpt. Nothing was uploaded.",
      timestamp,
      scope,
      input.slice(0, 80),
    );
  }
  const text = input.trim();
  const evidence: Evidence[] = [];
  const lower = text.toLowerCase();
  const urls = extractUrls(text);
  const urlVerdicts = urls.map((url) => {
    const result = checkUrl(url, reputation, { now });
    return { redacted: result.inputRedacted, verdict: result.verdict, evidence: result.evidence, stale: result.staleLists };
  });
  for (const result of urlVerdicts) {
    for (const item of result.evidence) {
      if (item.severity === "info") continue;
      evidence.push({
        ...item,
        id: `url-${result.redacted.slice(0, 40)}-${item.id}`,
        title: `Link: ${item.title}`,
        detail: `${result.redacted} — ${item.detail}`,
      });
    }
  }
  evidence.push(...hrefMismatches(text));

  const hasUrl = urls.length > 0;
  if (/\b(password|one-time code|passcode|otp|2fa code|seed phrase|recovery phrase|mnemonic)\b/i.test(text) && /\b(send|reply|enter|confirm|verify|click|link|http|code)\b/i.test(text)) {
    evidence.push({
      id: "credential-ask",
      title: "Asks for a secret",
      detail: "The text asks for a password, one-time code, or recovery phrase together with a link or a request to send it. Do not reply with that secret. Pasted text cannot prove who wrote it.",
      severity: "indicator",
    });
  }
  if (/\b(gift cards?|wire transfer|western union|bitcoin|crypto wallet|seed phrase|bank details|pay the fee)\b/i.test(lower)) {
    evidence.push({
      id: "payment-pressure",
      title: "Payment pressure",
      detail: "The text mentions gift cards, a wire, cryptocurrency, or a fee. That is a common scam pattern. It is not proof by itself.",
      severity: "indicator",
    });
  }
  const urgency = /\b(account (suspended|locked|disabled)|act now|immediately|within \d+ hours|unauthorized login|unusual activity)\b/i.test(text);
  if (urgency) {
    evidence.push({
      id: "urgency",
      title: "Urgency language",
      detail: hasUrl
        ? "The text combines urgency with a link. Pause and open the service from your own bookmark if you want to check."
        : "The text uses urgency language. Without a link this is a weak signal, and it is not proof.",
      severity: hasUrl ? "indicator" : "info",
    });
  }
  if (/\b(you(?:'ve| have) won|lottery|inheritance|beneficiary|prize)\b/i.test(lower)) {
    evidence.push({
      id: "prize",
      title: "Prize or inheritance language",
      detail: "Unexpected prizes and inheritances are a common lure, especially next to a link or a payment request.",
      severity: hasUrl ? "indicator" : "info",
    });
  }
  for (const url of urls) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (SHORTENERS.some((short) => host === short || host.endsWith(`.${short}`))) {
        evidence.push({
          id: `shortener-${host}`,
          title: "Shortened link",
          detail: `${host} hides the destination. Shield did not expand it, because that would contact the shortener.`,
          severity: "indicator",
        });
        break;
      }
    } catch {
      /* already handled by the URL checker */
    }
  }
  const from = text.match(/^from:\s*.*@([a-z0-9.-]+)/im)?.[1]?.toLowerCase();
  const reply = text.match(/^reply-to:\s*.*@([a-z0-9.-]+)/im)?.[1]?.toLowerCase();
  if (from && reply && from !== reply) {
    evidence.push({
      id: "from-reply",
      title: "From and Reply-To domains differ",
      detail: `From domain ${from} and Reply-To domain ${reply} differ. Mailing lists do this too. Pasted headers are not authenticated.`,
      severity: "info",
    });
  }
  evidence.push({
    id: "authenticity",
    title: "Pasted text is not authentication",
    detail: "Shield cannot tell whether an email or SMS is genuine from the paste alone. There is no DKIM, SPF, or sender check.",
    severity: "info",
  });

  const malicious = urlVerdicts.some((item) => item.verdict === "known_malicious_match");
  const indicators = evidence.some((item) => item.severity === "indicator");
  const listsDown = !reputation.available;
  let verdict: Verdict = "no_known_match";
  let summary = "No known list match in the extracted links, and no suspicious indicator was found.";
  if (malicious) {
    verdict = "known_malicious_match";
    summary = "At least one extracted link matched a bundled threat or badware snapshot.";
  } else if (indicators) {
    verdict = "suspicious_indicators";
    summary = "Suspicious indicators were found in the paste. This is not proof the sender is a scammer.";
  } else if (listsDown && urls.length) {
    verdict = "inconclusive";
    summary = "Inconclusive: a link was found but reputation lists were unavailable.";
  } else if (!urls.length && !indicators) {
    summary = "No link and no suspicious indicator were found in the paste. That is not proof the message is genuine.";
  }
  let uncertainty = "Heuristics miss new scams and can flag legitimate warnings. A result is a reason to pause, not a finding of guilt.";
  if (reputation.stale) uncertainty += " Bundled lists are older than an upstream expiry hint and are not auto-updated.";
  const redactedUrls = urlVerdicts.map((item) => item.redacted).join(" ");
  return {
    verdict,
    summary,
    evidence: evidence.slice(0, 40),
    scope,
    timestamp,
    inputRedacted: redactRaw(redactedUrls || text.slice(0, 180), 400),
    uncertainty,
    transmission: "local",
    staleLists: reputation.stale,
    urlCount: urls.length,
    urlVerdicts: urlVerdicts.map(({ redacted, verdict: urlVerdict }) => ({ redacted, verdict: urlVerdict })),
  };
}

function empty(verdict: Verdict, summary: string, uncertainty: string, timestamp: string, scope: string, inputRedacted: string): TextCheck {
  return {
    verdict,
    summary,
    evidence: [],
    scope,
    timestamp,
    inputRedacted,
    uncertainty,
    transmission: "local",
    staleLists: false,
    urlCount: 0,
    urlVerdicts: [],
  };
}
