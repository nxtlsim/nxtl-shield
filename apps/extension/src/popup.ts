async function refresh() {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    const engine = document.querySelector("#engine");
    if (engine) engine.textContent = "Rulesets on: Threat blocking, Tracker domains, URL cleaning.";
    for (const key of ["blocking", "trackers", "cleaning", "cosmetic"]) {
      const input = document.querySelector(`#${key}`) as HTMLInputElement | null;
      if (input) input.checked = key !== "cosmetic";
    }
    const loc = document.querySelector("#location");
    if (loc) loc.textContent = "Location setting: managed by Shield.";
    return;
  }
  const status = await chrome.runtime.sendMessage({ type: "getStatus" });
  const engine = document.querySelector("#engine");
  const pauseBtn = document.querySelector<HTMLElement>("#pause");
  const resumeBtn = document.querySelector<HTMLElement>("#resume");

  if (engine) {
    if (status.paused) {
      engine.textContent = `Protection paused until ${status.pauseUntil ? new Date(status.pauseUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "5 minutes"}`;
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
  await chrome.runtime.sendMessage({ type: "pause", durationMs: 5 * 60 * 1000 });
  await refresh();
});
document.querySelector("#resume")?.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "resume" });
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
