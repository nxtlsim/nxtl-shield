import {
  CAPABILITIES,
  IP_LOOKUP,
  NXTL_LINKS,
  RESOLVERS,
  SNAPSHOT_MANIFEST,
  buildMobileconfig,
  checkText,
  checkUrl,
  cleanUrl,
  explainConnectionIssue,
  explainNxtlRouting,
  explainRates,
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
  type ReportEntry,
} from "@nxtl/core";
import { queryExtension } from "./bridge";
import { field, h, resultCard, introBlock, faqSection } from "./dom";
import { createIcon, type IconName } from "./icons";
import { loadReputation } from "./lists";

function reportsAdd(entry: ReportEntry) {
  const items = loadReports(localStorage);
  items.unshift(entry);
  saveReports(localStorage, items);
}

export function normalizeCheckInput(raw: string): {
  type: "url" | "text";
  value: string;
  normalizedUrl?: string;
  original: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { type: "text", value: "", original: raw };
  }

  // 1. Explicit protocol
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      type: "url",
      value: trimmed,
      normalizedUrl: trimmed,
      original: raw,
    };
  }

  // 2. Starts with www. or looks like domain[/path]
  const domainPathMatch = trimmed.match(/^([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}(?::\d+)?(\/.*)?$/i);
  if (domainPathMatch) {
    const url = `https://${trimmed}`;
    return {
      type: "url",
      value: url,
      normalizedUrl: url,
      original: raw,
    };
  }

  // 3. Sentence or text with a domain inside, e.g. "Please check delfi.lt/news for info"
  const inlineDomainMatch = trimmed.match(/(?:[a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}(?::\d+)?(?:\/[^\s<>"'`]*)?/i);
  if (inlineDomainMatch && inlineDomainMatch[0].includes(".")) {
    const cleaned = inlineDomainMatch[0].replace(/[.,;:!?)]+$/, "");
    const url = `https://${cleaned}`;
    return {
      type: "url",
      value: url,
      normalizedUrl: url,
      original: raw,
    };
  }

  // 4. Default to text / message check
  return {
    type: "text",
    value: trimmed,
    original: raw,
  };
}

export function detectDevice(): {
  os: "windows" | "mac" | "android" | "ios" | "linux" | "other";
  osLabel: string;
  browser: "chrome" | "edge" | "brave" | "firefox" | "safari" | "other";
  browserLabel: string;
} {
  const ua = navigator.userAgent;
  let os: "windows" | "mac" | "android" | "ios" | "linux" | "other" = "other";
  let osLabel = "Your device";

  if (/iPhone|iPad|iPod/i.test(ua)) {
    os = "ios";
    osLabel = "iPhone / iPad";
  } else if (/Android/i.test(ua)) {
    os = "android";
    osLabel = "Android";
  } else if (/Win/i.test(ua)) {
    os = "windows";
    osLabel = "Windows";
  } else if (/Mac/i.test(ua)) {
    os = "mac";
    osLabel = "macOS";
  } else if (/Linux/i.test(ua)) {
    os = "linux";
    osLabel = "Linux";
  }

  let browser: "chrome" | "edge" | "brave" | "firefox" | "safari" | "other" = "other";
  let browserLabel = "Browser";

  if (/Edg\//i.test(ua)) {
    browser = "edge";
    browserLabel = "Microsoft Edge";
  } else if (/Firefox/i.test(ua)) {
    browser = "firefox";
    browserLabel = "Firefox";
  } else if ((navigator as any).brave || /Brave/i.test(ua)) {
    browser = "brave";
    browserLabel = "Brave";
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = "chrome";
    browserLabel = "Google Chrome";
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = "safari";
    browserLabel = "Safari";
  }

  return { os, osLabel, browser, browserLabel };
}

export async function copyToClipboard(
  text: string,
  button: HTMLElement,
  defaultContent: (string | Node)[],
  copiedLabel = "Copied!"
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = copiedLabel;
    setTimeout(() => {
      button.replaceChildren(...defaultContent);
    }, 2000);
    return true;
  } catch {
    button.textContent = "Select & copy manually";
    setTimeout(() => {
      button.replaceChildren(...defaultContent);
    }, 2500);
    return false;
  }
}

// ----------------------------------------------------
// HOME PAGE
// ----------------------------------------------------
export async function pageHome(): Promise<HTMLElement> {
  const root = h("div", { class: "grid" });
  const ext = await queryExtension();
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;

  // First-visit 3-step guide (dismissable, remembered)
  const isDismissed = localStorage.getItem("nxtl-shield-welcome-dismissed") === "true";
  const guideBanner = h("section", {
    class: "guide-banner",
    "aria-label": "Getting started guide",
  });
  if (isDismissed) {
    guideBanner.hidden = true;
  }

  const dismissBtn = h("button", {
    type: "button",
    class: "btn ghost btn-sm",
    "aria-label": "Dismiss getting started guide",
  }, [
    createIcon("close", 16),
    "Dismiss",
  ]);
  dismissBtn.addEventListener("click", () => {
    localStorage.setItem("nxtl-shield-welcome-dismissed", "true");
    guideBanner.hidden = true;
  });

  const guideHeader = h("div", { class: "guide-banner-header" }, [
    h("div", {}, [
      h("span", { class: "pill ok", style: "margin-bottom: var(--sp-2);" }, [
        createIcon("shield-check", 14),
        "Getting started",
      ]),
      h("h2", { style: "font-size: 1.25rem; margin: 4px 0 0;" }, ["Get protected in 3 steps"]),
      h("p", { class: "muted", style: "margin: 0;" }, ["Follow these three steps to shield your browsing and your device."]),
    ]),
    dismissBtn,
  ]);

  const guideSteps = h("div", { class: "guide-steps" }, [
    h("div", { class: "guide-step-card" }, [
      h("span", { class: "guide-step-number" }, ["Step 1 · Whole device"]),
      h("h3", { style: "font-size: 1.05rem; margin-bottom: 4px;" }, ["Set up Safe DNS"]),
      h("p", { class: "muted-soft", style: "flex: 1; margin: 0 0 12px;" }, [
        "Blocks malicious websites and phishing domains across every app on your phone or computer.",
      ]),
      h("a", { class: "btn sm", href: "#/setup" }, ["Set up Safe DNS", createIcon("arrow-right", 14)]),
    ]),
    h("div", { class: "guide-step-card" }, [
      h("span", { class: "guide-step-number" }, ["Step 2 · Browser"]),
      h("h3", { style: "font-size: 1.05rem; margin-bottom: 4px;" }, ["Add Browser Extension"]),
      h("p", { class: "muted-soft", style: "flex: 1; margin: 0 0 12px;" }, [
        "Adds continuous ad & tracker blocking, URL cleaning, and live malicious site alerts in your browser.",
      ]),
      ext
        ? h("span", { class: "pill ok", style: "align-self: flex-start;" }, [createIcon("check", 14), "Active"])
        : h("a", { class: "btn sm", href: "#/extension" }, ["Add extension", createIcon("arrow-right", 14)]),
    ]),
    h("div", { class: "guide-step-card" }, [
      h("span", { class: "guide-step-number" }, ["Step 3 · Standby"]),
      h("h3", { style: "font-size: 1.05rem; margin-bottom: 4px;" }, ["Install NXTL Shield"]),
      h("p", { class: "muted-soft", style: "flex: 1; margin: 0 0 12px;" }, [
        "Keep these free tools one tap away on your home screen or desktop for fast checks anytime.",
      ]),
      standalone
        ? h("span", { class: "pill ok", style: "align-self: flex-start;" }, [createIcon("check", 14), "Installed"])
        : h("a", { class: "btn sm", href: "#/install" }, ["Install app", createIcon("arrow-right", 14)]),
    ]),
  ]);

  guideBanner.append(guideHeader, guideSteps);

  // Hero Section
  const hero = h("section", { class: "hero-launcher" }, [
    h("h1", {}, ["Check a link before you open it."]),
    h("p", { class: "hero-lede" }, [
      "Paste any suspicious web address, text message, or QR code to test against verified scam and malware databases.",
    ]),
  ]);

  const heroInput = h("input", {
    type: "text",
    class: "hero-input",
    "data-testid": "check-input",
    placeholder: "Paste a link, message or domain (e.g. delfi.lt)",
    "aria-label": "Check link, message or QR",
  }) as HTMLInputElement;

  const runHeroBtn = h("button", {
    type: "button",
    class: "btn primary btn-hero-check",
    "data-testid": "check-run",
  }, [
    createIcon("search", 20),
    "Check",
  ]);

  const pasteBtn = h("button", {
    type: "button",
    class: "btn ghost btn-sm",
    "aria-label": "Paste from clipboard",
    title: "Paste from clipboard",
  }, [
    createIcon("copy", 16),
    "Paste",
  ]);

  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        heroInput.value = text;
        heroInput.focus();
      }
    } catch {
      heroInput.focus();
    }
  });

  const qrFileHidden = h("input", {
    type: "file",
    accept: "image/*",
    style: "display: none;",
    "aria-label": "Upload QR code image",
  }) as HTMLInputElement;

  const qrUploadBtn = h("button", {
    type: "button",
    class: "btn ghost btn-sm",
    "aria-label": "Scan QR image",
    title: "Scan QR image",
  }, [
    createIcon("qr", 16),
    "Scan QR",
  ]);

  qrUploadBtn.addEventListener("click", () => qrFileHidden.click());

  qrFileHidden.addEventListener("change", async () => {
    const file = qrFileHidden.files?.[0];
    if (!file) return;
    try {
      if ("BarcodeDetector" in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        const bmp = await createImageBitmap(file);
        const codes = await detector.detect(bmp);
        if (codes.length && codes[0].rawValue) {
          heroInput.value = codes[0].rawValue;
          runHeroCheck();
          return;
        }
      }
      location.hash = "#/check?tab=qr";
    } catch {
      location.hash = "#/check?tab=qr";
    }
  });

  const heroInputRow = h("div", { class: "hero-input-row" }, [
    h("div", { class: "hero-input-wrap" }, [
      heroInput,
      h("div", { class: "hero-input-actions" }, [
        pasteBtn,
        qrUploadBtn,
        qrFileHidden,
      ]),
    ]),
    runHeroBtn,
  ]);

  const heroResultContainer = h("div", { class: "hero-result-area" });

  async function runHeroCheck() {
    const raw = heroInput.value.trim();
    if (!raw) {
      heroInput.focus();
      return;
    }
    const normalized = normalizeCheckInput(raw);
    runHeroBtn.disabled = true;
    heroResultContainer.replaceChildren(
      h("p", { class: "muted", style: "padding: var(--sp-4);" }, ["Checking reputation lists..."]),
    );

    try {
      const reputation = await loadReputation();
      if (normalized.type === "url") {
        const res = checkUrl(normalized.value, reputation);
        const card = resultCard(res);
        heroResultContainer.replaceChildren(card);
        reportsAdd(makeReport("url", res.verdict, normalized.value));
      } else {
        const res = checkText(normalized.value, reputation);
        const card = resultCard(res);
        heroResultContainer.replaceChildren(card);
        reportsAdd(makeReport("text", res.verdict, normalized.value));
      }
    } catch {
      heroResultContainer.replaceChildren(
        h("p", { class: "banner alert" }, ["Inspection failed. Please try again."]),
      );
    } finally {
      runHeroBtn.disabled = false;
    }
  }

  runHeroBtn.addEventListener("click", runHeroCheck);
  heroInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runHeroCheck();
    }
  });

  hero.append(heroInputRow, heroResultContainer);

  // Real Protection Status Card
  const statusSection = h("section", { class: "card", "data-testid": "protection-status" }, [
    h("div", { class: "row", style: "align-items: center; justify-content: space-between; margin-bottom: var(--sp-4);" }, [
      h("h2", { style: "margin: 0; font-size: 1.25rem;" }, ["Protection status"]),
      h("span", { class: "muted-soft", style: "font-size: 0.88rem;" }, ["Real-time device check"]),
    ]),
    h("div", { class: "status-list" }, [
      h("div", { class: "status-row" }, [
        h("span", { class: "status-label" }, [
          createIcon("extension", 18),
          "Browser extension",
        ]),
        h("div", { class: "cluster" }, [
          ext
            ? h("span", { class: "pill ok" }, [createIcon("check", 14), "Active"])
            : h("span", { class: "pill neutral" }, ["Not detected"]),
          !ext
            ? h("a", { class: "btn sm", href: "#/extension" }, ["Add extension", createIcon("arrow-right", 12)])
            : "",
        ]),
      ]),
      h("div", { class: "status-row" }, [
        h("span", { class: "status-label" }, [
          createIcon("dns", 18),
          "Safe DNS protection",
        ]),
        h("div", { class: "cluster" }, [
          h("span", { class: "pill neutral" }, ["Device setting"]),
          h("a", { class: "btn sm", href: "#/setup" }, ["Set up Safe DNS", createIcon("arrow-right", 12)]),
        ]),
      ]),
      h("div", { class: "status-row" }, [
        h("span", { class: "status-label" }, [
          createIcon("install", 18),
          "Offline app standby",
        ]),
        h("div", { class: "cluster" }, [
          standalone
            ? h("span", { class: "pill ok" }, [createIcon("check", 14), "Installed"])
            : h("span", { class: "pill neutral" }, ["Web access"]),
          !standalone
            ? h("a", { class: "btn sm ghost", href: "#/install" }, ["Install", createIcon("arrow-right", 12)])
            : "",
        ]),
      ]),
    ]),
  ]);

  // All Protections Grid (12 tiles)
  const allTilesSection = h("section", { "aria-label": "All Protections and Tools" }, [
    h("h2", { style: "font-size: 1.35rem; margin-bottom: var(--sp-2);" }, ["All protections and tools"]),
    h("p", { class: "muted", style: "margin-bottom: var(--sp-4);" }, [
      "Twelve zero-knowledge privacy tools for phone, desktop, and travel.",
    ]),
  ]);

  const tilesGrid = h("div", { class: "tiles-grid" });

  const TOOLS = [
    {
      href: "#/ad-blocker",
      icon: "ad-block",
      title: "Ad & tracker blocker",
      desc: "Stop intrusive advertisements, banners, and analytics trackers across your browsing.",
    },
    {
      href: "#/check?tab=link",
      icon: "link",
      title: "Phishing & scam link check",
      desc: "Test any URL against known scam databases before clicking or submitting passwords.",
    },
    {
      href: "#/check?tab=message",
      icon: "message",
      title: "Message & SMS scam check",
      desc: "Inspect delivery, tax, or banking text messages for phishing lures and urgent scams.",
    },
    {
      href: "#/check?tab=qr",
      icon: "qr",
      title: "QR code check",
      desc: "Decode physical poster or menu QR codes to verify destination safety before opening.",
    },
    {
      href: "#/setup",
      icon: "dns",
      title: "Safe DNS protection",
      desc: "Filter ads, tracking, and malware domains across every app on your whole device.",
    },
    {
      href: "#/location",
      icon: "location",
      title: "Location privacy",
      desc: "Audit and prevent websites and ad networks from tracking your physical location.",
    },
    {
      href: "#/share",
      icon: "share-lock",
      title: "Secure Share",
      desc: "Encrypt text and files with a password before sending via email, WhatsApp, or chat.",
    },
    {
      href: "#/password",
      icon: "password",
      title: "Password generator",
      desc: "Create strong random passwords on your device and check if they appeared in leaks.",
    },
    {
      href: "#/clean",
      icon: "clean",
      title: "Link cleaner",
      desc: "Strip marketing tags (utm, fbclid) from links before sending them to friends.",
    },
    {
      href: "#/connection",
      icon: "connection",
      title: "Connection check",
      desc: "Inspect your public IP and test for WebRTC address exposure on public Wi-Fi.",
    },
    {
      href: "#/extension",
      icon: "extension",
      title: "Browser extension",
      desc: "Continuous ad blocking, scam alerts, and URL cleaning inside Chrome and Firefox.",
    },
    {
      href: "#/esim",
      icon: "esim",
      title: "NXTL eSIM",
      desc: "Travel data in 150+ countries with a privacy-preserving London internet exit.",
    },
  ];

  for (const t of TOOLS) {
    const tile = h("a", { class: "tile", href: t.href }, [
      h("div", { class: "row", style: "align-items: center; justify-content: space-between;" }, [
        h("div", { class: "tile-icon" }, [createIcon(t.icon as IconName, 22)]),
        createIcon("arrow-right", 14),
      ]),
      h("h3", { class: "tile-title" }, [t.title]),
      h("p", { class: "tile-desc" }, [t.desc]),
    ]);
    tilesGrid.append(tile);
  }
  allTilesSection.append(tilesGrid);

  // eSIM Companion Card
  const esimCard = h("section", { class: "card esim-card", style: "margin-top: var(--sp-6);" }, [
    h("div", { class: "row", style: "align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--sp-3);" }, [
      h("div", { style: "display: flex; align-items: center; gap: var(--sp-3);" }, [
        h("div", { class: "tile-icon", style: "width: 44px; height: 44px; flex-shrink: 0;" }, [createIcon("esim", 24)]),
        h("div", {}, [
          h("h3", { style: "margin: 0; font-size: 1.15rem;" }, ["Traveling abroad? Connect with NXTL eSIM"]),
          h("p", { class: "muted", style: "margin: 4px 0 0;" }, [
            "Affordable travel data in 150+ countries. Routes your traffic via London for consistent privacy abroad.",
          ]),
        ]),
      ]),
      h("a", {
        class: "btn primary",
        href: NXTL_LINKS.pricing,
        target: "_blank",
        rel: "noreferrer",
      }, [
        "See plans",
        createIcon("external", 16),
      ]),
    ]),
  ]);

  root.append(guideBanner, hero, statusSection, allTilesSection, esimCard);
  return root;
}

