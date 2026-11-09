import {
  CAPABILITIES,
  IP_LOOKUP,
  NXTL_LINKS,
  RESOLVERS,
  SNAPSHOT_MANIFEST,
  androidPrivateDnsSteps,
  appleRemovalSteps,
  buildMobileconfig,
  checkText,
  checkUrl,
  cleanUrl,
  chromeSecureDnsSteps,
  esimCompatibilityGuidance,
  esimSetupSteps,
  explainConnectionIssue,
  explainNxtlRouting,
  explainRates,
  firefoxDohSteps,
  generatePassphrase,
  generatePassword,
  hibpLookup,
  inspectFile,
  installInstructions,
  interpretDnsCheckPaste,
  loadReports,
  locationPrivacySetup,
  makeReport,
  passwordStrength,
  platformSupport,
  saveReports,
  clearReports,
  sourceStatus,
  windowsDohSteps,
  type ReportEntry,
} from "@nxtl/core";
import { commandExtension, queryExtension } from "./bridge";
import { field, h, resultCard } from "./dom";
import { listFailure, loadReputation } from "./lists";

function reportsAdd(entry: ReportEntry) {
  const items = loadReports(localStorage);
  items.unshift(entry);
  saveReports(localStorage, items);
}

export async function pageHome(): Promise<HTMLElement> {
  const root = h("div", { class: "grid" });
  const ext = await queryExtension();
  root.append(
    h("section", {}, [
      h("p", { class: "pill" }, ["Free, open-source security tools by NXTL eSIM"]),
      h("h1", {}, ["Check a link before you open it."]),
      h("p", { class: "lede" }, [
        "Shield runs link, message, and file checks in this browser. Continuous blocking needs the extension or a DNS profile you install yourself. NXTL eSIM is an optional paid connection. It does not unlock Shield, and it is not shown as a VPN.",
      ]),
      h("div", { class: "row" }, [
        h("a", { class: "btn primary", href: "#/check" }, ["Check a link, message or file"]),
        h("a", { class: "btn", href: "#/install", "data-testid": "install-link" }, ["Install NXTL Shield"]),
      ]),
    ]),
  );
  const can = h("section", { class: "card" }, [
    h("h2", {}, ["What you can check now"]),
    h("p", { class: "muted" }, ["These run locally without an account or a purchase."]),
    h("div", { class: "row" }, [
      link("Link", "#/check"),
      link("Message", "#/check?tab=message"),
      link("QR", "#/check?tab=qr"),
      link("File hash", "#/check?tab=file"),
      link("Clean a URL", "#/clean"),
      link("Password", "#/password"),
    ]),
  ]);
  const configured = h("section", { class: "card" }, [h("h2", {}, ["What's configured"])]);
  configured.append(
    statusLine("Extension", ext ? "Detected in this browser" : "Not detected"),
    statusLine("Threat rules", ext?.blockingEnabled ? "Enabled (read from the extension)" : ext ? "Off" : "Needs the extension"),
    statusLine("Tracker rules", ext?.trackersEnabled ? "Enabled" : "Off or not detected"),
    statusLine("URL cleaning in the extension", ext?.cleaningEnabled ? "Enabled" : "Off or not detected"),
    statusLine("Pause", ext?.paused ? `Paused until ${ext.pauseUntil ? new Date(ext.pauseUntil).toLocaleString() : "a deadline"}` : "Not paused"),
    statusLine("DNS profile", "Not verified — Shield cannot read device DNS"),
    statusLine("NXTL data line", "Connection not verified"),
  );
  const setup = h("section", { class: "card" }, [
    h("h2", {}, ["What needs setup"]),
    h("p", {}, ["Browser blocking, tracker rules, cookie-banner hiding, and location blocking need the extension, and only where that browser supports them."]),
    h("p", {}, ["Encrypted DNS needs a profile or a setting you apply. The page cannot switch it on."]),
    h("a", { href: "#/setup" }, ["Open protection setup"]),
  ]);
  const fresh = h("section", { class: "card" }, [
    h("h2", {}, ["Data freshness"]),
    h("p", { "data-testid": "snapshot-version" }, [`List snapshot ${SNAPSHOT_MANIFEST.version}, retrieved 2026-11-09.`]),
    h("p", { class: "muted" }, [
      listFailure() ??
        "HaGeZi TIF mini's upstream expiry hint is 8 hours. uAssets badware is 5 days. This copy is not auto-updated. A miss is not a promise that a site is safe.",
    ]),
    h("p", { "data-testid": "extension-status" }, [ext ? "Extension: detected" : "Extension: not detected"]),
  ]);
  const wifi = h("section", { class: "card" }, [
    h("h2", {}, ["Skip public Wi-Fi"]),
    h("p", {}, ["Connect with NXTL mobile data. Your connection uses NXTL's London internet exit. That can limit what a website learns about your travel location from your IP address alone."]),
    h("p", { class: "muted" }, ["Optional paid connectivity. Shield stays fully usable without it. This page cannot tell whether NXTL is active."]),
    h("a", { href: "#/esim" }, ["NXTL eSIM details"]),
  ]);
  const grid = h("div", { class: "grid cards" }, [can, configured, setup, fresh, wifi]);
  root.append(grid);
  return root;
}

