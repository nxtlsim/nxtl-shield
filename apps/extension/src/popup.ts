import { probeDns } from "../../../packages/core/src/connection/probe";
import { checkUrl, type Reputation } from "../../../packages/core/src/url/check";
import { checkText } from "../../../packages/core/src/text/check";

const RELAY_ORIGIN = "https://nxtl-shield-relay.dagys-mantas.workers.dev";

let cachedReputation: Reputation | null = null;

async function getReputation(): Promise<Reputation> {
  if (cachedReputation) return cachedReputation;
  const badware = new Map<string, "all" | "doc">();
  const tif = new Set<string>();
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    try {
      const res = await fetch(chrome.runtime.getURL("rules/threats.json"));
      if (res.ok) {
        const rules = await res.json();
        for (const r of rules) {
          const filter: string = r.condition?.urlFilter || "";
          const m = filter.match(/^\|\|([^/^]+)\^?$/);
          if (m) {
            badware.set(m[1].toLowerCase(), "all");
          }
        }
      }
    } catch {
      // local rule parse fallback
    }
  }
  cachedReputation = {
    badware,
    tif,
    trackers: new Set(),
    available: true,
    stale: false,
    version: "0.5.0",
    retrieved: "2026-11-09",
  };
  return cachedReputation;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getActiveTab(): Promise<{ url?: string; id?: number } | null> {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) return null;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  } catch {
    return null;
  }
}

function getHostFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return u.hostname.toLowerCase();
    }
  } catch {}
  return null;
}

async function refresh() {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    const engine = document.querySelector("#engine");
    if (engine) engine.textContent = "Shield status is not available here.";
    for (const key of ["blocking", "trackers", "cleaning", "cosmetic"]) {
      const input = document.querySelector(`#${key}`) as HTMLInputElement | null;
      if (input) input.checked = false;
    }
    const loc = document.querySelector("#location");
    if (loc) loc.textContent = "Location blocking is not available here.";
    return;
  }
  const tab = await getActiveTab();
  const host = getHostFromUrl(tab?.url);
  const status = await chrome.runtime.sendMessage({ type: "getStatus", url: host || undefined });
  const engine = document.querySelector("#engine");
  const pauseBtn = document.querySelector<HTMLElement>("#pause");
  const resumeBtn = document.querySelector<HTMLElement>("#resume");

  if (engine) {
    if (status.paused) {
      const timeStr = status.pauseUntil
        ? new Date(status.pauseUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "5 minutes";
      engine.textContent = `Paused on this site until ${timeStr}`;
    } else {
      const anyOn = status.blockingEnabled || status.trackersEnabled || status.cleaningEnabled;
      engine.textContent = anyOn ? "Shield is on in this browser." : "Shield is off in this browser.";
    }
  }

  if (pauseBtn && resumeBtn) {
    pauseBtn.hidden = Boolean(status.paused);
    resumeBtn.hidden = !status.paused;
  }

  for (const key of ["blocking", "trackers", "cleaning", "cosmetic"] as const) {
    const input = document.querySelector(`#${key}`) as HTMLInputElement | null;
    if (!input) continue;
    const enabled =
      key === "cosmetic" ? status.cosmeticEnabled : key === "blocking" ? status.blockingEnabled : key === "trackers" ? status.trackersEnabled : status.cleaningEnabled;
    input.checked = Boolean(enabled);
    input.onchange = async () => {
      const next = await chrome.runtime.sendMessage({ type: "setToggle", key, enabled: input.checked });
      input.checked = key === "cosmetic" ? next.cosmeticEnabled : key === "blocking" ? next.blockingEnabled : key === "trackers" ? next.trackersEnabled : next.cleaningEnabled;
      const anyOn = next.blockingEnabled || next.trackersEnabled || next.cleaningEnabled;
      if (engine && !next.paused) {
        engine.textContent = anyOn ? "Shield is on in this browser." : "Shield is off in this browser.";
      }
    };
  }

  const location = document.querySelector("#location");
  if (location) {
    location.textContent = status.locationSupported
      ? `Location permission is set to ${status.locationSetting}.`
      : "Location blocking is not available here.";
  }
}

async function checkSafeDns() {
  const dot = document.querySelector("#dns-dot");
  const text = document.querySelector("#dns-text");
  const setupBtn = document.querySelector<HTMLElement>("#dns-setup-btn");
  try {
    const res = await probeDns({ timeoutMs: 4000 });
    if (dot && text) {
      dot.className = "badge-dot";
      if (res.status === "on") {
        dot.classList.add("on");
        text.textContent = "On";
        if (setupBtn) setupBtn.hidden = true;
      } else if (res.status === "off") {
        dot.classList.add("off");
        text.textContent = "Off";
        if (setupBtn) setupBtn.hidden = false;
      } else {
        dot.classList.add("warn");
        text.textContent = "Could not check";
        if (setupBtn) setupBtn.hidden = false;
      }
    }
  } catch {
    if (dot && text) {
      dot.className = "badge-dot warn";
      text.textContent = "Could not check";
      if (setupBtn) setupBtn.hidden = false;
    }
  }
}