// ----------------------------------------------------
// DEDICATED PAGE: AD & TRACKER BLOCKER
// ----------------------------------------------------
export async function pageAdBlocker(): Promise<HTMLElement> {
  const root = h("div", { class: "grid" });
  const ext = await queryExtension();
  const device = detectDevice();

  const header = h("div", {}, [
    h("h1", {}, ["Ad & tracker blocker"]),
    h("p", { class: "lede" }, [
      "Stop annoying advertisements, video interruptions, and third-party tracking scripts. There are two real ways to block them: in your browser with our extension, or across your entire device with Safe DNS.",
    ]),
  ]);

  // Real Status Card
  const statusCard = h("section", { class: "card", "data-testid": "adblocker-status" }, [
    h("h2", {}, ["Protection status"]),
    h("div", { class: "status-row" }, [
      h("span", { class: "status-label" }, [createIcon("extension", 18), "Browser ad blocking"]),
      h("span", { class: `pill ${ext?.blockingEnabled ? "ok" : "neutral"}` }, [
        ext?.blockingEnabled ? "Active & blocking" : ext ? "Extension installed (blocking off)" : "Not installed",
      ]),
    ]),
    h("div", { class: "status-row" }, [
      h("span", { class: "status-label" }, [createIcon("dns", 18), "Whole-device Safe DNS"]),
      h("span", { class: "pill neutral" }, ["Device setting (set up below)"]),
    ]),
  ]);

  // Recommended path for detected device
  const recommendedSection = h("section", { class: "card", style: "border: 2px solid var(--accent-coral);" }, [
    h("div", { class: "row", style: "align-items: center; justify-content: space-between; margin-bottom: var(--sp-2);" }, [
      h("span", { class: "pill ok" }, [createIcon("check", 14), `Recommended for ${device.osLabel}`]),
    ]),
  ]);

  if (device.os === "windows") {
    recommendedSection.append(
      h("h2", {}, ["Recommended for Windows"]),
      h("p", { class: "muted" }, ["For complete protection on Windows, add the browser extension and run the 1-click Safe DNS setup for your computer."]),
      h("div", { class: "grid cards", style: "margin-top: var(--sp-4);" }, [
        h("div", { class: "card", style: "background: var(--raised);" }, [
          h("h3", {}, ["Step 1: Add browser extension"]),
          h("p", { class: "muted" }, ["Blocks banner ads, video interruptions, and tracking scripts in Chrome, Edge, and Brave."]),
          h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
            h("a", { class: "btn primary", href: "#/extension" }, [createIcon("extension", 18), "Add extension"]),
          ]),
        ]),
        h("div", { class: "card", style: "background: var(--raised);" }, [
          h("h3", {}, ["Step 2: Windows 1-Click DNS"]),
          h("p", { class: "muted" }, ["Blocks ads, trackers, and scam sites across your whole PC. Reversible anytime."]),
          h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
            h("a", { class: "btn primary", href: `${import.meta.env.BASE_URL}downloads/windows/nxtl-shield-windows-dns.cmd`, download: "nxtl-shield-windows-dns.cmd" }, [
              createIcon("download", 18),
              "Download Windows setup",
            ]),
            h("a", { class: "btn ghost sm", href: "#/setup" }, ["Details & Undo"]),
          ]),
        ]),
      ]),
    );
  } else if (device.os === "mac") {
    recommendedSection.append(
      h("h2", {}, ["Recommended for macOS"]),
      h("p", { class: "muted" }, ["Add the extension for Safari/Chrome and install the macOS configuration profile for whole-Mac protection."]),
      h("div", { class: "grid cards", style: "margin-top: var(--sp-4);" }, [
        h("div", { class: "card", style: "background: var(--raised);" }, [
          h("h3", {}, ["Step 1: Add browser extension"]),
          h("p", { class: "muted" }, ["Continuous ad and tracker blocking in your browser."]),
          h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
            h("a", { class: "btn primary", href: "#/extension" }, [createIcon("extension", 18), "Add extension"]),
          ]),
        ]),
        h("div", { class: "card", style: "background: var(--raised);" }, [
          h("h3", {}, ["Step 2: macOS Safe DNS Profile"]),
          h("p", { class: "muted" }, ["Download and install the official Apple configuration profile for system-wide blocking."]),
          h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
            h("a", { class: "btn primary", href: "#/setup" }, [createIcon("download", 18), "Get macOS profile"]),
          ]),
        ]),
      ]),
    );
  } else if (device.os === "android") {
    const copyBtn = h("button", { class: "btn primary sm", type: "button" }, [createIcon("copy", 16), "Copy hostname"]);
    copyBtn.addEventListener("click", () => {
      copyToClipboard("dns.adguard-dns.com", copyBtn, [createIcon("copy", 16), "Copy hostname"], "Copied hostname!");
    });
    recommendedSection.append(
      h("h2", {}, ["Android: Private DNS (3 taps)"]),
      h("p", { class: "muted" }, ["Android blocks ads and trackers across all apps natively with Private DNS. No apps to install."]),
      h("ol", { class: "stepper-list" }, [
        h("li", {}, ["Open Settings → Network & internet (or Connections) → Private DNS."]),
        h("li", {}, ["Select Private DNS provider hostname."]),
        h("li", {}, [
          h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
            h("span", {}, ["Paste this hostname and tap Save:"]),
            h("span", { class: "mono", style: "font-weight: 700; color: var(--accent-coral);" }, ["dns.adguard-dns.com"]),
            h("div", { class: "row" }, [copyBtn]),
          ]),
        ]),
      ]),
      h("div", { class: "row", style: "margin-top: var(--sp-4);" }, [
        h("a", { class: "btn", href: "https://adguard.com/en/test.html", target: "_blank", rel: "noreferrer" }, [
          createIcon("check", 16),
          "Check it worked",
        ]),
      ]),
    );
  } else if (device.os === "ios") {
    const profile = buildMobileconfig("adguard-default");
    const downloadBtn = h("button", { class: "btn primary", type: "button" }, [
      createIcon("download", 18),
      "Download Safe DNS Profile",
    ]);
    downloadBtn.addEventListener("click", () => {
      const blob = new Blob([profile.plist], { type: "application/x-apple-aspen-config" });
      const url = URL.createObjectURL(blob);
      const a = h("a", { href: url, download: profile.filename }, ["profile"]);
      a.click();
      URL.revokeObjectURL(url);
    });

    recommendedSection.append(
      h("h2", {}, ["iPhone & iPad: Safe DNS Profile"]),
      h("p", { class: "muted" }, ["Apple supports encrypted DNS profiles to block ads and malicious links in Safari and all apps."]),
      h("ol", { class: "stepper-list" }, [
        h("li", {}, [
          h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
            h("span", {}, ["Tap the button to download the Apple configuration profile:"]),
            h("div", { class: "row" }, [downloadBtn]),
          ]),
        ]),
        h("li", {}, ["Open Settings on your iPhone or iPad."]),
        h("li", {}, ["Tap Profile Downloaded near the top."]),
        h("li", {}, ["Tap Install in the top right and enter your passcode."]),
      ]),
      h("div", { class: "row", style: "margin-top: var(--sp-4);" }, [
        h("a", { class: "btn", href: "https://adguard.com/en/test.html", target: "_blank", rel: "noreferrer" }, [
          createIcon("check", 16),
          "Check it worked",
        ]),
      ]),
    );
  } else {
    // Other / Linux
    recommendedSection.append(
      h("h2", {}, ["Safe DNS Setup"]),
      h("p", { class: "muted" }, ["Set up Safe DNS on your system or router to block ads, trackers, and scam links device-wide."]),
      h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
        h("a", { class: "btn primary", href: "#/setup" }, [createIcon("dns", 18), "Set up Safe DNS"]),
        h("a", { class: "btn", href: "#/extension" }, [createIcon("extension", 18), "Get browser extension"]),
      ]),
    );
  }

  // All Ways Grid (Way 1: Browser Extension, Way 2: Safe DNS)
  const allWays = h("div", { class: "grid cards", style: "margin-top: var(--sp-6);" }, [
    h("article", { class: "card" }, [
      h("div", { class: "tile-icon", style: "margin-bottom: var(--sp-3);" }, [createIcon("extension", 24)]),
      h("h3", {}, ["Way 1: Browser Extension"]),
      h("p", { class: "muted" }, [
        "Best for detailed ad-blocking on websites. Removes banner ads, blocks tracking scripts, and hides cookie consent banners.",
      ]),
      h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
        h("a", { class: "btn sm", href: "#/extension" }, ["Browser extension guide", createIcon("arrow-right", 14)]),
      ]),
    ]),
    h("article", { class: "card" }, [
      h("div", { class: "tile-icon", style: "margin-bottom: var(--sp-3);" }, [createIcon("dns", 24)]),
      h("h3", {}, ["Way 2: Whole-Device Safe DNS"]),
      h("p", { class: "muted" }, [
        "Best for blocking ads and trackers across your whole phone, tablet, or PC, including third-party apps.",
      ]),
      h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
        h("a", { class: "btn sm", href: "#/setup" }, ["All device setup guides", createIcon("arrow-right", 14)]),
      ]),
    ]),
  ]);

  const faqs = faqSection([
    {
      q: "Can this website block ads without installing anything?",
      a: "No. Web standards and browser security prevent any website from modifying traffic in other tabs or apps. You must use either the browser extension or system Safe DNS.",
    },
    {
      q: "Which one should I choose?",
      a: "For the best protection, use both! Safe DNS protects your phone and background apps, while the browser extension removes blank ad boxes and cookie banners in websites.",
    },
    {
      q: "Will this slow down my internet connection?",
      a: "No. Blocking ad and tracker scripts usually makes web pages load 30% to 50% faster and saves battery.",
    },
  ]);

  root.append(header, statusCard, recommendedSection, allWays, faqs);
  return root;
}

