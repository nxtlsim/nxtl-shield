import { LIMITS, tooBig } from "../limits";
import { redactRaw } from "../redact";
import type { CheckBase, Evidence, Verdict } from "../types";
import { checkUrl, type Reputation } from "../url/check";

export interface TextCheck extends CheckBase {
  urlCount: number;
  urlVerdicts: Array<{ redacted: string; verdict: Verdict }>;
  level?: "scam" | "careful" | "safe";
  actionAdvice?: string;
}

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "cutt.ly", "rb.gy", "tiny.cc"];

const KNOWN_TLDS = new Set([
  "com", "org", "net", "edu", "gov", "mil", "io", "co", "uk", "de", "ca", "au",
  "fr", "lt", "eu", "me", "info", "biz", "xyz", "top", "online", "site", "app",
  "live", "vip", "help", "tech", "club", "store", "shop", "icu", "space", "click",
  "link", "cc", "nl", "se", "no", "fi", "es", "it", "pl", "ch", "at", "be", "dk",
  "cz", "ie", "nz", "za", "in", "jp", "kr", "cn", "br", "mx", "ar", "cl", "tv", "ai"
]);

export function extractUrlsAndDomains(text: string): string[] {
  const found = new Set<string>();

  // 1. Explicit http/https URLs
  const urlRe = /https?:\/\/[^\s<>"'`]+/gi;
  for (const match of text.matchAll(urlRe)) {
    let url = match[0] ?? "";
    url = url.replace(/[),.;:!]+$/g, "");
    if (url.length <= LIMITS.url) found.add(url);
    if (found.size >= 30) break;
  }

  // 2. Bare domains (e.g. delfi.lt, appleid-secure-help.com, www.example.com/login)
  const domainRe = /\b(?:www\.)?([a-z0-9][a-z0-9-]{0,62}\.)+([a-z]{2,24})(?::\d+)?(?:\/[^\s<>"'`]*)?/gi;
  for (const match of text.matchAll(domainRe)) {
    let raw = match[0] ?? "";
    raw = raw.replace(/[),.;:!]+$/g, "");
    const parts = raw.split("/")[0].split(":")[0].toLowerCase().split(".");
    const tld = parts[parts.length - 1];
    if (KNOWN_TLDS.has(tld)) {
      const full = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
      if (full.length <= LIMITS.url) found.add(full);
    }
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
          detail: `Visible host ${b.hostname} does not match href host ${a.hostname}.`,
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
  const scope = "Pasted text and extracted links checked locally. No messages or personal details were sent.";
  if (typeof input !== "string" || !input.trim()) {
    return empty("unsupported", "Nothing to check.", "Paste a message, SMS, or email.", timestamp, scope, "");
  }
  if (tooBig(input, LIMITS.text)) {
    return empty(
      "unsupported",
      "This text is longer than 100,000 characters and was not checked.",
      "Paste a shorter excerpt. Nothing was uploaded.",
      timestamp,
      scope,
      input.slice(0, 80),
    );
  }

  const text = input.trim();
  const lower = text.toLowerCase();
  const evidence: Evidence[] = [];
  const urls = extractUrlsAndDomains(text);

  const urlVerdicts = urls.map((url) => {
    const result = checkUrl(url, reputation, { now });
    return {
      redacted: result.inputRedacted,
      verdict: result.verdict,
      evidence: result.evidence,
      stale: result.staleLists,
      hostname: result.hostname,
    };
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
  let strongScamFlag = false;
  let actionAdvice = "Don't reply, don't click links, and don't send money or personal details.";

  // 1. Prize, lottery, inheritance language (Strong flag even without a URL)
  if (/\b(congratulations you(?:'ve| have)? won|you (?:have|are) (?:the )?winner|lottery|inheritance|beneficiary of (?:an? )?inheritance|claim (?:your )?prize|promising winnings|claim (?:your )?funds)\b/i.test(lower)) {
    strongScamFlag = true;
    actionAdvice = "Don't reply and don't pay. Real lotteries and inheritances never ask for fees or bank details by text.";
    evidence.push({
      id: "prize",
      title: "Promises unexpected winnings",
      detail: "It promises prize money, a lottery payout, or an inheritance you did not enter or expect.",
      severity: "indicator",
    });
  }

  // 2. Delivery / parcel release fee
  if (/\b(delivery fee|customs fee|postage fee|release fee|pay (?:the )?fee|parcel (?:is )?waiting|pay(?:ment)? of [€$£]\d|pay to (?:release|collect|get your transfer))\b/i.test(lower)) {
    strongScamFlag = true;
    actionAdvice = "Don't reply and don't pay. If expecting a delivery, check the carrier's official website or app directly.";
    evidence.push({
      id: "parcel-fee",
      title: "Delivery or release fee request",
      detail: "It asks you to pay a delivery or customs fee to release a parcel or package.",
      severity: "indicator",
    });
  }

  // 3. Tax refund / government money
  if (/\b(tax refund|due a (?:tax )?refund|hmrc|irs|claim refund|claim your tax|claim money)\b/i.test(lower)) {
    strongScamFlag = true;
    actionAdvice = "Don't reply and don't click. Tax agencies never notify about refunds or demand payment via text message.";
    evidence.push({
      id: "tax-refund",
      title: "Government or tax refund lure",
      detail: "It claims you are due a tax refund or government payment.",
      severity: "indicator",
    });
  }

  // 4. Crypto / wire / wallet pressure
  if (/\b(double your (?:bitcoin|crypto)|crypto wallet|seed phrase|recovery phrase|western union|wire transfer|gift cards?)\b/i.test(lower)) {
    strongScamFlag = true;
    actionAdvice = "Don't send funds. Cryptocurrency transfers and gift cards cannot be reversed once sent.";
    evidence.push({
      id: "crypto-scam",
      title: "Cryptocurrency or wire payment request",
      detail: "It asks for payment via cryptocurrency, gift cards, or wire transfer, or promises unrealistic investment returns.",
      severity: "indicator",
    });
  }

  // 5. Code / OTP requests
  const asksForSecret = /\b(password|one-time code|passcode|otp|2fa code|security code|verification code)\b/i.test(lower) &&
    /\b(send|reply|forward|share with|tell me|give me|text me|reply with)\b/i.test(lower);
  const legitOtpNotice = /\b(security code|verification code|one-time code)\b/i.test(lower) &&
    /\b(do not share|never share|don't share|keep this safe)\b/i.test(lower) &&
    !asksForSecret;

  if (asksForSecret) {
    strongScamFlag = true;
    actionAdvice = "Don't send the code. Real banks and services never ask you to send or text back a login code.";
    evidence.push({
      id: "credential-ask",
      title: "Asks for a login code or secret",
      detail: "It asks you to send or reply with a password, security code, or one-time verification code.",
      severity: "indicator",
    });
  }

  // 6. Family impersonation ("Hi mum, new number")
  if (/\b(i(?:'m| am| got a)? (?:your )?(?:mum|mom|dad|son|daughter)|new number)\b/i.test(lower) &&
      /\b(need|send|bank details|money|code|transfer|urgent|help me|lost my phone)\b/i.test(lower)) {
    strongScamFlag = true;
    actionAdvice = "Call your family member on their known existing phone number before sending any money or codes.";
    evidence.push({
      id: "family-impersonation",
      title: "Family impersonation scam",
      detail: "It claims to be a relative with a new number asking for money, codes, or bank details.",
      severity: "indicator",
    });
  }

  // 7. Urgency language
  const urgency = /\b(account (?:suspended|locked|disabled|closed)|act now|immediately|within \d+ hours|unauthorized login|unusual activity|verify immediately)\b/i.test(lower);
  if (urgency) {
    if (hasUrl) {
      strongScamFlag = true;
      actionAdvice = "Don't open the link. Navigate to the service from your own saved bookmark or official app.";
      evidence.push({
        id: "urgency-link",
        title: "False urgency with a link",
        detail: "It claims your account is locked or has unusual activity and includes a link to click.",
        severity: "indicator",
      });
    } else {
      evidence.push({
        id: "urgency",
        title: "Urgent pressure",
        detail: "It uses urgent language to demand immediate action.",
        severity: "info",
      });
    }
  }

  // 8. Brand mention with lookalike domain
  const brandKeywords = ["apple", "icloud", "amazon", "paypal", "netflix", "microsoft", "google", "bank", "dhl", "ups", "fedex"];
  for (const b of brandKeywords) {
    if (lower.includes(b)) {
      for (const uv of urlVerdicts) {
        if (uv.hostname && !uv.hostname.endsWith(`.${b}.com`) && uv.hostname !== `${b}.com` && uv.hostname.includes(b)) {
          strongScamFlag = true;
          actionAdvice = "Don't visit this link. It looks like an unofficial domain copying a well-known brand.";
          evidence.push({
            id: `brand-lookalike-${b}`,
            title: `Impersonates ${b}`,
            detail: `The text mentions ${b}, but the link (${uv.hostname}) is not on ${b}'s official domain.`,
            severity: "indicator",
          });
        }
      }
    }
  }

  // 9. Shortened links
  for (const uv of urlVerdicts) {
    if (uv.hostname && SHORTENERS.some((s) => uv.hostname === s || uv.hostname?.endsWith(`.${s}`))) {
      evidence.push({
        id: `shortener-${uv.hostname}`,
        title: "Shortened link",
        detail: `${uv.hostname} hides the real destination address.`,
        severity: "indicator",
      });
      if (strongScamFlag) {
        actionAdvice = "Don't open shortened links from unexpected messages.";
      }
    }
  }

  // Determine final verdict and level
  const malicious = urlVerdicts.some((item) => item.verdict === "known_malicious_match");
  const indicators = evidence.some((item) => item.severity === "indicator");
  const listsDown = !reputation.available;

  let verdict: Verdict = "no_known_match";
  let summary = "No scam indicators or known dangerous links found in this message.";
  let level: "scam" | "careful" | "safe" = "safe";

  if (malicious || strongScamFlag) {
    verdict = malicious ? "known_malicious_match" : "suspicious_indicators";
    level = "scam";
    summary = malicious
      ? "Known dangerous link found in this message."
      : "Likely scam message: contains common fraud patterns.";
  } else if (indicators) {
    verdict = "suspicious_indicators";
    level = "careful";
    summary = "Be careful: contains shortened links or unusual indicators.";
    actionAdvice = "Verify the sender through a trusted channel before taking action.";
  } else if (listsDown && urls.length) {
    verdict = "inconclusive";
    level = "careful";
    summary = "Inconclusive: a link was found but threat lists were temporarily unavailable.";
    actionAdvice = "Check your connection and test the link again.";
  } else if (legitOtpNotice) {
    verdict = "no_known_match";
    level = "safe";
    summary = "Looks like a standard verification code notification.";
    actionAdvice = "Keep this code private and never share it with anyone.";
  }

  const uncertainty = level === "safe"
    ? "A brand-new trick might not be on the list yet."
    : "";

  const redactedUrls = urlVerdicts.map((item) => item.redacted).join(" ");

  return {
    verdict,
    summary,
    evidence: evidence.slice(0, 10),
    scope,
    timestamp,
    inputRedacted: redactRaw(redactedUrls || text.slice(0, 180), 400),
    uncertainty,
    transmission: "local",
    staleLists: reputation.stale,
    urlCount: urls.length,
    urlVerdicts: urlVerdicts.map(({ redacted, verdict: uv }) => ({ redacted, verdict: uv })),
    level,
    actionAdvice,
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
    level: "safe",
  };
}