async function runQuickCheck() {
  const input = document.querySelector<HTMLInputElement>("#quick-check-input");
  const resultBox = document.querySelector<HTMLElement>("#quick-check-result");
  const dot = document.querySelector("#check-dot");
  const badgeText = document.querySelector("#check-badge-text");
  const summaryText = document.querySelector("#check-summary-text");
  if (!input || !resultBox || !dot || !badgeText || !summaryText) return;

  const raw = input.value.trim();
  if (!raw) return;

  const rep = await getReputation();
  const isLikelyUrl = /^(https?:\/\/|[a-z0-9.-]+\.[a-z]{2,})/i.test(raw) && !raw.includes(" ");
  const normalizedUrl = isLikelyUrl ? (raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`) : "";

  const checkRes = isLikelyUrl ? checkUrl(normalizedUrl, rep) : checkText(raw, rep);

  let level: "scam" | "careful" | "safe" = "safe";
  if (checkRes.verdict === "known_malicious_match") {
    level = "scam";
  } else if (checkRes.verdict === "suspicious_indicators") {
    const isStrong = checkRes.evidence.some(
      (e) =>
        e.id &&
        ([
          "prize",
          "parcel-fee",
          "tax-refund",
          "crypto-scam",
          "credential-ask",
          "family-impersonation",
          "urgency-link",
          "misleading-host",
          "userinfo",
        ].includes(e.id) ||
          e.id.startsWith("brand-lookalike")),
    );
    level = isStrong ? "scam" : "careful";
  } else if (checkRes.verdict === "no_known_match") {
    level = "safe";
  } else {
    level = "careful";
  }

  const pillLabel = level === "scam" ? "Likely scam" : level === "careful" ? "Be careful" : "Looks safe";
  const variant = level === "scam" ? "danger" : level === "careful" ? "warning" : "ok";

  resultBox.className = `result-banner ${variant}`;
  dot.className = `badge-dot ${level === "scam" ? "danger" : level === "careful" ? "warn" : "on"}`;
  badgeText.textContent = pillLabel;
  summaryText.textContent = checkRes.summary;
  resultBox.hidden = false;
}

async function runPrivateMsg() {
  const input = document.querySelector<HTMLTextAreaElement>("#private-msg-input");
  const btn = document.querySelector<HTMLButtonElement>("#private-msg-btn");
  const resultBox = document.querySelector<HTMLElement>("#private-msg-result");
  const linkInput = document.querySelector<HTMLInputElement>("#private-msg-link");
  const copyStatus = document.querySelector<HTMLElement>("#copy-status");
  if (!input || !btn || !resultBox || !linkInput) return;

  const rawText = input.value.trim();
  if (!rawText) return;

  btn.disabled = true;
  btn.textContent = "Creating link...";
  if (copyStatus) copyStatus.hidden = true;

  try {
    const enc = new TextEncoder();
    const rawMsgKey = crypto.getRandomValues(new Uint8Array(32));
    const msgKey = await crypto.subtle.importKey("raw", rawMsgKey, "AES-GCM", false, ["encrypt"]);
    const msgIv = crypto.getRandomValues(new Uint8Array(12));
    const innerCipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: msgIv }, msgKey, enc.encode(rawText));

    const blob = new Uint8Array(12 + innerCipher.byteLength);
    blob.set(msgIv, 0);
    blob.set(new Uint8Array(innerCipher), 12);
    const ciphertextB64 = toBase64(blob);
    const fragmentParams = `k=${toBase64Url(rawMsgKey)}`;

    let messageId: string | null = null;

    // Try via background first
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      try {
        const bgRes = await chrome.runtime.sendMessage({
          type: "createPrivateMessage",
          ciphertext: ciphertextB64,
          ttl: 86400,
          password: false,
        });
        if (bgRes?.ok && bgRes.id) {
          messageId = bgRes.id;
        }
      } catch {}
    }

    // Direct fetch fallback if background didn't return id
    if (!messageId) {
      const resp = await fetch(`${RELAY_ORIGIN}/v1/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext: ciphertextB64,
          ttl: 86400,
          password: false,
        }),
      });
      if (!resp.ok) {
        throw new Error("Could not reach the message service.");
      }
      const data = (await resp.json()) as { id: string };
      messageId = data.id;
    }

    const linkUrl = `https://nxtlsim.github.io/nxtl-shield/#/messages/open/${messageId}&${fragmentParams}`;
    linkInput.value = linkUrl;
    resultBox.hidden = false;
  } catch (err) {
    alert(err instanceof Error ? err.message : "Could not create private link.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create a private link";
  }
}

document.querySelector("#pause")?.addEventListener("click", async () => {
  const tab = await getActiveTab();
  const host = getHostFromUrl(tab?.url);
  if (!host) {
    const engine = document.querySelector("#engine");
    if (engine) engine.textContent = "Open a website to pause Shield there.";
    return;
  }
  await chrome.runtime.sendMessage({ type: "pause", url: host, durationMs: 5 * 60 * 1000 });
  await refresh();
});

document.querySelector("#resume")?.addEventListener("click", async () => {
  const tab = await getActiveTab();
  const host = getHostFromUrl(tab?.url);
  await chrome.runtime.sendMessage({ type: "resume", url: host || undefined });
  await refresh();
});

document.querySelector("#quick-check-btn")?.addEventListener("click", () => {
  void runQuickCheck();
});

document.querySelector("#quick-check-input")?.addEventListener("keydown", (e: Event) => {
  if ((e as KeyboardEvent).key === "Enter") {
    e.preventDefault();
    void runQuickCheck();
  }
});

document.querySelector("#private-msg-btn")?.addEventListener("click", () => {
  void runPrivateMsg();
});

document.querySelector("#copy-msg-btn")?.addEventListener("click", async () => {
  const linkInput = document.querySelector<HTMLInputElement>("#private-msg-link");
  const copyStatus = document.querySelector<HTMLElement>("#copy-status");
  if (!linkInput) return;
  try {
    await navigator.clipboard.writeText(linkInput.value);
    if (copyStatus) copyStatus.hidden = false;
  } catch {
    linkInput.select();
  }
});

document.querySelector("#open-shield")?.addEventListener("click", () => {
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.create({ url: "https://nxtlsim.github.io/nxtl-shield/" });
  } else {
    window.open("https://nxtlsim.github.io/nxtl-shield/", "_blank");
  }
});

void refresh();
void checkSafeDns();