// ----------------------------------------------------
// DEDICATED PAGE: PROTECT YOUR PHONE
// ----------------------------------------------------
export function pagePhoneProtection(): HTMLElement {
  const root = h("div", { class: "grid" });
  const device = detectDevice();

  const header = h("div", {}, [
    h("h1", {}, ["Protect your phone"]),
    h("p", { class: "lede" }, [
      "Turn on system-wide protection on your smartphone in under two minutes. Blocks ads, trackers, and malicious scam links across all apps.",
    ]),
  ]);

  const intro = introBlock({
    what: "System-wide protection for your smartphone against scam links, phishing messages, and app trackers.",
    howSteps: [
      "Set up Safe DNS on your phone (3 taps on Android, 1 profile on iPhone).",
      "Check suspicious links or text messages before opening them.",
      "Use Secure Share whenever you need to send sensitive messages or files.",
    ],
    limit: "Checks links against known scam lists. A new scam site may not be listed yet.",
  });

  // Platform Selector Tabs
  let activePlatform: "android" | "ios" = device.os === "ios" ? "ios" : "android";
  const contentArea = h("div", { style: "margin-top: var(--sp-4);" });

  const tabContainer = h("div", { class: "tab-bar", role: "tablist", style: "margin-top: var(--sp-4);" });
  const androidTab = h("button", {
    type: "button",
    class: "tab-btn",
    role: "tab",
    "aria-selected": activePlatform === "android" ? "true" : "false",
  }, [createIcon("android", 18), "Android"]);

  const iosTab = h("button", {
    type: "button",
    class: "tab-btn",
    role: "tab",
    "aria-selected": activePlatform === "ios" ? "true" : "false",
  }, [createIcon("apple", 18), "iPhone & iPad"]);

  tabContainer.append(androidTab, iosTab);

  function renderPlatform(platform: "android" | "ios") {
    activePlatform = platform;
    androidTab.setAttribute("aria-selected", platform === "android" ? "true" : "false");
    iosTab.setAttribute("aria-selected", platform === "ios" ? "true" : "false");

    if (platform === "android") {
      const copyBtn = h("button", { class: "btn primary sm", type: "button" }, [createIcon("copy", 16), "Copy hostname"]);
      copyBtn.addEventListener("click", () => {
        copyToClipboard("dns.adguard-dns.com", copyBtn, [createIcon("copy", 16), "Copy hostname"], "Copied hostname!");
      });

      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3);" }, [
            createIcon("android", 28),
            h("h2", { style: "margin: 0;" }, ["Android Private DNS Setup"]),
          ]),
          h("p", { class: "muted" }, [
            "Android natively supports encrypted Private DNS. This blocks ads, trackers, and scam sites across Chrome, Samsung Internet, and all mobile apps.",
          ]),
          h("ol", { class: "stepper-list" }, [
            h("li", {}, ["Open your phone's Settings app."]),
            h("li", {}, ["Tap Network & internet (or Connections) → Private DNS."]),
            h("li", {}, ["Select Private DNS provider hostname."]),
            h("li", {}, [
              h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
                h("span", {}, ["Paste this hostname and tap Save:"]),
                h("span", { class: "mono", style: "font-weight: 700; color: var(--accent-coral);" }, ["dns.adguard-dns.com"]),
                h("div", { class: "row" }, [copyBtn]),
              ]),
            ]),
          ]),
          h("div", { class: "row", style: "margin-top: var(--sp-4);" }, [
            h("a", { class: "btn", href: "https://adguard.com/en/test.html", target: "_blank", rel: "noreferrer" }, [
              createIcon("check", 16),
              "Check it worked",
            ]),
          ]),
        ]),
      );
    } else {
      const profile = buildMobileconfig("adguard-default");
      const downloadBtn = h("button", { class: "btn primary", type: "button" }, [
        createIcon("download", 18),
        "Download Safe DNS Profile",
      ]);
      downloadBtn.addEventListener("click", () => {
        const blob = new Blob([profile.plist], { type: "application/x-apple-aspen-config" });
        const url = URL.createObjectURL(blob);
        const a = h("a", { href: url, download: profile.filename }, ["profile"]);
        a.click();
        URL.revokeObjectURL(url);
      });

      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3);" }, [
            createIcon("apple", 28),
            h("h2", { style: "margin: 0;" }, ["iPhone & iPad: Safe DNS Profile"]),
          ]),
          h("p", { class: "muted" }, [
            "Apple iOS natively supports encrypted DNS profiles to protect Safari and all apps.",
          ]),
          h("ol", { class: "stepper-list" }, [
            h("li", {}, [
              h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
                h("span", {}, ["Tap the button to download the profile:"]),
                h("div", { class: "row" }, [downloadBtn]),
              ]),
            ]),
            h("li", {}, ["Open Settings on your iPhone or iPad."]),
            h("li", {}, ["Tap Profile Downloaded near the top."]),
            h("li", {}, ["Tap Install in the top right and enter your passcode."]),
          ]),
          h("div", { class: "row", style: "margin-top: var(--sp-4);" }, [
            h("a", { class: "btn", href: "https://adguard.com/en/test.html", target: "_blank", rel: "noreferrer" }, [
              createIcon("check", 16),
              "Check it worked",
            ]),
          ]),
        ]),
      );
    }
  }

  androidTab.addEventListener("click", () => renderPlatform("android"));
  iosTab.addEventListener("click", () => renderPlatform("ios"));
  renderPlatform(activePlatform);

  // Quick Tools for Phone
  const toolsSection = h("div", { class: "grid cards", style: "margin-top: var(--sp-6);" }, [
    h("article", { class: "card" }, [
      h("h3", {}, ["Check suspicious links & SMS"]),
      h("p", { class: "muted" }, ["Received a weird text, package notification, or email? Check it before tapping."]),
      h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
        h("a", { class: "btn sm", href: "#/check" }, ["Check link or message", createIcon("arrow-right", 14)]),
      ]),
    ]),
    h("article", { class: "card" }, [
      h("h3", {}, ["Send passwords & files securely"]),
      h("p", { class: "muted" }, ["Encrypt text or files with a password before sending via chat or email."]),
      h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
        h("a", { class: "btn sm", href: "#/share" }, ["Open Secure Share", createIcon("arrow-right", 14)]),
      ]),
    ]),
  ]);

  const faqs = faqSection([
    {
      q: "Does NXTL Shield scan apps on my phone?",
      a: "No. Mobile operating systems (iOS and Android) do not allow apps or websites to scan other installed apps. Shield protects your phone by filtering network connections via Safe DNS.",
    },
    {
      q: "Does Safe DNS drain my phone's battery?",
      a: "No. DNS queries are lightweight and happen anyway. In fact, blocking ad and tracker traffic saves battery and mobile data.",
    },
  ]);
  faqs.style.marginTop = "var(--sp-6)";

  root.append(header, intro, tabContainer, contentArea, toolsSection, faqs);
  return root;
}

