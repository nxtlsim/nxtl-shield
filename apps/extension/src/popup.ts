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
      ? `Location permission: ${status.locationSetting}.`
      : "Location blocking is not available here.";
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
document.querySelector("#open-shield")?.addEventListener("click", () => {
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.create({ url: "https://nxtlsim.github.io/nxtl-shield/" });
  } else {
    window.open("https://nxtlsim.github.io/nxtl-shield/", "_blank");
  }
});
void refresh();
