async function refresh() {
  const status = await chrome.runtime.sendMessage({ type: "getStatus" });
  const engine = document.querySelector("#engine");
  if (engine) {
    engine.textContent = status.paused
      ? `Paused until ${status.pauseUntil ? new Date(status.pauseUntil).toLocaleTimeString() : "a deadline"}. Rulesets: ${status.rulesets.join(", ") || "none"}.`
      : `Rulesets on: ${status.rulesets.join(", ") || "none"}.`;
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
    };
  }
  const location = document.querySelector("#location");
  if (location) {
    location.textContent = status.locationSupported
      ? `Location setting read back: ${status.locationSetting}. Managed by Shield: ${status.locationManaged ? "yes" : "no"}.`
      : "Location control is unsupported in this browser.";
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
void refresh();