// ----------------------------------------------------
// DEDICATED PAGE: BROWSER EXTENSION
// ----------------------------------------------------
export async function pageExtension(): Promise<HTMLElement> {
  const root = h("div", { class: "grid" });
  const ext = await queryExtension();
  const device = detectDevice();

  const header = h("div", {}, [
    h("h1", {}, ["Browser extension"]),
    h("p", { class: "lede" }, [
      "Continuous protection in your browser. Blocks phishing websites, stops trackers, cleans URLs, and protects your location.",
    ]),
  ]);

  // Status card at top
  const statusBox = h("section", { class: "card", "data-testid": "extension-status" }, [
    h("div", { class: "row", style: "align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--sp-3);" }, [
      h("div", { class: "row", style: "align-items: center; gap: var(--sp-3);" }, [
        h("span", { class: `pill ${ext ? "ok" : "neutral"}` }, [
          createIcon(ext ? "check" : "info", 14),
          ext ? "Active" : "Not detected",
        ]),
        h("span", { style: "font-weight: 600;" }, [
          ext ? "NXTL Shield extension is running and protecting this browser." : "Extension is not yet installed in this browser.",
        ]),
      ]),
    ]),
  ]);

  const checkAgainBtn = h("button", { class: "btn sm", type: "button" }, [
    createIcon("refresh", 16),
    "Check again",
  ]);
  checkAgainBtn.addEventListener("click", async () => {
    checkAgainBtn.textContent = "Checking...";
    const fresh = await queryExtension(1200);
    checkAgainBtn.replaceChildren(createIcon("refresh", 16), "Check again");
    if (fresh) {
      statusBox.replaceChildren(
        h("div", { class: "row", style: "align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--sp-3);" }, [
          h("div", { class: "row", style: "align-items: center; gap: var(--sp-3);" }, [
            h("span", { class: "pill ok" }, [createIcon("check", 14), "Active"]),
            h("span", { style: "font-weight: 600;" }, ["NXTL Shield extension is running and protecting this browser."]),
          ]),
          checkAgainBtn,
        ]),
      );
    } else {
      statusBox.replaceChildren(
        h("div", { class: "row", style: "align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--sp-3);" }, [
          h("div", { class: "row", style: "align-items: center; gap: var(--sp-3);" }, [
            h("span", { class: "pill neutral" }, [createIcon("info", 14), "Not detected"]),
            h("span", { style: "font-weight: 600;" }, ["Extension is not yet detected. Follow the steps below."]),
          ]),
          checkAgainBtn,
        ]),
      );
    }
  });
  statusBox.firstElementChild?.append(checkAgainBtn);

  // Cards per browser, detected browser first
  const isFirefox = device.browser === "firefox";

  const firefoxCard = h("section", { class: "card", style: isFirefox ? "border: 2px solid var(--accent-coral);" : "" }, [
    h("div", { class: "row", style: "align-items: center; justify-content: space-between; margin-bottom: var(--sp-2);" }, [
      h("div", { class: "row", style: "align-items: center; gap: var(--sp-3);" }, [
        createIcon("desktop", 24),
        h("h2", { style: "margin: 0;" }, ["Firefox"]),
      ]),
      isFirefox ? h("span", { class: "pill ok" }, ["Your current browser"]) : "",
    ]),
    h("p", { class: "muted" }, ["Install the signed extension (.xpi) directly into Firefox in one click."]),
    h("div", { class: "row", style: "margin-top: var(--sp-4);" }, [
      h("a", {
        class: "btn primary lg",
        href: "https://github.com/nxtlsim/nxtl-shield/releases/latest/download/nxtl-shield-firefox.xpi",
        target: "_blank",
        rel: "noreferrer",
      }, [
        createIcon("download", 18),
        "Add to Firefox",
      ]),
    ]),
  ]);

  const copyChromeBtn = h("button", { class: "btn sm", type: "button" }, [createIcon("copy", 14), "Copy chrome://extensions"]);
  copyChromeBtn.addEventListener("click", () => {
    copyToClipboard("chrome://extensions", copyChromeBtn, [createIcon("copy", 14), "Copy chrome://extensions"], "Copied!");
  });

  const copyEdgeBtn = h("button", { class: "btn sm", type: "button" }, [createIcon("copy", 14), "Copy edge://extensions"]);
  copyEdgeBtn.addEventListener("click", () => {
    copyToClipboard("edge://extensions", copyEdgeBtn, [createIcon("copy", 14), "Copy edge://extensions"], "Copied!");
  });

  const chromiumCard = h("section", { class: "card", style: !isFirefox ? "border: 2px solid var(--accent-coral);" : "" }, [
    h("div", { class: "row", style: "align-items: center; justify-content: space-between; margin-bottom: var(--sp-2);" }, [
      h("div", { class: "row", style: "align-items: center; gap: var(--sp-3);" }, [
        createIcon("desktop", 24),
        h("h2", { style: "margin: 0;" }, ["Chrome, Edge, and Brave"]),
      ]),
      !isFirefox ? h("span", { class: "pill ok" }, ["Your current browser"]) : "",
    ]),
    h("p", { class: "muted" }, ["Download the package (.zip) from our latest release and load it in 4 quick steps:"]),
    h("div", { style: "margin: var(--sp-4) 0;" }, [
      h("a", {
        class: "btn primary lg",
        href: "https://github.com/nxtlsim/nxtl-shield/releases/latest/download/nxtl-shield-chromium.zip",
        target: "_blank",
        rel: "noreferrer",
      }, [
        createIcon("download", 18),
        "Download for Chrome",
      ]),
    ]),
    h("ol", { class: "stepper-list" }, [
      h("li", {}, ["Download and unzip the extension zip file on your computer."]),
      h("li", {}, [
        h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
          h("span", {}, ["In your browser address bar, open chrome://extensions (or edge://extensions):"]),
          h("div", { class: "row" }, [copyChromeBtn, copyEdgeBtn]),
        ]),
      ]),
      h("li", {}, ["Enable Developer mode in the top-right corner of that page."]),
      h("li", {}, ["Click Load unpacked and choose the unzipped folder."]),
    ]),
  ]);

  const cardsContainer = h("div", { class: "grid", style: "gap: var(--sp-4);" });
  if (isFirefox) {
    cardsContainer.append(firefoxCard, chromiumCard);
  } else {
    cardsContainer.append(chromiumCard, firefoxCard);
  }

  const faqs = faqSection([
    {
      q: "Does this extension track my browsing history?",
      a: "No. NXTL Shield collects zero browsing history, zero telemetry, and zero identifiers. All blocking takes place locally in your browser using standard declarativeNetRequest rules.",
    },
    {
      q: "Can I temporarily pause blocking if a site is broken?",
      a: "Yes. Simply click the NXTL Shield icon in your browser toolbar and click 'Pause on this site' or pause blocking from the popup.",
    },
    {
      q: "Is this extension free and open source?",
      a: "Yes, 100% free and open source under GPLv3. There are no paid tiers, subscriptions, or hidden tracking.",
    },
  ]);
  faqs.style.marginTop = "var(--sp-6)";

  root.append(header, statusBox, cardsContainer, faqs);
  return root;
}

// ----------------------------------------------------
// CHECK (LINK / MESSAGE / FILE / QR)
// ----------------------------------------------------
export async function pageCheck(tab = "link"): Promise<HTMLElement> {
  const root = h("div", { class: "grid" });

  const intro = introBlock({
    what: "Inspect web addresses, text messages, files, or QR codes against known scam and threat databases.",
    howSteps: [
      "Select Link, Message, File, or QR tab.",
      "Paste the address or content to inspect.",
      "Click Check to run the inspection.",
      "Review the color-coded verdict and recommended next step.",
    ],
    limit: "Checks links against known scam lists. A new scam site may not be listed yet.",
  });

  const header = h("div", {}, [
    h("h1", {}, ["Check a link, message or file"]),
    h("p", { class: "lede" }, [
      "Inspect links, text messages, files, and QR codes before opening them. Nothing you enter leaves your device.",
    ]),
  ]);

  const tabs = h("div", { class: "tabs", role: "tablist" });
  const panel = h("div", { id: "check-panel" });
  const names = [
    ["link", "Link", "link"],
    ["message", "Message", "message"],
    ["file", "File", "file"],
    ["qr", "QR Code", "qr"],
  ] as const;

  for (const [id, label, icon] of names) {
    const button = h("button", {
      type: "button",
      role: "tab",
      "aria-selected": id === tab ? "true" : "false",
      class: id === tab ? "primary" : "btn",
      "data-tab": id,
    }, [
      createIcon(icon as IconName, 16),
      label,
    ]);
    button.addEventListener("click", () => {
      location.hash = `#/check?tab=${id}`;
    });
    tabs.append(button);
  }

  root.append(header, intro, tabs, panel);
  if (tab === "message") panel.append(messageForm());
  else if (tab === "file") panel.append(fileForm());
  else if (tab === "qr") panel.append(qrForm());
  else panel.append(linkForm());

  return root;
}