function link(text: string, href: string) {
  return h("a", { class: "btn", href }, [text]);
}
function statusLine(name: string, value: string) {
  return h("p", {}, [h("strong", {}, [`${name}: `]), value]);
}

export async function pageCheck(tab = "link"): Promise<HTMLElement> {
  const root = h("div", { class: "grid" });
  root.append(h("h1", {}, ["Check a link, message or file"]), h("p", { class: "lede" }, ["Nothing you submit is uploaded. Reputation lists are the bundled snapshot."]));
  const tabs = h("div", { class: "tabs", role: "tablist" });
  const panel = h("div", { id: "check-panel" });
  const names = [
    ["link", "Link"],
    ["message", "Message"],
    ["file", "File"],
    ["qr", "QR"],
  ] as const;
  for (const [id, label] of names) {
    const button = h("button", { type: "button", role: "tab", "aria-selected": id === tab ? "true" : "false", "data-tab": id }, [label]);
    button.addEventListener("click", () => {
      location.hash = `#/check?tab=${id}`;
    });
    tabs.append(button);
  }
  root.append(tabs, panel);
  if (tab === "message") panel.append(messageForm());
  else if (tab === "file") panel.append(fileForm());
  else if (tab === "qr") panel.append(qrForm());
  else panel.append(linkForm());
  return root;
}

function linkForm() {
  const input = h("textarea", { "data-testid": "check-input", rows: "4" });
  input.placeholder = "https://example.com/page";
  const out = h("div");
  const button = h("button", { class: "primary", type: "button", "data-testid": "check-run" }, ["Check link"]);
  button.addEventListener("click", async () => {
    button.disabled = true;
    const rep = await loadReputation();
    const result = checkUrl(input.value, rep);
    reportsAdd(makeReport("url", result.verdict, result.inputRedacted));
    out.replaceChildren(resultCard(result));
    button.disabled = false;
  });
  return h("div", { class: "grid" }, [field("Link", input), button, out]);
}

function messageForm() {
  const input = h("textarea", { "data-testid": "check-input" });
  input.placeholder = "Paste an SMS or email. It stays in this browser.";
  const out = h("div");
  const button = h("button", { class: "primary", type: "button", "data-testid": "check-run" }, ["Check message"]);
  button.addEventListener("click", async () => {
    const rep = await loadReputation();
    const result = checkText(input.value, rep);
    reportsAdd(makeReport("text", result.verdict, result.inputRedacted));
    out.replaceChildren(resultCard(result));
  });
  return h("div", { class: "grid" }, [field("Message", input), button, out]);
}

