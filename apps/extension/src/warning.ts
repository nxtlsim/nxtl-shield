const TEST = "blocked.nxtl-shield-test.invalid";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

async function main() {
  const fromHash = decodeURIComponent(location.hash.replace(/^#/, ""));
  const pending = fromHash.startsWith("http") ? { url: fromHash } : await chrome.runtime.sendMessage({ type: "getPending" });
  const url = pending?.url as string | undefined;
  const title = document.querySelector("#title");
  const why = document.querySelector("#why");
  const code = document.querySelector("#url");
  if (!url) {
    const missing = document.querySelector<HTMLElement>("#missing");
    if (missing) missing.hidden = false;
    const once = document.querySelector<HTMLButtonElement>("#once");
    if (once) once.disabled = true;
    return;
  }
  if (code) code.textContent = url;
  const host = hostOf(url);
  if (host === TEST || host.endsWith(`.${TEST}`)) {
    if (title) title.textContent = "NXTL Shield test rule";
    if (why) why.textContent = `${TEST} is a synthetic name used to test this extension.`;
  } else if (why) {
    why.textContent = "This address is on a known dangerous list. Going there could put your details or this device at risk.";
  }
  document.querySelector("#back")?.addEventListener("click", () => history.length > 1 ? history.back() : window.close());
  document.querySelector("#once")?.addEventListener("click", () => chrome.runtime.sendMessage({ type: "proceedOnce", url }));
}

void main();