function linkForm() {
  const input = h("input", {
    type: "text",
    "data-testid": "check-input",
    placeholder: "Paste or type a web address (e.g. delfi.lt)",
  }) as HTMLInputElement;

  const out = h("div");
  const button = h("button", { class: "primary", type: "button", "data-testid": "check-run" }, [
    createIcon("search", 18),
    "Check link",
  ]);

  const pasteBtn = h("button", { class: "btn ghost sm", type: "button" }, [
    createIcon("copy", 16),
    "Paste",
  ]);
  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        input.value = text;
        input.focus();
      }
    } catch {
      input.focus();
    }
  });

  async function run() {
    const raw = input.value.trim();
    if (!raw) return;
    button.disabled = true;
    out.replaceChildren(h("p", { class: "muted", style: "padding: var(--sp-4);" }, ["Checking reputation lists..."]));

    try {
      const norm = normalizeCheckInput(raw);
      const reputation = await loadReputation();
      const res = checkUrl(norm.value, reputation);
      const card = resultCard(res);
      out.replaceChildren(card);
      reportsAdd(makeReport("url", res.verdict, norm.value));
    } catch {
      out.replaceChildren(h("p", { class: "banner alert" }, ["Inspection failed."]));
    } finally {
      button.disabled = false;
    }
  }

  button.addEventListener("click", run);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      run();
    }
  });

  return h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
    field("Link to check", input),
    h("div", { class: "row" }, [button, pasteBtn]),
    out,
  ]);
}

function messageForm() {
  const input = h("textarea", {
    "data-testid": "check-input",
    rows: "4",
    placeholder: "Paste SMS, email, or WhatsApp message text here...",
  }) as HTMLTextAreaElement;

  const out = h("div");
  const button = h("button", { class: "primary", type: "button", "data-testid": "check-run" }, [
    createIcon("search", 18),
    "Check message",
  ]);

  const pasteBtn = h("button", { class: "btn ghost sm", type: "button" }, [
    createIcon("copy", 16),
    "Paste",
  ]);
  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        input.value = text;
        input.focus();
      }
    } catch {
      input.focus();
    }
  });

  async function run() {
    const raw = input.value.trim();
    if (!raw) return;
    button.disabled = true;
    out.replaceChildren(h("p", { class: "muted", style: "padding: var(--sp-4);" }, ["Scanning message..."]));

    try {
      const reputation = await loadReputation();
      const res = checkText(raw, reputation);
      const card = resultCard(res);
      out.replaceChildren(card);
      reportsAdd(makeReport("text", res.verdict, raw.slice(0, 80)));
    } catch {
      out.replaceChildren(h("p", { class: "banner alert" }, ["Scan failed."]));
    } finally {
      button.disabled = false;
    }
  }

  button.addEventListener("click", run);

  return h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
    field("Message content", input),
    h("div", { class: "row" }, [button, pasteBtn]),
    out,
  ]);
}

function fileForm() {
  const fileInput = h("input", { type: "file", "data-testid": "check-input" }) as HTMLInputElement;
  const out = h("div");
  const button = h("button", { class: "primary", type: "button", "data-testid": "check-run" }, [
    createIcon("search", 18),
    "Inspect file",
  ]);

  button.addEventListener("click", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    button.disabled = true;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const res = await inspectFile(file.name, bytes);
      const card = resultCard(res);
      out.replaceChildren(card);
      reportsAdd(makeReport("file", res.verdict, file.name));
    } catch {
      out.replaceChildren(h("p", { class: "banner alert" }, ["File inspection failed."]));
    } finally {
      button.disabled = false;
    }
  });

  return h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
    field("File to inspect (SHA-256 hash computed locally)", fileInput),
    h("div", { class: "row" }, [button]),
    out,
  ]);
}

function qrForm() {
  const fileInput = h("input", { type: "file", accept: "image/*", "data-testid": "check-input" }) as HTMLInputElement;
  const out = h("div");
  const button = h("button", { class: "primary", type: "button", "data-testid": "check-run" }, [
    createIcon("search", 18),
    "Read QR image",
  ]);

  button.addEventListener("click", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    button.disabled = true;
    try {
      if (!("BarcodeDetector" in window)) {
        out.replaceChildren(
          h("p", { class: "banner" }, [
            "Your browser does not support the BarcodeDetector API. You can still scan the QR code with your camera app and paste the link in the Link tab.",
          ]),
        );
        return;
      }
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      const bmp = await createImageBitmap(file);
      const codes = await detector.detect(bmp);
      if (!codes.length) {
        out.replaceChildren(h("p", { class: "banner" }, ["No QR code detected in this image."]));
        return;
      }
      const raw = codes[0].rawValue;
      const reputation = await loadReputation();
      const norm = normalizeCheckInput(raw);
      if (norm.type === "url") {
        const res = checkUrl(norm.value, reputation);
        const card = resultCard(res);
        out.replaceChildren(
          h("p", { class: "mono", style: "word-break: break-all; margin-bottom: var(--sp-3);" }, [`Decoded URL: ${norm.value}`]),
          card,
        );
        reportsAdd(makeReport("url", res.verdict, norm.value));
      } else {
        const res = checkText(raw, reputation);
        const card = resultCard(res);
        out.replaceChildren(
          h("p", { class: "mono", style: "word-break: break-all; margin-bottom: var(--sp-3);" }, [`Decoded text: ${raw}`]),
          card,
        );
        reportsAdd(makeReport("text", res.verdict, raw.slice(0, 80)));
      }
    } catch {
      out.replaceChildren(h("p", { class: "banner alert" }, ["QR decoding failed."]));
    } finally {
      button.disabled = false;
    }
  });

  return h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
    field("QR image file", fileInput),
    h("div", { class: "row" }, [button]),
    out,
  ]);
}

// ----------------------------------------------------
// LINK CLEANER
// ----------------------------------------------------
export function pageClean(): HTMLElement {
  const root = h("div", { class: "grid" });

  const header = h("div", {}, [
    h("h1", {}, ["Link cleaner"]),
    h("p", { class: "lede" }, ["Remove tracking and surveillance tags from links before sharing them."]),
  ]);

  const input = h("textarea", {
    "data-testid": "check-input",
    rows: "3",
    placeholder: "Paste a link with tracking tags here (e.g. https://example.com/item?utm_source=fb&fbclid=123)",
  });
  const out = h("div");
  let previous = "";

  const button = h("button", { class: "btn primary", type: "button", "data-testid": "check-run" }, [
    createIcon("clean", 18),
    "Clean link",
  ]);
  const undo = h("button", { type: "button", class: "btn ghost" }, [
    createIcon("refresh", 16),
    "Undo",
  ]);
  undo.disabled = true;

  button.addEventListener("click", () => {
    previous = input.value;
    const result = cleanUrl(input.value);
    undo.disabled = !result.changed;

    const copyBtn = h("button", { type: "button", class: "btn primary sm" }, [
      createIcon("copy", 16),
      "Copy clean link",
    ]);
    copyBtn.addEventListener("click", () => {
      copyToClipboard(result.cleaned, copyBtn, [createIcon("copy", 16), "Copy clean link"], "Copied link!");
    });

    const card = h("section", { class: "card result-card ok", "data-testid": "verdict" }, [
      h("h2", {}, [result.changed ? "Tracking tags removed" : "No tracking tags found"]),
      h("p", { class: "mono", style: "padding: var(--sp-3); background: var(--raised); border-radius: var(--radius-sm); word-break: break-all;" }, [result.cleaned]),
      h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [copyBtn]),
    ]);

    out.replaceChildren(card);
    input.value = result.cleaned;
  });

  undo.addEventListener("click", () => {
    input.value = previous;
    undo.disabled = true;
    out.replaceChildren();
  });

  const intro = introBlock({
    what: "Remove advertising tags (utm_source, fbclid, gclid) from links before sending them to friends or posting online.",
    howSteps: [
      "Paste the link into the box.",
      "Click Clean link.",
      "Copy the cleaned URL.",
    ],
    limit: "Login, payment, and signed links are kept untouched so accounts never break.",
    howItWorks: "All cleaning happens locally in your browser using standard URL parsing. No web requests are made.",
  });

  root.append(
    header,
    intro,
    h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
      field("URL to clean", input),
      h("div", { class: "row" }, [button, undo]),
      out,
    ]),
  );
  return root;
}

// ----------------------------------------------------
// PASSWORD GENERATOR
// ----------------------------------------------------
export function pagePassword(): HTMLElement {
  const root = h("div", { class: "grid" });

  const header = h("div", {}, [
    h("h1", {}, ["Password generator"]),
    h("p", { class: "lede" }, ["Made on your device. Never stored or sent."]),
  ]);

  const intro = introBlock({
    what: "Generate cryptographically random passwords and passphrases entirely within your browser.",
    howSteps: [
      "Choose your desired length and character options.",
      "Click New password to generate.",
      "Click Copy password to copy it to your password manager.",
    ],
    limit: "Passwords are generated in Web Crypto and never leave your device.",
    howItWorks: "All randomness uses crypto.getRandomValues(). The optional leak check uses k-anonymity, querying only the first 5 characters of the SHA-1 hash against haveibeenpwned. Your password is never sent.",
  });

  // Slider & options
  const lengthSlider = h("input", {
    type: "range",
    min: "12",
    max: "64",
    value: "20",
    style: "flex: 1;",
    "aria-label": "Password length",
  }) as HTMLInputElement;

  const lengthBadge = h("span", {
    class: "pill neutral mono",
    style: "font-weight: 700; min-width: 44px; text-align: center;",
  }, ["20"]);

  const symbolsCheck = h("input", { type: "checkbox", "aria-label": "Include symbols" }) as HTMLInputElement;
  symbolsCheck.checked = true;

  // Verdict display (Mono, large)
  const passwordDisplay = h("div", {
    class: "mono",
    "data-testid": "verdict",
    style: "font-size: 1.4rem; font-weight: 700; word-break: break-all; padding: var(--sp-4); background: var(--raised); border: 1px solid var(--line-strong); border-radius: var(--radius-sm); letter-spacing: 0.05em; min-height: 64px; display: flex; align-items: center;",
  }, [""]);

  const strengthBadge = h("div", { class: "row", style: "align-items: center; gap: var(--sp-2);" }, [
    h("span", { class: "pill ok" }, ["Very strong"]),
  ]);

  let currentPassword = "";

  function generate() {
    const len = Number(lengthSlider.value);
    const sym = symbolsCheck.checked;
    const res = generatePassword({ length: len, symbols: sym });
    currentPassword = res.password;
    passwordDisplay.textContent = res.password;
    const st = passwordStrength(res.password);
    const label = st.score >= 4 ? "Very strong" : st.score === 3 ? "Strong" : st.score === 2 ? "Moderate" : "Weak";
    const variant = st.score >= 3 ? "ok" : st.score === 2 ? "indicator" : "alert";
    strengthBadge.replaceChildren(h("span", { class: `pill ${variant}` }, [label]));
  }

  lengthSlider.addEventListener("input", () => {
    lengthBadge.textContent = lengthSlider.value;
    generate();
  });

  symbolsCheck.addEventListener("change", generate);

  const copyBtn = h("button", { class: "btn primary", type: "button" }, [
    createIcon("copy", 18),
    "Copy password",
  ]);
  copyBtn.addEventListener("click", () => {
    if (!currentPassword) return;
    copyToClipboard(currentPassword, copyBtn, [createIcon("copy", 18), "Copy password"], "Copied password!");
  });

  const newBtn = h("button", { class: "btn", type: "button" }, [
    createIcon("refresh", 18),
    "New password",
  ]);
  newBtn.addEventListener("click", generate);

  const leakBtn = h("button", { class: "btn ghost", type: "button" }, [
    createIcon("shield-alert", 16),
    "Check if this password has leaked",
  ]);
  const leakResult = h("div", { style: "margin-top: var(--sp-2);" });

  leakBtn.addEventListener("click", async () => {
    if (!currentPassword) return;
    leakBtn.disabled = true;
    leakBtn.textContent = "Checking...";
    try {
      const res = await hibpLookup(currentPassword);
      if (res.status === "match") {
        leakResult.replaceChildren(
          h("div", { class: "pill alert" }, [createIcon("alert", 14), "Found in leaks, don't use it"]),
        );
      } else {
        leakResult.replaceChildren(
          h("div", { class: "pill ok" }, [createIcon("check", 14), "Not found in known leaks"]),
        );
      }
    } catch {
      leakResult.replaceChildren(
        h("div", { class: "pill neutral" }, ["Could not reach leak database."]),
      );
    } finally {
      leakBtn.disabled = false;
      leakBtn.replaceChildren(createIcon("shield-alert", 16), "Check if this password has leaked");
    }
  });

  const controls = h("section", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
    passwordDisplay,
    strengthBadge,
    h("div", { class: "row", style: "flex-wrap: wrap; gap: var(--sp-3);" }, [
      copyBtn,
      newBtn,
    ]),
    h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2); margin-top: var(--sp-2);" }, [
      h("div", { class: "row", style: "align-items: center; justify-content: space-between;" }, [
        h("label", { style: "font-weight: 600;" }, ["Password length"]),
        lengthBadge,
      ]),
      h("div", { class: "row", style: "align-items: center; gap: var(--sp-3);" }, [
        lengthSlider,
      ]),
    ]),
    h("label", { class: "row", style: "align-items: center; gap: var(--sp-2); cursor: pointer;" }, [
      symbolsCheck,
      h("span", {}, ["Include special symbols (!@#$%^&*)"]),
    ]),
    h("div", { style: "padding-top: var(--sp-3); border-top: 1px solid var(--line);" }, [
      leakBtn,
      leakResult,
    ]),
  ]);

  generate();

  root.append(header, intro, controls);
  return root;
}