function fileForm() {
  const input = h("input", { type: "file", "data-testid": "check-input" });
  const out = h("div");
  input.addEventListener("change", async () => {
    const file = (input as HTMLInputElement).files?.[0];
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await inspectFile(file.name, bytes.byteLength > 32 * 1024 * 1024 ? null : bytes);
    if (bytes.byteLength > 32 * 1024 * 1024) {
      result.evidence.push({
        id: "too-large",
        title: "Hash skipped",
        detail: "The file is larger than 32 MB. Only the name was checked. This is not a malware scan.",
        severity: "info",
      });
    }
    reportsAdd(makeReport("file", result.verdict, file.name));
    const card = resultCard(result);
    if (result.sha256) card.append(h("p", { class: "mono" }, [`SHA-256 ${result.sha256}`]));
    card.append(h("p", { class: "muted" }, ["Not a malware scan. The file was not uploaded."]));
    out.replaceChildren(card);
  });
  return h("div", { class: "grid" }, [field("File", input), h("p", { class: "muted" }, ["The hash and the name checks stay in this browser."]), out]);
}

function qrForm() {
  const out = h("div");
  const file = h("input", { type: "file", accept: "image/*" });
  const video = h("video", { playsinline: "true", muted: "true" }) as HTMLVideoElement;
  video.hidden = true;
  file.addEventListener("change", async () => {
    const image = (file as HTMLInputElement).files?.[0];
    if (!image) return;
    const url = URL.createObjectURL(image);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/library");
      const decoded = await new BrowserQRCodeReader().decodeFromImageUrl(url);
      await showDecoded(decoded.getText(), out);
    } catch {
      out.replaceChildren(h("p", {}, ["No QR code was found in that image. Nothing was uploaded."]));
    } finally {
      URL.revokeObjectURL(url);
    }
  });
  const camera = h("button", { type: "button" }, ["Use camera"]);
  camera.addEventListener("click", async () => {
    video.hidden = false;
    try {
      const { BrowserQRCodeReader } = await import("@zxing/library");
      const decoded = await new BrowserQRCodeReader().decodeOnceFromVideoDevice(undefined, video);
      await showDecoded(decoded.getText(), out);
    } catch {
      out.replaceChildren(h("p", {}, ["The camera did not return a code, or permission was denied."]));
    } finally {
      video.srcObject && (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      video.hidden = true;
    }
  });
  return h("div", { class: "grid" }, [field("QR image", file), camera, video, h("p", { class: "muted" }, ["The code is decoded locally and is not opened automatically."]), out]);
}

async function showDecoded(text: string, out: HTMLElement) {
  const rep = await loadReputation();
  const result = /^https?:\/\//i.test(text.trim()) ? checkUrl(text.trim(), rep) : checkText(text, rep);
  reportsAdd(makeReport("qr", result.verdict, result.inputRedacted));
  const card = resultCard(result);
  card.prepend(h("p", { class: "mono" }, [result.inputRedacted]));
  if (/^https?:\/\//i.test(text.trim())) {
    const open = h("a", { class: "btn", href: text.trim(), rel: "noreferrer", target: "_blank" }, ["Open link"]);
    card.append(h("p", { class: "muted" }, ["Opening is your choice. Shield does not navigate there on its own."]), open);
  }
  out.replaceChildren(card);
}

export function pageClean(): HTMLElement {
  const input = h("textarea", { "data-testid": "check-input" });
  const out = h("div");
  let previous = "";
  const button = h("button", { class: "primary", type: "button", "data-testid": "check-run" }, ["Clean URL"]);
  const undo = h("button", { type: "button" }, ["Undo"]);
  undo.disabled = true;
  button.addEventListener("click", () => {
    previous = input.value;
    const result = cleanUrl(input.value);
    undo.disabled = !result.changed;
    const card = h("section", { class: "card", "data-testid": "verdict" }, [
      h("h2", {}, [result.preserved ? "Left unchanged" : result.changed ? "Tracking parameters removed" : "No change"]),
      h("p", {}, [result.reason]),
      h("p", { class: "mono diff" }, [result.cleaned]),
      h("p", { class: "muted" }, [result.removed.length ? `Removed: ${result.removed.join(", ")}` : ""]),
    ]);
    const copy = h("button", { type: "button" }, ["Copy"]);
    copy.addEventListener("click", () => navigator.clipboard.writeText(result.cleaned).catch(() => undefined));
    card.append(copy);
    out.replaceChildren(card);
    input.value = result.cleaned;
  });
  undo.addEventListener("click", () => {
    input.value = previous;
    undo.disabled = true;
  });
  return h("div", { class: "grid" }, [
    h("h1", {}, ["Clean a URL"]),
    h("p", { class: "lede" }, ["Conservative parameter removal. Signed, login, and payment URLs are kept as you pasted them. Nothing is sent."]),
    field("URL", input),
    h("div", { class: "row" }, [button, undo]),
    out,
  ]);
}

