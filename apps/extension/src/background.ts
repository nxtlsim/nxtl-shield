import { originException } from "../../../packages/core/src/origin";

const RULESETS = ["threats", "trackers", "cleaning"] as const;
type ToggleKey = "blocking" | "trackers" | "cleaning" | "cosmetic";

interface PausedSite {
  host: string;
  until: number;
}

interface Stored {
  blocking: boolean;
  trackers: boolean;
  cleaning: boolean;
  cosmetic: boolean;
  pausedSites: PausedSite[];
  allowlist: string[];
  locationManaged: boolean;
  locationExceptions: { origin: string; pattern: string; setting: "ask" | "allow" }[];
}

const DEFAULTS: Stored = {
  blocking: true,
  trackers: true,
  cleaning: true,
  cosmetic: true,
  pausedSites: [],
  allowlist: [],
  locationManaged: false,
  locationExceptions: [],
};

const lastMain = new Map<number, string>();
let initPromise: Promise<void> | null = null;

type ContentSettingApi = {
  get: (details: { primaryUrl: string }) => Promise<{ setting: string }>;
  set: (details: { primaryPattern: string; setting: string; scope?: string }) => Promise<void>;
  clear: (details: { scope?: string }) => Promise<void>;
};

function locationApi(): ContentSettingApi | null {
  const settings = (globalThis as unknown as { chrome?: { contentSettings?: Record<string, ContentSettingApi> } }).chrome
    ?.contentSettings;
  // Chromium builds expose either .geolocation (documented) or .location.
  return settings?.geolocation ?? settings?.location ?? null;
}

async function stored(): Promise<Stored> {
  const saved = await chrome.storage.local.get(null);
  return {
    ...DEFAULTS,
    ...saved,
    allowlist: saved.allowlist ?? [],
    locationExceptions: saved.locationExceptions ?? [],
    pausedSites: saved.pausedSites ?? [],
  };
}

async function save(partial: Partial<Stored>) {
  await chrome.storage.local.set(partial);
}

async function expirePausedSites(state: Stored): Promise<{ state: Stored; expired: boolean }> {
  const now = Date.now();
  const active = (state.pausedSites || []).filter((s) => s.until > now);
  const expired = active.length !== (state.pausedSites || []).length;
  if (expired) {
    state = { ...state, pausedSites: active };
    await save({ pausedSites: active });
  }
  return { state, expired };
}

async function syncPausedRules(pausedSites: PausedSite[]) {
  const existing: { id: number }[] = await chrome.declarativeNetRequest.getSessionRules();
  const removeRuleIds = existing.filter((rule) => rule.id >= 8000 && rule.id < 9000).map((rule) => rule.id);
  const addRules: any[] = [];
  pausedSites.slice(0, 50).forEach((site, index) => {
    addRules.push({
      id: 8000 + index * 2,
      priority: 60,
      action: { type: "allow" as const },
      condition: {
        requestDomains: [site.host],
        resourceTypes: ["main_frame", "sub_frame", "script", "xmlhttprequest", "image", "media", "font", "stylesheet", "ping", "websocket", "other", "object"],
      },
    });
    addRules.push({
      id: 8000 + index * 2 + 1,
      priority: 60,
      action: { type: "allow" as const },
      condition: {
        initiatorDomains: [site.host],
        resourceTypes: ["sub_frame", "script", "xmlhttprequest", "image", "media", "font", "stylesheet", "ping", "websocket", "other", "object"],
      },
    });
  });
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds, addRules });
}

async function applyRulesets() {
  const state = await stored();
  const enable: string[] = [];
  if (state.blocking) enable.push("threats");
  if (state.trackers) enable.push("trackers");
  if (state.cleaning) enable.push("cleaning");
  const current: string[] = await chrome.declarativeNetRequest.getEnabledRulesets();
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enable.filter((id: string) => !current.includes(id)),
    disableRulesetIds: current.filter((id: string) => (RULESETS as readonly string[]).includes(id) && !enable.includes(id)),
  });
  return { state };
}