// ----------------------------------------------------
// CONNECTION DOCTOR
// ----------------------------------------------------
export async function pageConnection(): Promise<HTMLElement> {
  const root = h("div", { class: "grid" });

  const header = h("div", {}, [
    h("h1", {}, ["Connection Doctor"]),
    h("p", { class: "lede" }, ["Check your public IP address and test for WebRTC address exposure."]),
  ]);

  const out = h("div");
  const ipButton = h("button", { type: "button", class: "btn primary" }, [
    createIcon("search", 18),
    "Look up public IP",
  ]);
  const rtcButton = h("button", { type: "button", class: "btn" }, [
    createIcon("connection", 18),
    "Count WebRTC candidates",
  ]);
  const wifi = h("select", {}, [
    h("option", { value: "unknown" }, ["I have not specified"]),
    h("option", { value: "yes" }, ["I am on public Wi-Fi"]),
    h("option", { value: "no" }, ["I am not on public Wi-Fi"]),
  ]);

  let publicIp: string | null = null;
  let ipLookup: "not_run" | "ran" | "failed" = "not_run";
  let hostCount: number | null = null;
  let srflx: number | null = null;

  function render() {
    const explanation = explainConnectionIssue({
      online: navigator.onLine,
      userAgent: navigator.userAgent,
      effectiveType: (navigator as any).connection?.effectiveType ?? null,
      publicIp,
      ipLookup,
      webrtcHostCandidates: hostCount,
      webrtcServerReflexive: srflx,
      reportedPublicWifi: (wifi as HTMLSelectElement).value as "yes" | "no" | "unknown",
    });
    out.replaceChildren(
      h("section", { class: "card result-card info" }, [
        h("h2", {}, [explanation.summary]),
        ...explanation.points.map((point) => h("p", {}, [point])),
      ]),
    );
  }

  ipButton.addEventListener("click", async () => {
    ipButton.disabled = true;
    try {
      const response = await fetch(IP_LOOKUP.url);
      const body = (await response.json()) as { ip?: string };
      publicIp = body.ip ?? null;
      ipLookup = publicIp ? "ran" : "failed";
    } catch {
      ipLookup = "failed";
      publicIp = null;
    } finally {
      ipButton.disabled = false;
      render();
    }
  });

  rtcButton.addEventListener("click", async () => {
    rtcButton.disabled = true;
    hostCount = 0;
    srflx = 0;
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("shield");
      pc.onicecandidate = (event) => {
        const candidate = event.candidate?.candidate ?? "";
        if (candidate.includes(" typ host ")) hostCount = (hostCount ?? 0) + 1;
        if (candidate.includes(" typ srflx ")) srflx = (srflx ?? 0) + 1;
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      pc.close();
    } catch {
      // Ignore
    } finally {
      rtcButton.disabled = false;
      render();
    }
  });

  wifi.addEventListener("change", render);

  const intro = introBlock({
    what: "Diagnose network settings, discover your public IP address, and test for WebRTC address exposure.",
    howSteps: [
      "Click Look up public IP to see the IP address visible to remote websites.",
      "Click Count WebRTC candidates to test whether your local device IP is exposed.",
      "Check the report for recommendations.",
    ],
    limit: "Looking up your IP queries api.ipify.org only when you click the button.",
    howItWorks: "All network tests run directly in your browser. WebRTC candidate inspection uses standard RTCPeerConnection.",
  });

  root.append(
    header,
    intro,
    h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
      h("div", { class: "row", style: "flex-wrap: wrap; gap: var(--sp-3);" }, [ipButton, rtcButton]),
      field("Public Wi-Fi status", wifi),
      out,
    ]),
  );
  render();
  return root;
}

// ----------------------------------------------------
// LOCATION PRIVACY
// ----------------------------------------------------
export function pageLocation(): HTMLElement {
  const root = h("div", { class: "grid" });
  const device = detectDevice();

  const header = h("div", {}, [
    h("h1", {}, ["Location privacy"]),
    h("p", { class: "lede" }, ["Understand and control how websites and apps determine your physical location."]),
  ]);

  const os = h("select", { "aria-label": "Select your device" }, [
    h("option", { value: "chrome" }, ["Chrome / Edge / Brave"]),
    h("option", { value: "firefox" }, ["Firefox"]),
    h("option", { value: "ios" }, ["iPhone or iPad"]),
    h("option", { value: "android" }, ["Android"]),
  ]);
  (os as HTMLSelectElement).value = device.os === "ios" ? "ios" : device.os === "android" ? "android" : device.browser === "firefox" ? "firefox" : "chrome";

  const out = h("div");
  const perm = h("p", { class: "pill neutral" }, ["Website location permission: not requested"]);

  if (navigator.permissions?.query) {
    navigator.permissions.query({ name: "geolocation" }).then(
      (status) => {
        perm.textContent = `Browser location permission for Shield: ${status.state}. Shield never requests or reads your location.`;
      },
      () => {
        // Ignore
      },
    );
  }

  function render() {
    const guide = locationPrivacySetup((os as HTMLSelectElement).value);
    out.replaceChildren(
      h("section", { class: "card", style: "background: var(--raised);" }, [
        h("h2", {}, [guide.os]),
        h("p", {}, [guide.websitePermission]),
        h("p", {}, [guide.nativePermission]),
        h("p", { class: "muted" }, [guide.ipLocation]),
        h("h3", { style: "margin-top: var(--sp-4);" }, ["Recommended steps"]),
        ...guide.steps.map((step) => h("p", {}, [step])),
      ]),
    );
  }

  os.addEventListener("change", render);
  render();

  const intro = introBlock({
    what: "Control how websites and advertising networks determine your physical location.",
    howSteps: [
      "Review your browser's location permission settings.",
      "Follow the OS-specific steps below to disable broad GPS access.",
      "Add exceptions only for trusted maps or navigation services.",
    ],
    limit: "Blocking browser GPS stops exact coordinates, but websites can still estimate your approximate city from your public IP address.",
  });

  root.append(
    header,
    intro,
    h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
      perm,
      field("Device or browser", os),
      out,
    ]),
  );
  return root;
}

// ----------------------------------------------------
// NXTL eSIM
// ----------------------------------------------------
export function pageEsim(): HTMLElement {
  const root = h("div", { class: "grid" });

  const header = h("div", {}, [
    h("h1", {}, ["NXTL eSIM"]),
    h("p", { class: "lede" }, ["International mobile data with a privacy-preserving London internet exit."]),
  ]);

  const country = h("input", { type: "text", value: "Lithuania", "aria-label": "Country name" });
  const rates = h("div", { style: "margin-top: var(--sp-3);" });
  const button = h("button", { class: "btn primary sm", type: "button" }, [
    createIcon("search", 16),
    "Look up rates",
  ]);

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Checking...";
    try {
      const response = await fetch(NXTL_LINKS.pricingApi, { credentials: "omit" });
      if (!response.ok) throw new Error(String(response.status));
      const payload = await response.json();
      const result = explainRates(country.value, payload, new Date().toISOString());
      if (result.status === "ok") {
        rates.replaceChildren(
          h("div", { class: "card result-card ok", "data-testid": "verdict" }, [
            h("h3", {}, [result.country ?? country.value]),
            h("p", { style: "font-size: 1.25rem; font-weight: 700; color: var(--accent-coral);" }, [
              `From €${result.minEurPerGb}/GB`,
            ]),
            h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
              h("a", { class: "btn primary sm", href: NXTL_LINKS.pricing, target: "_blank", rel: "noreferrer" }, [
                "See plans",
                createIcon("external", 14),
              ]),
            ]),
          ]),
        );
      } else {
        rates.replaceChildren(
          h("p", { class: "muted" }, [`Rates not available for ${country.value}. Check nxtlsim.com for all supported destinations.`]),
        );
      }
    } catch {
      rates.replaceChildren(
        h("p", { class: "muted" }, ["Rates could not be loaded right now. Visit nxtlsim.com to view plans."]),
      );
    } finally {
      button.disabled = false;
      button.replaceChildren(createIcon("search", 16), "Look up rates");
    }
  });

  const routing = explainNxtlRouting();

  const card = h("section", { class: "card" }, [
    h("h2", {}, ["London exit & travel privacy"]),
    ...routing.points.map((point) => h("p", { class: "muted" }, [point])),
    h("div", { class: "row", style: "margin-top: var(--sp-4);" }, [
      h("a", { class: "btn primary", href: NXTL_LINKS.pricing, target: "_blank", rel: "noreferrer" }, [
        "See eSIM plans",
        createIcon("external", 16),
      ]),
    ]),
  ]);

  const ratesCard = h("section", { class: "card", style: "margin-top: var(--sp-4);" }, [
    h("h2", {}, ["Coverage and rates"]),
    h("p", { class: "muted" }, ["Look up per-GB rates for any travel destination:"]),
    h("div", { class: "row", style: "gap: var(--sp-2);" }, [country, button]),
    rates,
  ]);

  root.append(header, card, ratesCard);
  return root;
}