export function pagePassword(): HTMLElement {
  const length = h("input", { type: "text", value: "20" });
  const symbols = h("input", { type: "checkbox" });
  const out = h("div");
  const generated = h("p", { class: "mono", "data-testid": "verdict" }, ["Generate a password. It is not saved."]);
  const make = h("button", { class: "primary", type: "button" }, ["Generate password"]);
  const phrase = h("button", { type: "button" }, ["Generate passphrase"]);
  const check = h("button", { type: "button" }, ["Check pwned range"]);
  let current = "";
  make.addEventListener("click", () => {
    try {
      const value = generatePassword({ length: Number(length.value), symbols: (symbols as HTMLInputElement).checked });
      current = value.password;
      generated.textContent = value.password;
      out.replaceChildren(h("p", {}, [value.note]), h("p", {}, [passwordStrength(value.password).note + ` Score ${passwordStrength(value.password).score} of 4.`]));
    } catch (error) {
      generated.textContent = error instanceof Error ? error.message : "Could not generate.";
    }
  });
  phrase.addEventListener("click", () => {
    const value = generatePassphrase(6);
    current = value.passphrase;
    generated.textContent = value.passphrase;
    out.replaceChildren(h("p", {}, [value.note]));
  });
  check.addEventListener("click", async () => {
    if (!current) return;
    const result = await hibpLookup(current);
    out.replaceChildren(h("p", {}, [result.summary]), h("p", { class: "muted" }, [result.scope]), h("p", { class: "mono" }, [result.requestUrl]));
    current = "";
    generated.textContent = "Cleared from the page after the check.";
  });
  const copy = h("button", { type: "button" }, ["Copy"]);
  copy.addEventListener("click", () => {
    if (generated.textContent) navigator.clipboard.writeText(generated.textContent).catch(() => undefined);
  });
  return h("div", { class: "grid" }, [
    h("h1", {}, ["Password tools"]),
    h("p", { class: "lede" }, ["Generated in this browser with Web Crypto. Passwords are not stored and are not sent unless you run the optional range check."]),
    field("Length (12–64)", length),
    h("label", { class: "row" }, [symbols, " Include symbols"]),
    h("div", { class: "row" }, [make, phrase, copy, check]),
    generated,
    out,
    h("p", { class: "muted" }, ["The range check sends only the first five characters of the SHA-1 hash to api.pwnedpasswords.com, with Add-Padding. It is not an email breach search."]),
  ]);
}