async function syncAllowlist(hosts: string[]) {
  const existing: { id: number }[] = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.filter((rule) => rule.id >= 1000 && rule.id < 5000).map((rule) => rule.id);
  const addRules = hosts.slice(0, 400).map((host, index) => ({
    id: 1000 + index,
    priority: 20,
    action: { type: "allow" as const },
    condition: {
      requestDomains: [host],
      resourceTypes: ["main_frame", "sub_frame", "script", "xmlhttprequest", "image", "media", "font", "stylesheet", "ping", "websocket", "other", "object"],
    },
  }));
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

async function readLocation(exceptions: Stored["locationExceptions"]) {
  const api = locationApi();
  if (!api) return { supported: false, setting: "unsupported", exceptions: [] as { origin: string; setting: string }[] };
  const main = await api.get({ primaryUrl: "https://example.com/" });
  const read: { origin: string; setting: string }[] = [];
  for (const item of exceptions) {
    const value = await api.get({ primaryUrl: item.origin + "/" });
    read.push({ origin: item.origin, setting: value.setting });
  }
  return { supported: true, setting: main.setting, exceptions: read };
}

async function status(forHost?: string | null) {
  if (initPromise) await initPromise;
  let state = await stored();
  const { state: activeState } = await expirePausedSites(state);
  state = activeState;
  await syncPausedRules(state.pausedSites || []);

  const pausedList = state.pausedSites || [];
  const matchedPause = forHost
    ? pausedList.find((p) => p.host === forHost)
    : pausedList[0];

  const rulesets = await chrome.declarativeNetRequest.getEnabledRulesets();
  const location = await readLocation(state.locationExceptions);

  return {
    browser: locationApi() ? "chromium" : "firefox",
    blockingEnabled: rulesets.includes("threats"),
    trackersEnabled: rulesets.includes("trackers"),
    cleaningEnabled: rulesets.includes("cleaning"),
    cosmeticEnabled: state.cosmetic,
    desired: {
      blocking: state.blocking,
      trackers: state.trackers,
      cleaning: state.cleaning,
    },
    paused: Boolean(matchedPause),
    pausedHost: matchedPause?.host || null,
    pauseUntil: matchedPause?.until || null,
    pausedSites: pausedList,
    allowlist: state.allowlist,
    locationSupported: location.supported,
    locationSetting: location.setting,
    locationManaged: state.locationManaged,
    locationExceptions: location.exceptions,
    rulesets,
  };
}

async function setToggle(key: ToggleKey, enabled: boolean) {
  if (initPromise) await initPromise;
  await save({ [key]: enabled });
  if (key !== "cosmetic") await applyRulesets();
  return status();
}

async function pause(input?: string, durationMs = 5 * 60 * 1000) {
  const host = hostFrom(input || "") || "blocked.nxtl-shield-test.invalid";
  const until = Date.now() + Math.max(1000, durationMs);
  let state = await stored();
  const others = (state.pausedSites || []).filter((s) => s.host !== host && s.until > Date.now());
  const updated: PausedSite[] = [...others, { host, until }];
  await save({ pausedSites: updated });
  await syncPausedRules(updated);
  await chrome.alarms.create(`nxtl-pause-${host}`, { when: until });
  return status(host);
}

async function resume(input?: string) {
  const host = input ? hostFrom(input) : null;
  let state = await stored();
  const updated = host
    ? (state.pausedSites || []).filter((s) => s.host !== host)
    : [];
  await save({ pausedSites: updated });
  await syncPausedRules(updated);
  if (host) {
    await chrome.alarms.clear(`nxtl-pause-${host}`);
  } else {
    const alarms = await chrome.alarms.getAll();
    for (const a of alarms) {
      if (a.name.startsWith("nxtl-pause")) await chrome.alarms.clear(a.name);
    }
  }
  return status(host);
}

function hostFrom(input: string): string | null {
  try {
    return new URL(input).hostname.toLowerCase();
  } catch {
    return /^[a-z0-9.-]+$/i.test(input) ? input.toLowerCase() : null;
  }
}

async function allowAdd(input: string) {
  const host = hostFrom(input);
  if (!host) return status();
  const state = await stored();
  const allowlist = state.allowlist.includes(host) ? state.allowlist : [...state.allowlist, host];
  await save({ allowlist });
  await syncAllowlist(allowlist);
  return status();
}

async function allowRemove(input: string) {
  const host = hostFrom(input);
  const state = await stored();
  const allowlist = state.allowlist.filter((item) => item !== host);
  await save({ allowlist });
  await syncAllowlist(allowlist);
  return status();
}

async function locationBlock() {
  const api = locationApi();
  if (!api) return status();
  const state = await stored();
  await api.clear({ scope: "regular" });
  await api.set({ primaryPattern: "<all_urls>", setting: "block", scope: "regular" });
  for (const item of state.locationExceptions) {
    await api.set({ primaryPattern: item.pattern, setting: item.setting, scope: "regular" });
  }
  await save({ locationManaged: true });
  return status();
}

async function locationException(url: string, setting: "ask" | "allow") {
  const parsed = originException(url);
  if (!parsed.ok || !parsed.origin || !parsed.pattern) return { ...(await status()), originError: parsed.error, originNotes: parsed.notes };
  const api = locationApi();
  if (!api) return status();
  const state = await stored();
  const locationExceptions = state.locationExceptions.filter((item) => item.origin !== parsed.origin);
  locationExceptions.push({ origin: parsed.origin, pattern: parsed.pattern, setting });
  await save({ locationExceptions, locationManaged: true });
  if (!state.locationManaged) {
    await api.clear({ scope: "regular" });
    await api.set({ primaryPattern: "<all_urls>", setting: "block", scope: "regular" });
  }
  await api.set({ primaryPattern: parsed.pattern, setting, scope: "regular" });
  const result = await status();
  return { ...result, originNotes: parsed.notes, originPattern: parsed.pattern };
}

async function locationRestore() {
  const api = locationApi();
  if (api) await api.clear({ scope: "regular" });
  await save({ locationManaged: false, locationExceptions: [] });
  return status();
}

async function onMessage(
  message: { type?: string; key?: ToggleKey; enabled?: boolean; durationMs?: number; url?: string; setting?: "ask" | "allow"; input?: string },
  sender: { tab?: { id?: number } },
) {
  switch (message.type) {
    case "getStatus": {
      const host = message.url ? hostFrom(message.url) : null;
      return status(host);
    }
    case "setToggle":
      if (!message.key) return status();
      return setToggle(message.key, Boolean(message.enabled));
    case "pause": {
      const host = message.url ? hostFrom(message.url) : null;
      return pause(host || undefined, Number(message.durationMs) || 5 * 60 * 1000);
    }
    case "resume": {
      const host = message.url ? hostFrom(message.url) : null;
      return resume(host || undefined);
    }
    case "allowAdd":
      return allowAdd(String(message.input || message.url || ""));
    case "allowRemove":
      return allowRemove(String(message.input || message.url || ""));
    case "locationBlock":
      return locationBlock();
    case "locationException":
      return locationException(String(message.url || ""), message.setting === "allow" ? "allow" : "ask");
    case "locationRestore":
      return locationRestore();
    case "getPending":
      return { url: sender.tab?.id !== undefined ? lastMain.get(sender.tab.id) ?? null : null };
    case "proceedOnce": {
      const target = String(message.url || "");
      const host = hostFrom(target);
      if (!host || sender.tab?.id === undefined) return { ok: false };
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [9000],
        addRules: [
          {
            id: 9000,
            priority: 30,
            action: { type: "allow" },
            condition: {
              requestDomains: [host],
              resourceTypes: ["main_frame", "sub_frame", "script", "xmlhttprequest", "image", "stylesheet", "font", "media", "other"],
            },
          },
        ],
      });
      await chrome.tabs.update(sender.tab.id, { url: target });
      return { ok: true };
    }
    case "allowAndOpen": {
      await allowAdd(String(message.url || ""));
      if (sender.tab?.id !== undefined && message.url) await chrome.tabs.update(sender.tab.id, { url: String(message.url) });
      return status();
    }
    case "createPrivateMessage": {
      try {
        const resp = await fetch("https://nxtl-shield-relay.dagys-mantas.workers.dev/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ciphertext: (message as any).ciphertext,
            ttl: (message as any).ttl || 86400,
            password: Boolean((message as any).password),
          }),
        });
        if (!resp.ok) return { ok: false, status: resp.status };
        const data = (await resp.json()) as { id: string };
        return { ok: true, id: data.id };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    }
    default:
      return status();
  }
}

chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  onMessage(message, sender).then(sendResponse);
  return true;
});

chrome.runtime.onMessageExternal?.addListener((message: any, sender: any, sendResponse: any) => {
  onMessage(message, sender).then(sendResponse);
  return true;
});

chrome.webRequest.onBeforeRequest.addListener(
  (details: { type: string; tabId: number; url: string }) => {
    if (details.type !== "main_frame" || details.tabId < 0) return;
    if (details.url.startsWith(chrome.runtime.getURL(""))) return;
    lastMain.set(details.tabId, details.url);
  },
  { urls: ["<all_urls>"] },
);

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[m][n];
}

const GENUINE_DOMAINS = [
  "nxtlsim.com",
  "paypal.com",
  "apple.com",
  "google.com",
  "microsoft.com",
  "amazon.com",
  "netflix.com",
  "facebook.com",
  "instagram.com",
];

function findLookalike(host: string): string | null {
  const clean = host.toLowerCase().replace(/:\d+$/, "");
  for (const genuine of GENUINE_DOMAINS) {
    if (clean === genuine || clean.endsWith("." + genuine)) return null;
    const genuineBase = genuine.split(".")[0];
    const hostBase = clean.split(".")[0];

    // 1. Homoglyphs & confusable substitutions (e.g. 1 -> i or l, 0 -> o, vv -> w)
    const foldedI = hostBase.replace(/1/g, "i").replace(/0/g, "o").replace(/vv/g, "w");
    const foldedL = hostBase.replace(/1/g, "l").replace(/0/g, "o");
    if (foldedI === genuineBase || foldedL === genuineBase) return genuine;

    // 2. Levenshtein edit distance <= 1 for bases >= 5 chars
    const dist = levenshtein(hostBase, genuineBase);
    if (genuineBase.length >= 5 && dist === 1) return genuine;
  }
  return null;
}