// ----------------------------------------------------
// PROTECTION SETUP & SAFE DNS
// ----------------------------------------------------
export async function pageSetup(): Promise<HTMLElement> {
  const root = h("div", { class: "grid" });
  const device = detectDevice();

  const header = h("div", {}, [
    h("h1", {}, ["Safe DNS Setup"]),
    h("p", { class: "lede" }, [
      "Block ads, trackers, and malicious scam links across your entire phone, tablet, or computer.",
    ]),
  ]);

  // Resolver Selector
  const select = h("select", { "aria-label": "Select protection profile" });
  for (const resolver of RESOLVERS) {
    const opt = h("option", { value: resolver.id }, [resolver.name]);
    if (resolver.id === "adguard-default") opt.setAttribute("selected", "selected");
    select.append(opt);
  }

  const resolverCard = h("section", { class: "card", style: "background: var(--raised);" }, [
    h("h2", { style: "font-size: 1.15rem; margin-bottom: var(--sp-2);" }, ["Choose your protection level"]),
    field("Protection profile", select),
  ]);

  // Device Tabs
  type DeviceTab = "windows" | "android" | "ios" | "mac" | "linux";
  let activeTab: DeviceTab =
    device.os === "windows"
      ? "windows"
      : device.os === "android"
        ? "android"
        : device.os === "ios"
          ? "ios"
          : device.os === "mac"
            ? "mac"
            : "windows";

  const tabContainer = h("div", { class: "tab-bar", role: "tablist", style: "margin-top: var(--sp-4);" });
  const tabs: [DeviceTab, string, IconName][] = [
    ["windows", "Windows", "desktop"],
    ["android", "Android", "android"],
    ["ios", "iPhone & iPad", "apple"],
    ["mac", "macOS", "apple"],
    ["linux", "Linux", "desktop"],
  ];

  const tabButtons: Map<DeviceTab, HTMLButtonElement> = new Map();
  for (const [id, label, icon] of tabs) {
    const btn = h("button", {
      type: "button",
      class: "tab-btn",
      role: "tab",
      "aria-selected": activeTab === id ? "true" : "false",
    }, [createIcon(icon, 18), label]) as HTMLButtonElement;
    tabButtons.set(id, btn);
    tabContainer.append(btn);
  }

  const contentArea = h("div", { style: "margin-top: var(--sp-4);" });

  function renderDeviceTab() {
    for (const [id, btn] of tabButtons) {
      btn.setAttribute("aria-selected", activeTab === id ? "true" : "false");
    }

    const resolverId = (select as HTMLSelectElement).value;
    const resolver = RESOLVERS.find((r) => r.id === resolverId) ?? RESOLVERS[0];

    if (activeTab === "windows") {
      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; justify-content: space-between; margin-bottom: var(--sp-3);" }, [
            h("div", { class: "row", style: "align-items: center; gap: var(--sp-3);" }, [
              createIcon("desktop", 24),
              h("h2", { style: "margin: 0;" }, ["Windows 1-Click Setup"]),
            ]),
            h("span", { class: "pill ok" }, ["Reversible anytime"]),
          ]),
          h("p", { class: "muted" }, [
            "Sets encrypted Safe DNS for your active network adapter and configures Chrome and Edge secure DNS policies.",
          ]),
          h("div", { style: "margin: var(--sp-4) 0;" }, [
            h("a", {
              class: "btn primary lg",
              href: `${import.meta.env.BASE_URL}downloads/windows/nxtl-shield-windows-dns.cmd`,
              download: "nxtl-shield-windows-dns.cmd",
            }, [
              createIcon("download", 20),
              "Download Windows setup",
            ]),
          ]),
          h("ol", { class: "stepper-list" }, [
            h("li", {}, ["Download the setup file above."]),
            h("li", {}, ["Right-click and select Run as administrator (or double-click and allow UAC prompt)."]),
            h("li", {}, ["Restart your browser. Your PC is now protected!"]),
          ]),
          h("div", { class: "row", style: "align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--sp-3); margin-top: var(--sp-4); padding-top: var(--sp-4); border-top: 1px solid var(--line);" }, [
            h("div", { class: "row", style: "align-items: center; gap: var(--sp-3);" }, [
              h("a", {
                class: "btn sm ghost",
                href: `${import.meta.env.BASE_URL}downloads/windows/nxtl-shield-browser-dns-undo.reg`,
                download: "nxtl-shield-browser-dns-undo.reg",
              }, [
                createIcon("refresh", 14),
                "Download Undo script",
              ]),
              h("a", {
                class: "btn sm ghost",
                href: `${import.meta.env.BASE_URL}downloads/windows/nxtl-shield-browser-dns.reg`,
                download: "nxtl-shield-browser-dns.reg",
              }, [
                createIcon("file", 14),
                "Browser policy (.reg) only",
              ]),
            ]),
            h("a", {
              class: "btn sm",
              href: resolver.verifyUrl ?? "https://adguard.com/en/test.html",
              target: "_blank",
              rel: "noreferrer",
            }, [
              createIcon("check", 14),
              "Check it worked",
            ]),
          ]),
        ]),
      );
    } else if (activeTab === "android") {
      const copyBtn = h("button", { class: "btn primary sm", type: "button" }, [createIcon("copy", 16), "Copy hostname"]);
      copyBtn.addEventListener("click", () => {
        copyToClipboard(resolver.dotHost, copyBtn, [createIcon("copy", 16), "Copy hostname"], "Copied hostname!");
      });

      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3);" }, [
            createIcon("android", 28),
            h("h2", { style: "margin: 0;" }, ["Android: Private DNS"]),
          ]),
          h("p", { class: "muted" }, [
            "Encrypted DNS protection for Android 9 and newer. Filters connections across Chrome, Samsung Internet, and background apps.",
          ]),
          h("ol", { class: "stepper-list" }, [
            h("li", {}, ["Open Settings → Network & internet (or Connections) → Private DNS."]),
            h("li", {}, ["Select Private DNS provider hostname."]),
            h("li", {}, [
              h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
                h("span", {}, ["Enter this hostname:"]),
                h("span", { class: "mono", style: "font-weight: 700; color: var(--accent-coral);" }, [resolver.dotHost]),
                h("div", { class: "row" }, [copyBtn]),
              ]),
            ]),
            h("li", {}, ["Tap Save. All internet lookups are now protected."]),
          ]),
          h("div", { class: "row", style: "margin-top: var(--sp-4);" }, [
            h("a", {
              class: "btn",
              href: resolver.verifyUrl ?? "https://adguard.com/en/test.html",
              target: "_blank",
              rel: "noreferrer",
            }, [
              createIcon("check", 16),
              "Check it worked",
            ]),
          ]),
        ]),
      );
    } else if (activeTab === "ios") {
      const profile = buildMobileconfig(resolver.id);
      const downloadBtn = h("button", { class: "btn primary", type: "button" }, [
        createIcon("download", 18),
        "Download Apple profile",
      ]);
      downloadBtn.addEventListener("click", () => {
        const blob = new Blob([profile.plist], { type: "application/x-apple-aspen-config" });
        const url = URL.createObjectURL(blob);
        const a = h("a", { href: url, download: profile.filename }, ["profile"]);
        a.click();
        URL.revokeObjectURL(url);
      });

      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3);" }, [
            createIcon("apple", 28),
            h("h2", { style: "margin: 0;" }, ["iPhone & iPad: Safe DNS Profile"]),
          ]),
          h("p", { class: "muted" }, [
            "Apple iOS natively supports encrypted DNS configuration profiles for Safari and all apps.",
          ]),
          h("ol", { class: "stepper-list" }, [
            h("li", {}, [
              h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
                h("span", {}, ["Download the official Apple profile:"]),
                h("div", { class: "row" }, [downloadBtn]),
              ]),
            ]),
            h("li", {}, ["Open Settings on your iPhone or iPad."]),
            h("li", {}, ["Tap Profile Downloaded near the top."]),
            h("li", {}, ["Tap Install in the top right and enter your passcode."]),
          ]),
          h("div", { class: "row", style: "margin-top: var(--sp-4);" }, [
            h("a", {
              class: "btn",
              href: resolver.verifyUrl ?? "https://adguard.com/en/test.html",
              target: "_blank",
              rel: "noreferrer",
            }, [
              createIcon("check", 16),
              "Check it worked",
            ]),
          ]),
        ]),
      );
    } else if (activeTab === "mac") {
      const profile = buildMobileconfig(resolver.id);
      const downloadBtn = h("button", { class: "btn primary", type: "button" }, [
        createIcon("download", 18),
        "Download macOS profile",
      ]);
      downloadBtn.addEventListener("click", () => {
        const blob = new Blob([profile.plist], { type: "application/x-apple-aspen-config" });
        const url = URL.createObjectURL(blob);
        const a = h("a", { href: url, download: profile.filename }, ["profile"]);
        a.click();
        URL.revokeObjectURL(url);
      });

      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3);" }, [
            createIcon("apple", 28),
            h("h2", { style: "margin: 0;" }, ["macOS: Safe DNS Profile"]),
          ]),
          h("p", { class: "muted" }, [
            "macOS supports encrypted DNS system-wide via signed configuration profiles.",
          ]),
          h("ol", { class: "stepper-list" }, [
            h("li", {}, [
              h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
                h("span", {}, ["Download the profile:"]),
                h("div", { class: "row" }, [downloadBtn]),
              ]),
            ]),
            h("li", {}, ["Double-click the downloaded profile in Finder."]),
            h("li", {}, ["Open System Settings → Privacy & Security → Profiles and click Install."]),
          ]),
          h("div", { class: "row", style: "margin-top: var(--sp-4);" }, [
            h("a", {
              class: "btn",
              href: resolver.verifyUrl ?? "https://adguard.com/en/test.html",
              target: "_blank",
              rel: "noreferrer",
            }, [
              createIcon("check", 16),
              "Check it worked",
            ]),
          ]),
        ]),
      );
    } else {
      // Linux
      const copyDohBtn = h("button", { class: "btn primary sm", type: "button" }, [createIcon("copy", 16), "Copy DoH URL"]);
      copyDohBtn.addEventListener("click", () => {
        copyToClipboard(resolver.dohUrl, copyDohBtn, [createIcon("copy", 16), "Copy DoH URL"], "Copied DoH URL!");
      });

      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3);" }, [
            createIcon("desktop", 28),
            h("h2", { style: "margin: 0;" }, ["Linux: systemd-resolved or DoH"]),
          ]),
          h("p", { class: "muted" }, [
            "Configure your Linux distribution's DNS resolver or browser with the secure DNS endpoint below:",
          ]),
          h("ol", { class: "stepper-list" }, [
            h("li", {}, [
              h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
                h("span", {}, ["DNS over HTTPS URL:"]),
                h("span", { class: "mono", style: "font-weight: 700; color: var(--accent-coral);" }, [resolver.dohUrl]),
                h("div", { class: "row" }, [copyDohBtn]),
              ]),
            ]),
            h("li", {}, ["In /etc/systemd/resolved.conf or NetworkManager, set the DNS address."]),
            h("li", {}, ["Restart systemd-resolved: sudo systemctl restart systemd-resolved"]),
          ]),
          h("div", { class: "row", style: "margin-top: var(--sp-4);" }, [
            h("a", {
              class: "btn",
              href: resolver.verifyUrl ?? "https://adguard.com/en/test.html",
              target: "_blank",
              rel: "noreferrer",
            }, [
              createIcon("check", 16),
              "Check it worked",
            ]),
          ]),
        ]),
      );
    }
  }

  for (const [id, btn] of tabButtons) {
    btn.addEventListener("click", () => {
      activeTab = id;
      renderDeviceTab();
    });
  }

  select.addEventListener("change", renderDeviceTab);
  renderDeviceTab();

  // Paste verification section
  const pasteBox = h("section", { class: "card", style: "margin-top: var(--sp-6);" }, [
    h("h2", {}, ["Verify Safe DNS"]),
    h("p", { class: "muted" }, [
      "Open your provider's test page above. If it shows verification text, you can paste it here to confirm your protection.",
    ]),
  ]);
  const pasteInput = h("textarea", { placeholder: "Paste the text from the test page here..." });
  const judgeBtn = h("button", { class: "btn primary sm", type: "button" }, [createIcon("check", 16), "Read pasted check"]);
  const pasteResult = h("div", { style: "margin-top: var(--sp-3);" });

  judgeBtn.addEventListener("click", () => {
    const resolverId = (select as HTMLSelectElement).value;
    const res = interpretDnsCheckPaste(resolverId, pasteInput.value);
    pasteResult.replaceChildren(
      h("div", { class: `pill ${res.verdict === "verified" ? "ok" : res.verdict === "not_verified" ? "alert" : "neutral"}` }, [
        res.summary,
      ]),
    );
  });

  pasteBox.append(field("Pasted verification text", pasteInput), judgeBtn, pasteResult);

  root.append(header, resolverCard, tabContainer, contentArea, pasteBox);
  return root;
}