export async function pageConnection(): Promise<HTMLElement> {
  const out = h("div");
  const ipButton = h("button", { type: "button", class: "primary" }, ["Look up public IP"]);
  const rtcButton = h("button", { type: "button" }, ["Count WebRTC candidates"]);
  const wifi = h("select", {}, [option("unknown", "I have not said"), option("yes", "I am on public Wi-Fi"), option("no", "I am not on public Wi-Fi")]);
  let publicIp: string | null = null;
  let ipLookup: "not_run" | "ran" | "failed" = "not_run";
  let hostCount: number | null = null;
  let srflx: number | null = null;
  function render() {
    const explanation = explainConnectionIssue({
      online: navigator.onLine,
      userAgent: navigator.userAgent,
      effectiveType: (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType ?? null,
      publicIp,
      ipLookup,
      webrtcHostCandidates: hostCount,
      webrtcServerReflexive: srflx,
      reportedPublicWifi: (wifi as HTMLSelectElement).value as "yes" | "no" | "unknown",
    });
    out.replaceChildren(
      h("section", { class: "card" }, [
        h("h2", {}, [explanation.summary]),
        ...explanation.points.map((point) => h("p", {}, [point])),
        h("p", {}, [h("a", { href: explanation.links.connectionCheck }, ["Open the NXTL travel connection check"])]),
      ]),
    );
  }
  ipButton.addEventListener("click", async () => {
    try {
      const response = await fetch(IP_LOOKUP.url);
      const body = (await response.json()) as { ip?: string };
      publicIp = body.ip ?? null;
      ipLookup = publicIp ? "ran" : "failed";
    } catch {
      ipLookup = "failed";
      publicIp = null;
    }
    render();
  });
  rtcButton.addEventListener("click", async () => {
    hostCount = 0;
    srflx = 0;
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel("shield");
    pc.onicecandidate = (event) => {
      const candidate = event.candidate?.candidate ?? "";
      if (candidate.includes(" typ host ")) hostCount = (hostCount ?? 0) + 1;
      if (candidate.includes(" typ srflx ")) srflx = (srflx ?? 0) + 1;
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    pc.close();
    render();
  });
  wifi.addEventListener("change", render);
  const root = h("div", { class: "grid" }, [
    h("h1", {}, ["Connection Doctor"]),
    h("p", { class: "lede" }, [IP_LOOKUP.disclosure]),
    h("p", { class: "muted" }, ["Browser: ", navigator.userAgent]),
    h("div", { class: "row" }, [ipButton, rtcButton]),
    field("Public Wi-Fi, as you report it", wifi),
    out,
  ]);
  render();
  return root;
}

export function pageLocation(): HTMLElement {
  const os = h("select", {}, [option("chrome", "This Chromium browser"), option("firefox", "Firefox"), option("ios", "iPhone or iPad"), option("android", "Android")]);
  const out = h("div");
  const perm = h("p", {}, ["Website permission for Shield: not requested."]);
  if (navigator.permissions?.query) {
    navigator.permissions.query({ name: "geolocation" }).then(
      (status) => {
        perm.textContent = `This site's Location permission is “${status.state}”. Shield does not call the location API.`;
      },
      () => {
        perm.textContent = "The Permissions API did not return a geolocation status.";
      },
    );
  }
  function render() {
    const guide = locationPrivacySetup((os as HTMLSelectElement).value);
    out.replaceChildren(
      h("section", { class: "card" }, [
        h("h2", {}, [guide.os]),
        h("p", {}, [guide.websitePermission]),
        h("p", {}, [guide.nativePermission]),
        h("p", {}, [guide.ipLocation]),
        ...guide.steps.map((step) => h("p", {}, [step])),
        ...guide.limits.map((step) => h("p", { class: "muted" }, [step])),
      ]),
    );
  }
  os.addEventListener("change", render);
  render();
  return h("div", { class: "grid" }, [h("h1", {}, ["Location privacy"]), perm, field("Show steps for", os), out]);
}

export function pageEsim(): HTMLElement {
  const routing = explainNxtlRouting();
  const compat = esimCompatibilityGuidance();
  const setup = esimSetupSteps();
  const country = h("input", { type: "text", value: "Lithuania" });
  const rates = h("div");
  const button = h("button", { class: "primary", type: "button" }, ["Look up rates"]);
  button.addEventListener("click", async () => {
    try {
      const response = await fetch(NXTL_LINKS.pricingApi, { credentials: "omit" });
      if (!response.ok) throw new Error(String(response.status));
      const payload = await response.json();
      const result = explainRates(country.value, payload, new Date().toISOString());
      rates.replaceChildren(
        h("section", { class: "card", "data-testid": "verdict" }, [
          h("h2", {}, [result.status === "ok" ? `${result.country}` : result.status.replaceAll("_", " ")]),
          h("p", {}, [
            result.status === "ok"
              ? `${result.minEurPerGb}–${result.maxEurPerGb} EUR per GB. Display strings from this response: ${result.minDisplay ?? "n/a"} – ${result.maxDisplay ?? "n/a"}.`
              : result.note,
          ]),
          h("p", { class: "muted" }, [`Retrieved ${result.retrievedAt}. Source ${result.sourceUrl}. ${result.note}`]),
        ]),
      );
    } catch {
      const result = explainRates(country.value, null, new Date().toISOString(), "The pricing endpoint could not be read.");
      rates.replaceChildren(h("p", {}, [result.note]));
    }
  });
  return h("div", { class: "grid" }, [
    h("h1", {}, ["NXTL eSIM"]),
    h("p", { class: "lede" }, [routing.summary]),
    h("section", { class: "card" }, [h("h2", {}, ["London exit"]), ...routing.points.map((point) => h("p", {}, [point])), h("p", {}, [h("a", { href: routing.sourceUrl }, ["NXTL routing page"])])]),
    h("section", { class: "card" }, [
      h("h2", {}, ["Already have NXTL?"]),
      ...setup.alreadyHave.map((step) => h("p", {}, [step])),
      h("p", {}, [setup.apn]),
      ...setup.platforms.map((item) => h("p", {}, [`${item.os}: ${item.steps}`])),
      h("p", { class: "muted" }, [setup.cannotVerify]),
      h("a", { href: NXTL_LINKS.account }, ["My Account"]),
    ]),
    h("section", { class: "card" }, [
      h("h2", {}, ["Compatibility"]),
      h("p", {}, [compat.summary]),
      h("p", { class: "muted" }, [compat.uncertainty]),
      h("p", {}, [compat.iphoneLockCheck]),
      h("a", { href: compat.links.checker }, ["Open the compatibility checker"]),
    ]),
    h("section", { class: "card" }, [
      h("h2", {}, ["Coverage and rates"]),
      h("p", { class: "muted" }, ["Live EUR per GB from the public pricing API. Optional. Buying data does not change Shield."]),
      field("Country name", country),
      button,
      rates,
      h("a", { href: NXTL_LINKS.tripBudget }, ["Open the trip data budget"]),
    ]),
  ]);
}

export async function pageSetup(): Promise<HTMLElement> {
  const ext = await queryExtension();
  const root = h("div", { class: "grid" }, [h("h1", {}, ["Protection setup"])]);
  const engine = h("section", { class: "card" }, [h("h2", {}, ["This browser"])]);
  if (!ext) {
    engine.append(
      h("p", { "data-testid": "extension-status" }, ["Extension: not detected."]),
      h("p", {}, ["There is no on/off switch here, because this page cannot see an engine. Load the extension from a release zip, then come back."]),
      h("p", { class: "muted" }, ["Chrome, Edge, and other Chromium browsers: chrome://extensions → Developer mode → Load unpacked → the chromium folder. Firefox needs a signed XPI for a normal release install. The unsigned build can be temporary-loaded for development."]),
    );
  } else {
    engine.append(h("p", { "data-testid": "extension-status" }, ["Extension: detected. Switches below read the rulesets back after each change."]));
    engine.append(toggle("Threat blocking", ext.blockingEnabled, "blocking"));
    engine.append(toggle("Tracker domains", ext.trackersEnabled, "trackers"));
    engine.append(toggle("URL cleaning", ext.cleaningEnabled, "cleaning"));
    engine.append(toggle("Hide cookie banners (does not reject consent)", ext.cosmeticEnabled, "cosmetic"));
    const pause = h("button", { type: "button" }, ["Pause blocking and cleaning for 5 minutes"]);
    pause.addEventListener("click", async () => {
      await commandExtension("pause", { durationMs: 5 * 60 * 1000 });
      location.reload();
    });
    const resume = h("button", { type: "button" }, ["Resume"]);
    resume.addEventListener("click", async () => {
      await commandExtension("resume");
      location.reload();
    });
    engine.append(h("p", {}, [ext.paused ? "Paused." : "Not paused. Pause does not change location settings or DNS."]), h("div", { class: "row" }, [pause, resume]));
    if (ext.locationSupported) {
      engine.append(h("h3", {}, ["Location in this browser"]));
      engine.append(h("p", {}, [`Engine setting for a normal https site: ${ext.locationSetting}. Managed by Shield: ${ext.locationManaged ? "yes" : "no"}.`]));
      const block = h("button", { type: "button" }, ["Block location by default"]);
      block.addEventListener("click", async () => {
        await commandExtension("locationBlock");
        location.reload();
      });
      const restore = h("button", { type: "button" }, ["Restore location settings"]);
      restore.addEventListener("click", async () => {
        await commandExtension("locationRestore");
        location.reload();
      });
      const originInput = h("input", { type: "text" });
      originInput.placeholder = "https://www.google.com/maps";
      const add = h("button", { type: "button" }, ["Add Ask exception"]);
      add.addEventListener("click", async () => {
        await commandExtension("locationException", { url: originInput.value, setting: "ask" });
        location.reload();
      });
      engine.append(h("div", { class: "row" }, [block, restore]), field("Map or site URL", originInput), add);
    } else {
      engine.append(h("p", {}, ["Location control is unsupported in this browser's extension. Firefox has no contentSettings API."]));
    }
  }
  root.append(engine);
  const select = h("select", {});
  for (const resolver of RESOLVERS) select.append(option(resolver.id, resolver.name));
  const dnsOut = h("div");
  function renderDns() {
    const id = (select as HTMLSelectElement).value;
    const resolver = RESOLVERS.find((item) => item.id === id)!;
    const profile = buildMobileconfig(id);
    const download = h("button", { type: "button", class: "primary" }, ["Download Apple profile"]);
    download.addEventListener("click", () => {
      const blob = new Blob([profile.plist], { type: "application/x-apple-aspen-config" });
      const url = URL.createObjectURL(blob);
      const anchor = h("a", { href: url, download: profile.filename }, ["profile"]);
      anchor.click();
      URL.revokeObjectURL(url);
    });
    const copy = h("button", { type: "button" }, ["Copy Android hostname"]);
    copy.addEventListener("click", () => navigator.clipboard.writeText(resolver.dotHost).catch(() => undefined));
    const paste = h("textarea", {});
    paste.placeholder = "Paste the provider check page text";
    const verdict = h("p");
    const judge = h("button", { type: "button" }, ["Read pasted check"]);
    judge.addEventListener("click", () => {
      const result = interpretDnsCheckPaste(id, paste.value);
      verdict.textContent = `${result.verdict.replaceAll("_", " ")}: ${result.summary}`;
    });
    dnsOut.replaceChildren(
      h("p", {}, [`${resolver.blocks}`]),
      h("p", { class: "muted" }, [resolver.bundling]),
      h("p", {}, [h("a", { href: resolver.privacyUrl }, ["Privacy policy"]), resolver.verifyUrl ? " · " : "", resolver.verifyUrl ? h("a", { href: resolver.verifyUrl }, ["Provider check page"]) : "No verified check URL."]),
      h("div", { class: "row" }, [download, copy]),
      h("h3", {}, ["Android"]),
      ...androidPrivateDnsSteps(id).steps.map((step) => h("p", {}, [step])),
      h("h3", {}, ["Apple removal and deprecation"]),
      ...appleRemovalSteps().map((step) => h("p", {}, [step])),
      ...profile.notes.map((note) => h("p", { class: "muted" }, [note])),
      h("h3", {}, ["Windows"]),
      ...windowsDohSteps(id).steps.map((step) => h("p", {}, [step])),
      h("h3", {}, ["Chrome"]),
      ...chromeSecureDnsSteps(id).steps.map((step) => h("p", {}, [step])),
      h("h3", {}, ["Firefox"]),
      ...firefoxDohSteps(id).steps.map((step) => h("p", {}, [step])),
      field("Check-page text", paste),
      judge,
      verdict,
    );
  }
  select.addEventListener("change", renderDns);
  renderDns();
  root.append(h("section", { class: "card" }, [h("h2", {}, ["Device DNS"]), h("p", { class: "muted" }, ["You choose the resolver. Shield does not run one, and a download is not an installed profile."]), field("Resolver", select), dnsOut]));
  return root;
}

function toggle(label: string, on: boolean, key: string) {
  const input = h("input", { type: "checkbox" });
  (input as HTMLInputElement).checked = on;
  input.addEventListener("change", async () => {
    const status = await commandExtension("setToggle", { key, enabled: (input as HTMLInputElement).checked });
    if (!status) (input as HTMLInputElement).checked = on;
  });
  return h("label", { class: "row" }, [input, ` ${label}`]);
}

export function pageStatus(): HTMLElement {
  const list = h("div", { class: "grid" });
  for (const item of CAPABILITIES) {
    list.append(
      h("article", { class: "card" }, [
        h("h2", {}, [`${item.id}. ${item.name}`]),
        h("p", { class: "pill" }, [item.userStatus.replaceAll("_", " ")]),
        h("p", { class: "muted" }, [item.implementationStatus]),
        h("p", {}, [item.summary]),
        h("p", { class: "muted" }, [item.limitations]),
      ]),
    );
  }
  const matrix = h("div", { class: "grid" });
  for (const row of platformSupport()) {
    matrix.append(h("article", { class: "card" }, [h("h2", {}, [row.surface]), h("p", {}, [row.manualTools]), h("p", { class: "muted" }, [row.evidence])]));
  }
  const sources = h("div", { class: "grid" });
  for (const source of sourceStatus(false)) {
    sources.append(h("article", { class: "card" }, [h("h2", {}, [String(source.id)]), h("p", {}, [String(source.inputsNote ?? source.title)]), h("p", { class: "muted" }, [`Enabled: ${source.enabled}. Hosts: ${source.hosts}.`])]));
  }
  return h("div", { class: "grid" }, [h("h1", {}, ["Capability status"]), h("p", { class: "lede" }, ["Generated from the capability manifest. Partial coverage is not full parity with any other product."]), list, h("h2", {}, ["Support matrix"]), matrix, h("h2", {}, ["Sources"]), sources]);
}

export function pageInstall(): HTMLElement {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  let deferred: { prompt: () => Promise<void> } | null = null;
  const guideBox = h("div");
  function render() {
    const guide = installInstructions({
      userAgent: navigator.userAgent,
      standalone,
      beforeInstallPrompt: Boolean(deferred),
    });
    guideBox.replaceChildren(
      h("h2", {}, [guide.platform]),
      ...guide.steps.map((step) => h("p", {}, [step])),
      ...guide.limits.map((step) => h("p", { class: "muted" }, [step])),
    );
  }
  const button = h("button", { class: "primary", type: "button", "data-testid": "install-link" }, ["Install NXTL Shield"]);
  button.addEventListener("click", async () => {
    if (deferred) {
      await deferred.prompt();
      deferred = null;
      render();
      return;
    }
    guideBox.querySelector("h2")?.scrollIntoView();
  });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as unknown as { prompt: () => Promise<void> };
    render();
  });
  render();
  return h("div", { class: "grid" }, [
    h("h1", {}, ["Install"]),
    h("p", { class: "lede" }, ["Installing the page does not add native antivirus, a VPN, or device DNS. Those are separate."]),
    button,
    guideBox,
  ]);
}

export function pageSettings(): HTMLElement {
  const list = h("div");
  function render() {
    const items = loadReports(localStorage);
    list.replaceChildren(
      items.length ? h("p", {}, [`${items.length} saved check${items.length === 1 ? "" : "s"}.`]) : h("p", {}, ["No saved checks."]),
      ...items.map((item) => h("p", { class: "mono" }, [`${item.at} ${item.kind} ${item.verdict} ${item.redacted}`])),
    );
  }
  const exportButton = h("button", { type: "button" }, ["Export"]);
  exportButton.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(loadReports(localStorage), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = h("a", { href: url, download: "nxtl-shield-reports.json" }, ["export"]);
    anchor.click();
    URL.revokeObjectURL(url);
  });
  const wipe = h("button", { type: "button" }, ["Delete saved checks"]);
  wipe.addEventListener("click", () => {
    clearReports(localStorage);
    render();
  });
  render();
  return h("div", { class: "grid" }, [h("h1", {}, ["Reports"]), h("p", { class: "muted" }, ["Only redacted summaries are kept in this browser. Passwords and file bytes are not."]), h("div", { class: "row" }, [exportButton, wipe]), list]);
}

function option(value: string, label: string) {
  const el = h("option", { value }, [label]);
  return el;
}
