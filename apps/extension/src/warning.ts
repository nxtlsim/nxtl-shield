const TEST = "blocked.nxtl-shield-test.invalid";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

async function main() {
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get("url") || "";
  const genuine = params.get("genuine") || "";
  const isLookalike = Boolean(genuine || params.get("lookalike"));
  const fromHash = decodeURIComponent(location.hash.replace(/^#/, ""));
  let pending: { url?: string } | undefined;
  if (fromQuery.startsWith("http")) pending = { url: fromQuery };
  else if (fromHash.startsWith("http")) pending = { url: fromHash };
  else if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    pending = await chrome.runtime.sendMessage({ type: "getPending" });
  }
  const url = pending?.url as string | undefined;
  const title = document.querySelector("#title");
  const why = document.querySelector("#why");
  const code = document.querySelector("#url");
  const back = document.querySelector<HTMLButtonElement>("#back");
  const once = document.querySelector<HTMLButtonElement>("#once");

  if (!url) {
    const missing = document.querySelector<HTMLElement>("#missing");
    if (missing) missing.hidden = false;
    if (once) once.disabled = true;
    return;
  }
  if (code) code.textContent = url;
  const host = hostOf(url);
  if (isLookalike && genuine) {
    if (title) title.textContent = `This address looks like a lookalike of ${genuine}.`;
    if (why) why.textContent = "Check the address bar before you continue.";
    if (back) back.textContent = "Back to safety";
    if (once) once.textContent = "Continue";
  } else if (host === TEST || host.endsWith(`.${TEST}`)) {
    if (title) title.textContent = "NXTL Shield test rule";
    if (why) why.textContent = `${TEST} is a synthetic name used to test this extension.`;
  } else if (why) {
    why.textContent = "This address is on a known dangerous list. Going there could put your details or this device at risk.";
  }
  back?.addEventListener("click", () => (history.length > 1 ? history.back() : window.close()));
  once?.addEventListener("click", () => chrome.runtime.sendMessage({ type: "proceedOnce", url }));
}

void main();