// ----------------------------------------------------
// STATUS & CAPABILITIES
// ----------------------------------------------------
export function pageStatus(): HTMLElement {
  const list = h("div", { class: "grid" });
  for (const item of CAPABILITIES) {
    list.append(
      h("article", { class: "card" }, [
        h("h2", { style: "font-size: 1.15rem;" }, [`${item.id}. ${item.name}`]),
        h("p", { class: "pill ok" }, [item.userStatus.replaceAll("_", " ")]),
        h("p", {}, [item.summary]),
        h("p", { class: "muted-soft" }, [item.limitations]),
      ]),
    );
  }

  const matrix = h("div", { class: "grid" });
  for (const row of platformSupport()) {
    matrix.append(
      h("article", { class: "card" }, [
        h("h2", { style: "font-size: 1.15rem;" }, [row.surface]),
        h("p", {}, [row.manualTools]),
        h("p", { class: "muted-soft" }, [row.evidence]),
      ]),
    );
  }

  const sources = h("div", { class: "grid" });
  for (const source of sourceStatus(false)) {
    sources.append(
      h("article", { class: "card" }, [
        h("h2", { style: "font-size: 1.15rem;" }, [String(source.id)]),
        h("p", {}, [String(source.inputsNote ?? source.title)]),
        h("p", { class: "muted-soft" }, [`Enabled: ${source.enabled}. Hosts: ${source.hosts}.`]),
      ]),
    );
  }

  return h("div", { class: "grid" }, [
    h("h1", {}, ["Capability status"]),
    h("p", { class: "lede" }, ["What this version can do, and what needs setup or the browser extension."]),
    list,
    h("h2", { style: "margin-top: var(--sp-6);" }, ["Platform support"]),
    matrix,
    h("h2", { style: "margin-top: var(--sp-6);" }, ["Sources"]),
    sources,
  ]);
}

// ----------------------------------------------------
// INSTALL PAGE
// ----------------------------------------------------
export function pageInstall(): HTMLElement {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  let deferred: { prompt: () => Promise<void> } | null = null;
  const guideBox = h("div");

  function render() {
    const guide = installInstructions({
      userAgent: navigator.userAgent,
      standalone,
      beforeInstallPrompt: Boolean(deferred),
    });
    guideBox.replaceChildren(
      h("section", { class: "card", style: "margin-top: var(--sp-4);" }, [
        h("h2", {}, [guide.platform]),
        ...guide.steps.map((step) => h("p", {}, [step])),
      ]),
    );
  }

  const button = h("button", { class: "btn primary lg", type: "button", "data-testid": "install-link" }, [
    createIcon("install", 20),
    "Install NXTL Shield",
  ]);

  button.addEventListener("click", async () => {
    if (deferred) {
      await deferred.prompt();
      deferred = null;
      render();
      return;
    }
    guideBox.querySelector("h2")?.scrollIntoView({ behavior: "smooth" });
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as any;
    render();
  });
  render();

  return h("div", { class: "grid" }, [
    h("h1", {}, ["Install NXTL Shield"]),
    h("p", { class: "lede" }, [
      "Install NXTL Shield to your home screen or desktop for fast, offline access anytime.",
    ]),
    h("div", { class: "row" }, [button]),
    guideBox,
  ]);
}

// ----------------------------------------------------
// REPORTS / SETTINGS
// ----------------------------------------------------
export function pageSettings(): HTMLElement {
  const list = h("div", { style: "display: grid; gap: var(--sp-2);" });

  function render() {
    const items = loadReports(localStorage);
    list.replaceChildren(
      items.length
        ? h("p", { style: "font-weight: 600;" }, [`${items.length} saved check${items.length === 1 ? "" : "s"}.`])
        : h("p", { class: "muted" }, ["No saved checks."]),
      ...items.map((item) =>
        h("div", { class: "card", style: "padding: var(--sp-3);" }, [
          h("p", { class: "mono", style: "margin: 0;" }, [`${item.at} · ${item.kind} · ${item.verdict}`]),
          h("p", { class: "mono muted-soft", style: "margin: 4px 0 0;" }, [item.redacted]),
        ]),
      ),
    );
  }

  const exportButton = h("button", { type: "button", class: "btn" }, [
    createIcon("download", 16),
    "Export reports",
  ]);
  exportButton.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(loadReports(localStorage), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = h("a", { href: url, download: "nxtl-shield-reports.json" }, ["export"]);
    anchor.click();
    URL.revokeObjectURL(url);
  });

  const wipe = h("button", { type: "button", class: "btn ghost" }, [
    createIcon("trash", 16),
    "Delete saved checks",
  ]);
  wipe.addEventListener("click", () => {
    clearReports(localStorage);
    render();
  });

  render();
  return h("div", { class: "grid" }, [
    h("h1", {}, ["Saved reports"]),
    h("p", { class: "lede" }, [
      "Recent security checks saved locally in this browser. Passwords and file contents are never stored.",
    ]),
    h("div", { class: "row", style: "gap: var(--sp-3); margin-bottom: var(--sp-4);" }, [exportButton, wipe]),
    list,
  ]);
}

// ----------------------------------------------------
// HOW IT WORKS & PRIVACY
// ----------------------------------------------------
export function pagePrivacy(): HTMLElement {
  const root = h("div", { class: "grid" });

  const header = h("div", {}, [
    h("h1", {}, ["How it works & privacy"]),
    h("p", { class: "lede" }, [
      "NXTL Shield is designed for zero-knowledge privacy: your links, messages, passwords, and files never leave your device.",
    ]),
  ]);

  const privacyCard = h("section", { class: "card" }, [
    h("h2", {}, ["Local, zero-knowledge processing"]),
    h("p", {}, [
      "All security checks run locally inside your web browser. When you check a link, scan a message, inspect a file, or generate a password, no data is sent to NXTL or any central server.",
    ]),
    h("p", { class: "muted" }, [
      "There are no user accounts, no tracking cookies, no advertising beacons, and no telemetry.",
    ]),
  ]);

  const sourcesCard = h("section", { class: "card", style: "margin-top: var(--sp-4);" }, [
    h("div", { class: "row", style: "align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-3);" }, [
      h("h2", { style: "margin: 0;" }, ["Threat lists & sources"]),
      h("span", { class: "pill ok" }, [`Lists updated: ${SNAPSHOT_MANIFEST.version}`]),
    ]),
    h("p", {}, [
      "NXTL Shield bundles curated threat lists from trusted open-source security intelligence feeds. These are automatically updated and tested via scheduled builds:",
    ]),
    h("ul", { style: "line-height: 1.8; margin-left: var(--sp-4);" }, [
      h("li", {}, [h("strong", {}, ["HaGeZi Multi PRO & TIF: "]), "High-confidence malicious domains, scam infrastructure, and tracking networks."]),
      h("li", {}, [h("strong", {}, ["URLhaus / abuse.ch: "]), "Live verified malware distribution and ransomware domains."]),
      h("li", {}, [h("strong", {}, ["AdGuard / EasyList: "]), "Advertising networks, analytics beacons, and cosmetic element filters."]),
    ]),
  ]);

  const externalCard = h("section", { class: "card", style: "margin-top: var(--sp-4);" }, [
    h("h2", {}, ["External lookups (only when you click)"]),
    h("p", {}, [
      "Shield only touches the network when you explicitly trigger an external lookup:",
    ]),
    h("ul", { style: "line-height: 1.8; margin-left: var(--sp-4);" }, [
      h("li", {}, [h("strong", {}, ["Password leak check: "]), "Uses k-anonymity to query api.pwnedpasswords.com with only the first 5 characters of the SHA-1 hash. Your password is never sent."]),
      h("li", {}, [h("strong", {}, ["Connection Doctor: "]), "Queries api.ipify.org to display your public IP address only when you click 'Look up public IP'."]),
      h("li", {}, [h("strong", {}, ["eSIM rates: "]), "Queries the nxtlsim.com pricing API when you look up rates for a destination."]),
    ]),
  ]);

  const openSourceCard = h("section", { class: "card", style: "margin-top: var(--sp-4);" }, [
    h("h2", {}, ["Free & open source (GPLv3)"]),
    h("p", {}, [
      "NXTL Shield is 100% free software under the GNU General Public License v3.0. You can inspect every line of code, build it yourself, or contribute improvements.",
    ]),
    h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
      h("a", {
        class: "btn primary",
        href: "https://github.com/nxtlsim/nxtl-shield",
        target: "_blank",
        rel: "noreferrer",
      }, [
        createIcon("external", 16),
        "View source code on GitHub",
      ]),
    ]),
  ]);

  root.append(header, privacyCard, sourcesCard, externalCard, openSourceCard);
  return root;
}