chrome.webNavigation.onBeforeNavigate?.addListener(async (details: { frameId: number; tabId: number; url: string }) => {
  if (details.frameId !== 0) return;
  const host = hostFrom(details.url);
  if (!host) return;

  const sessionRules = await chrome.declarativeNetRequest.getSessionRules();
  if (sessionRules.some((r: any) => r.id === 9000 && r.condition?.requestDomains?.includes(host))) {
    return;
  }

  const genuine = findLookalike(host);
  if (genuine) {
    const warningUrl = chrome.runtime.getURL(
      `warning.html?url=${encodeURIComponent(details.url)}&lookalike=1&genuine=${encodeURIComponent(genuine)}`,
    );
    await chrome.tabs.update(details.tabId, { url: warningUrl });
  }
});

function setupContextMenu() {
  if (typeof chrome.contextMenus !== "undefined" && chrome.contextMenus.create) {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "check-link",
        title: "Check this link with Shield",
        contexts: ["link"],
      });
    });
  }
}

chrome.contextMenus?.onClicked.addListener((info: { menuItemId: string; linkUrl?: string }) => {
  if (info.menuItemId === "check-link" && info.linkUrl) {
    chrome.tabs.create({
      url: `https://nxtlsim.github.io/nxtl-shield/#/check?url=${encodeURIComponent(info.linkUrl)}`,
    });
  }
});

chrome.webNavigation.onCompleted.addListener(async (details: { frameId: number }) => {
  if (details.frameId !== 0) return;
  const rules: { id: number }[] = await chrome.declarativeNetRequest.getSessionRules();
  if (rules.some((rule) => rule.id === 9000)) {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [9000] });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm: { name: string }) => {
  if (alarm.name.startsWith("nxtl-pause")) {
    const state = await stored();
    const { state: updated } = await expirePausedSites(state);
    await syncPausedRules(updated.pausedSites || []);
  }
});

async function initDefaults() {
  const current = await chrome.storage.local.get(null);
  const toSet: Partial<Stored> = {};
  if (current.blocking === undefined) toSet.blocking = true;
  if (current.trackers === undefined) toSet.trackers = true;
  if (current.cleaning === undefined) toSet.cleaning = true;
  if (current.cosmetic === undefined) toSet.cosmetic = true;
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }
  await applyRulesets();
  const state = await stored();
  await syncAllowlist(state.allowlist);
  setupContextMenu();
}
initPromise = initDefaults();

chrome.runtime.onInstalled.addListener(async () => {
  if (initPromise) await initPromise;
});

const testApi = {
  enableBlocking: () => setToggle("blocking", true),
  setToggle: (key: ToggleKey, enabled: boolean) => setToggle(key, enabled),
  pauseFor: (ms: number, host = "blocked.nxtl-shield-test.invalid") => pause(host, ms),
  resume: (host?: string) => resume(host),
  status: (host?: string) => status(host),
  allow: (host: string) => allowAdd(host),
  disallow: (host: string) => allowRemove(host),
  locationBlock,
  locationException,
  locationRestore,
  findLookalike,
};
(globalThis as unknown as { nxtlTest: typeof testApi }).nxtlTest = testApi;
