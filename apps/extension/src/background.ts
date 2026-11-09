import { originException } from "../../../packages/core/src/origin";

const RULESETS = ["threats", "trackers", "cleaning"] as const;
type ToggleKey = "blocking" | "trackers" | "cleaning" | "cosmetic";

interface Stored {
  blocking: boolean;
  trackers: boolean;
  cleaning: boolean;
  cosmetic: boolean;
  pauseUntil: number | null;
  allowlist: string[];
  locationManaged: boolean;
  locationExceptions: { origin: string; pattern: string; setting: "ask" | "allow" }[];
}

const DEFAULTS: Stored = {
  blocking: false,
  trackers: false,
  cleaning: false,
  cosmetic: false,
  pauseUntil: null,
  allowlist: [],
  locationManaged: false,
  locationExceptions: [],
};

const lastMain = new Map<number, string>();

function locationApi() {
  const settings = (globalThis as unknown as { chrome?: typeof chrome }).chrome?.contentSettings;
  return settings?.geolocation ?? null;
}

async function stored(): Promise<Stored> {
  const saved = await chrome.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...saved, allowlist: saved.allowlist ?? [], locationExceptions: saved.locationExceptions ?? [] };
}

async function save(partial: Partial<Stored>) {
  await chrome.storage.local.set(partial);
}

async function expirePause(state: Stored): Promise<Stored> {
  if (state.pauseUntil && Date.now() >= state.pauseUntil) {
    state = { ...state, pauseUntil: null };
    await save({ pauseUntil: null });
    await chrome.alarms.clear("nxtl-pause");
  }
  return state;
}

async function applyRulesets() {
  let state = await expirePause(await stored());
  const paused = Boolean(state.pauseUntil && Date.now() < state.pauseUntil);
  const enable: string[] = [];
  if (!paused && state.blocking) enable.push("threats");
  if (!paused && state.trackers) enable.push("trackers");
  if (!paused && state.cleaning) enable.push("cleaning");
  const current: string[] = await chrome.declarativeNetRequest.getEnabledRulesets();
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enable.filter((id: string) => !current.includes(id)),
    disableRulesetIds: current.filter((id: string) => (RULESETS as readonly string[]).includes(id) && !enable.includes(id)),
  });
  return { state, paused };
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

async function status() {
  const applied = await applyRulesets();
  const rulesets = await chrome.declarativeNetRequest.getEnabledRulesets();
  const location = await readLocation(applied.state.locationExceptions);
  return {
    browser: locationApi() ? "chromium" : "firefox",
    blockingEnabled: rulesets.includes("threats"),
    trackersEnabled: rulesets.includes("trackers"),
    cleaningEnabled: rulesets.includes("cleaning"),
    cosmeticEnabled: applied.state.cosmetic,
    desired: {
      blocking: applied.state.blocking,
      trackers: applied.state.trackers,
      cleaning: applied.state.cleaning,
    },
    paused: applied.paused,
    pauseUntil: applied.state.pauseUntil,
    allowlist: applied.state.allowlist,
    locationSupported: location.supported,
    locationSetting: location.setting,
    locationManaged: applied.state.locationManaged,
    locationExceptions: location.exceptions,
    rulesets,
  };
}

async function setToggle(key: ToggleKey, enabled: boolean) {
  const state = await expirePause(await stored());
  if (state.pauseUntil && enabled && key !== "cosmetic") {
    return status();
  }
  await save({ [key]: enabled });
  if (key !== "cosmetic") await applyRulesets();
  return status();
}

async function pause(durationMs: number) {
  const until = Date.now() + Math.max(1000, durationMs);
  await save({ pauseUntil: until });
  await chrome.alarms.create("nxtl-pause", { when: until });
  await applyRulesets();
  return status();
}

async function resume() {
  await save({ pauseUntil: null });
  await chrome.alarms.clear("nxtl-pause");
  await applyRulesets();
  return status();
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
    case "getStatus":
      return status();
    case "setToggle":
      if (!message.key) return status();
      return setToggle(message.key, Boolean(message.enabled));
    case "pause":
      return pause(Number(message.durationMs) || 5 * 60 * 1000);
    case "resume":
      return resume();
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

chrome.webNavigation.onCompleted.addListener(async (details: { frameId: number }) => {
  if (details.frameId !== 0) return;
  const rules: { id: number }[] = await chrome.declarativeNetRequest.getSessionRules();
  if (rules.some((rule) => rule.id === 9000)) {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [9000] });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm: { name: string }) => {
  if (alarm.name === "nxtl-pause") await applyRulesets();
});

chrome.runtime.onInstalled.addListener(async () => {
  await applyRulesets();
  const state = await stored();
  await syncAllowlist(state.allowlist);
});

const testApi = {
  enableBlocking: () => setToggle("blocking", true),
  pauseFor: (ms: number) => pause(ms),
  resume,
  status,
  allow: (host: string) => allowAdd(host),
  locationBlock,
  locationException,
  locationRestore,
};
(globalThis as unknown as { nxtlTest: typeof testApi }).nxtlTest = testApi;
