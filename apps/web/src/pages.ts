import {
  CAPABILITIES,
  NXTL_LINKS,
  RESOLVERS,
  buildMobileconfig,
  checkText,
  checkUrl,
  cleanUrl,
  explainRates,
  fetchConnectionInfo,
  generatePassword,
  hibpLookup,
  inspectFile,
  installInstructions,
  loadReports,
  locationPrivacySetup,
  makeReport,
  passwordStrength,
  platformSupport,
  probeDns,
  saveReports,
  clearReports,
  sourceStatus,
  type ReportEntry,
} from "@nxtl/core";
import { QRCodeWriter, BarcodeFormat } from "@zxing/library";
import { queryExtension } from "./bridge";
import { field, h, resultCard, introBlock, faqSection } from "./dom";
import { createIcon, type IconName } from "./icons";
import { loadReputation } from "./lists";
import {
  diagramCheck,
  diagramConnection,
  diagramDns,
  diagramPassword,
} from "./diagrams";

export function renderCheckingPlaceholder(text = "Checking against threat intelligence databases..."): HTMLElement {
  return h("div", { class: "scanning-container" }, [
    h("div", { class: "scan-bar" }, [
      h("div", { class: "scan-bar-indeterminate" }),
    ]),
    h("p", { class: "muted-soft", style: "font-size: 0.9rem;" }, [text]),
  ]);
}

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
    button.replaceChildren(createIcon("check", 14), " " + copiedLabel);
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
      h("p", { class: "muted-soft", style: "margin: 0 0 12px;" }, [
        "Blocks malicious websites and phishing domains across every app on your phone or computer.",
      ]),
      h("a", { class: "btn primary", href: "#/setup" }, ["Set up Safe DNS", createIcon("arrow-right", 14)]),
    ]),
    h("div", { class: "guide-step-card" }, [
      h("span", { class: "guide-step-number" }, ["Step 2 · Browser"]),
      h("h3", { style: "font-size: 1.05rem; margin-bottom: 4px;" }, ["Add browser extension"]),
      h("p", { class: "muted-soft", style: "margin: 0 0 12px;" }, [
        "Adds continuous ad & tracker blocking, URL cleaning, and live malicious site alerts in your browser.",
      ]),
      ext
        ? h("span", { class: "pill ok" }, [createIcon("check", 14), "On"])
        : h("a", { class: "btn primary", href: "#/extension" }, ["Add extension", createIcon("arrow-right", 14)]),
    ]),
    h("div", { class: "guide-step-card" }, [
      h("span", { class: "guide-step-number" }, ["Step 3 · Standby"]),
      h("h3", { style: "font-size: 1.05rem; margin-bottom: 4px;" }, ["Install NXTL Shield"]),
      h("p", { class: "muted-soft", style: "margin: 0 0 12px;" }, [
        "Keep these free tools one tap away on your home screen or desktop for fast checks anytime.",
      ]),
      standalone
        ? h("span", { class: "pill ok" }, [createIcon("check", 14), "Installed"])
        : h("a", { class: "btn primary", href: "#/install" }, ["Install app", createIcon("arrow-right", 14)]),
    ]),
  ]);

  guideBanner.append(guideHeader, guideSteps);

  // Hero Section
  const hero = h("section", { class: "hero-launcher" }, [
    h("h1", {}, ["Check a link before you open it."]),
    h("p", { class: "hero-lede" }, [
      "Paste a link, message, or QR code before you open it.",
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
    class: "sr-only",
    tabindex: "-1",
    "aria-hidden": "true",
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
    heroResultContainer.replaceChildren(renderCheckingPlaceholder("Checking reputation lists..."));

    try {
      const reputation = await loadReputation();
      if (normalized.type === "url") {
        const res = checkUrl(normalized.value, reputation);
        const card = resultCard(res);
        heroResultContainer.replaceChildren(card);
        reportsAdd(makeReport("url", res.verdict, normalized.value));
      } else {
        const res = checkText(normalized.value, reputation);
        const card = resultCard({ ...res, isText: true });
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
  const dnsPill = h("span", { class: "pill neutral" }, [h("span", { class: "status-dot" }), "Not checked yet"]);
  const dnsActionContainer = h("div", {});

  const dnsRow = h("div", { class: "status-row" }, [
    h("div", { class: "status-label-group" }, [
      h("span", { class: "status-label" }, [
        createIcon("dns", 18),
        "Safe DNS protection",
      ]),
      dnsPill,
    ]),
    dnsActionContainer,
  ]);

  // Asynchronously probe real DNS status without faking
  probeDns().then((dns) => {
    if (dns.status === "on") {
      dnsPill.className = "pill ok";
      dnsPill.replaceChildren(createIcon("check", 12), "On");
      dnsActionContainer.replaceChildren();
    } else if (dns.status === "off") {
      dnsPill.className = "pill neutral";
      dnsPill.replaceChildren(h("span", { class: "status-dot" }), "Off");
      dnsActionContainer.replaceChildren(
        h("a", { class: "btn primary", href: "#/setup" }, ["Set up Safe DNS", createIcon("arrow-right", 12)]),
      );
    } else {
      dnsPill.className = "pill neutral";
      dnsPill.replaceChildren(h("span", { class: "status-dot" }), "Not checked yet");
      dnsActionContainer.replaceChildren(
        h("a", { class: "btn", href: "#/setup" }, ["Set up Safe DNS", createIcon("arrow-right", 12)]),
      );
    }
  }).catch(() => {
    dnsPill.className = "pill neutral";
    dnsPill.replaceChildren(h("span", { class: "status-dot" }), "Not checked yet");
    dnsActionContainer.replaceChildren(
      h("a", { class: "btn", href: "#/setup" }, ["Set up Safe DNS", createIcon("arrow-right", 12)]),
    );
  });

  const extPill = ext
    ? h("span", { class: "pill ok" }, [createIcon("check", 12), "On"])
    : h("span", { class: "pill neutral" }, [h("span", { class: "status-dot" }), "Not added"]);

  const extRow = h("div", { class: "status-row" }, [
    h("div", { class: "status-label-group" }, [
      h("span", { class: "status-label" }, [
        createIcon("extension", 18),
        "Browser extension",
      ]),
      extPill,
    ]),
    !ext
      ? h("a", { class: "btn", href: "#/extension" }, ["Add extension", createIcon("arrow-right", 12)])
      : "",
  ]);

  const appPill = standalone
    ? h("span", { class: "pill ok" }, [createIcon("check", 12), "Installed"])
    : h("span", { class: "pill neutral" }, [h("span", { class: "status-dot" }), "Using website"]);

  const appRow = h("div", { class: "status-row" }, [
    h("div", { class: "status-label-group" }, [
      h("span", { class: "status-label" }, [
        createIcon("install", 18),
        "Offline app standby",
      ]),
      appPill,
    ]),
    !standalone
      ? h("a", { class: "btn ghost", href: "#/install" }, ["Install app", createIcon("arrow-right", 12)])
      : "",
  ]);

  const statusSection = h("section", { class: "card", "data-testid": "protection-status" }, [
    h("div", { class: "row", style: "align-items: center; justify-content: space-between; margin-bottom: var(--sp-4);" }, [
      h("h2", { style: "margin: 0; font-size: 1.25rem;" }, ["Protection status"]),
      h("span", { class: "muted-soft", style: "font-size: 0.88rem;" }, ["Real-time device check"]),
    ]),
    h("div", { class: "status-list" }, [
      extRow,
      dnsRow,
      appRow,
    ]),
  ]);

  // All Protections Grid (practical order from Section 5)
  const allTilesSection = h("section", { "aria-label": "All Protections and Tools" }, [
    h("h2", { style: "font-size: 1.35rem; margin-bottom: var(--sp-2);" }, ["All protections and tools"]),
    h("p", { class: "muted", style: "margin-bottom: var(--sp-4);" }, [
      "Privacy and protection tools for phone, desktop, and travel.",
    ]),
  ]);

  const tilesGrid = h("div", { class: "tiles-grid" });

  const TOOLS = [
    {
      href: "#/check",
      icon: "search",
      title: "Check a link or message",
      desc: "Test suspicious links, SMS lures, and QR codes before tapping or replying.",
    },
    {
      href: "#/setup",
      icon: "dns",
      title: "Safe DNS (whole device)",
      desc: "Block ads, trackers, and scam domains across every app on your phone or PC.",
    },
    {
      href: "#/ad-blocker",
      icon: "ad-block",
      title: "Ad & tracker blocker",
      desc: "Stop intrusive advertisements, banners, and analytics trackers across your browsing.",
    },
    {
      href: "#/extension",
      icon: "extension",
      title: "Browser extension",
      desc: "Continuous ad blocking, scam alerts, and URL cleaning inside Chrome and Firefox.",
    },
    {
      href: "#/password",
      icon: "password",
      title: "Password generator",
      desc: "Create strong random passwords on your device and check if they appeared in leaks.",
    },
    {
      href: "#/messages",
      icon: "share-lock",
      title: "Private messages & files",
      desc: "Encrypt confidential text and files with a password before sending via chat or email.",
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
      title: "Your connection",
      desc: "See what websites see about you, and check whether Safe DNS is actually on.",
    },
    {
      href: "#/location",
      icon: "location",
      title: "Location privacy",
      desc: "Audit and prevent websites and ad networks from tracking your physical location.",
    },
    {
      href: "#/install",
      icon: "install",
      title: "Install app",
      desc: "Keep NXTL Shield one tap away on your home screen or desktop for fast checks.",
    },
    {
      href: "#/esim",
      icon: "esim",
      title: "NXTL eSIM",
      desc: "Travel data in 180+ countries. One eSIM and a balance that does not expire.",
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
    h("div", { class: "esim-card-inner" }, [
      h("div", { class: "esim-card-content" }, [
        h("div", { class: "tile-icon", style: "width: 44px; height: 44px; flex-shrink: 0;" }, [createIcon("esim", 24)]),
        h("div", { class: "esim-card-text" }, [
          h("h3", { style: "margin: 0; font-size: 1.15rem;" }, ["Traveling abroad? Connect with NXTL eSIM"]),
          h("p", { class: "muted", style: "margin: 4px 0 0;" }, [
            "Affordable travel data in 180+ countries. Routes your traffic via London for consistent privacy abroad.",
          ]),
        ]),
      ]),
      h("a", {
        class: "btn primary esim-card-btn",
        href: NXTL_LINKS.pricing,
        target: "_blank",
        rel: "noreferrer",
      }, [
        "See plans",
        createIcon("external", 16),
      ]),
    ]),
  ]);

  // Share Shield Companion Card
  const shareShieldCard = h("section", { class: "card share-shield-card", style: "margin-top: var(--sp-4);" }, [
    h("div", { class: "esim-card-inner" }, [
      h("div", { class: "esim-card-content" }, [
        h("div", { class: "tile-icon", style: "width: 44px; height: 44px; flex-shrink: 0;" }, [createIcon("shield", 24)]),
        h("div", { class: "esim-card-text" }, [
          h("h3", { style: "margin: 0; font-size: 1.15rem;" }, ["Share Shield"]),
          h("p", { class: "muted", style: "margin: 4px 0 0;" }, [
            "Know someone who gets scam texts? Share Shield with them.",
          ]),
        ]),
      ]),
      h("a", {
        class: "btn primary esim-card-btn",
        href: "#/share-app",
      }, [
        "Share Shield",
        createIcon("arrow-right", 16),
      ]),
    ]),
  ]);

  root.append(guideBanner, hero, statusSection, allTilesSection, esimCard, shareShieldCard);
  return root;
}

function makeCheckWorkedRow(): HTMLElement {
  const probeResultBox = h("div", { style: "margin-top: var(--sp-3);" });
  const checkBtn = h("button", { class: "btn sm", type: "button" }, [
    createIcon("check", 14),
    "Check it worked",
  ]);
  checkBtn.addEventListener("click", async () => {
    checkBtn.disabled = true;
    probeResultBox.replaceChildren(h("span", { class: "pill neutral" }, ["Checking DNS..."]));
    try {
      const res = await probeDns();
      if (res.status === "on") {
        probeResultBox.replaceChildren(
          h("div", { class: "banner ok" }, [createIcon("check", 14), " Safe DNS is on."]),
        );
      } else if (res.status === "off") {
        probeResultBox.replaceChildren(
          h("div", { class: "banner alert" }, ["Safe DNS is off. Finish setup, then check again."]),
        );
      } else {
        probeResultBox.replaceChildren(
          h("div", { class: "banner" }, ["Could not check yet. Check your internet and try again."]),
        );
      }
    } catch {
      probeResultBox.replaceChildren(
        h("div", { class: "banner" }, ["Could not check yet. Check your internet and try again."]),
      );
    } finally {
      checkBtn.disabled = false;
    }
  });

  return h("div", { style: "margin-top: var(--sp-4);" }, [
    h("div", { class: "row", style: "align-items: center; gap: var(--sp-3); flex-wrap: wrap;" }, [
      checkBtn,
    ]),
    probeResultBox,
  ]);
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
  const adBlockExtPill = h("span", { class: `pill ${ext?.blockingEnabled ? "ok" : "neutral"}` }, [
    ext?.blockingEnabled ? createIcon("check", 12) : h("span", { class: "status-dot" }),
    ext?.blockingEnabled ? "On" : "Not added",
  ]);
  const adDnsPill = h("span", { class: "pill neutral" }, [h("span", { class: "status-dot" }), "Not checked yet"]);
  const adDnsAction = h("a", { class: "btn", href: "#/setup" }, ["Set up Safe DNS", createIcon("arrow-right", 12)]);

  probeDns().then(dns => {
    if (dns.status === "on") {
      adDnsPill.className = "pill ok";
      adDnsPill.replaceChildren(createIcon("check", 12), "On");
      adDnsAction.remove();
    } else if (dns.status === "off") {
      adDnsPill.className = "pill neutral";
      adDnsPill.replaceChildren(h("span", { class: "status-dot" }), "Off");
    }
  }).catch(() => {});

  const statusCard = h("section", { class: "card", "data-testid": "adblocker-status" }, [
    h("h2", {}, ["Protection status"]),
    h("div", { class: "status-row" }, [
      h("div", { class: "status-label-group" }, [
        h("span", { class: "status-label" }, [createIcon("extension", 18), "Browser ad blocking"]),
        adBlockExtPill,
      ]),
      !ext ? h("a", { class: "btn", href: "#/extension" }, ["Add extension", createIcon("arrow-right", 12)]) : "",
    ]),
    h("div", { class: "status-row" }, [
      h("div", { class: "status-label-group" }, [
        h("span", { class: "status-label" }, [createIcon("dns", 18), "Whole-device Safe DNS"]),
        adDnsPill,
      ]),
      adDnsAction,
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
      makeCheckWorkedRow(),
    );
  } else if (device.os === "ios") {
    const profile = buildMobileconfig("adguard-default");
    const downloadBtn = h("button", { class: "btn primary", type: "button" }, [
      createIcon("download", 18),
      "Download Safe DNS profile",
    ]);
    downloadBtn.addEventListener("click", () => {
      const blob = new Blob([profile.plist], { type: "application/x-apple-aspen-config" });
      const url = URL.createObjectURL(blob);
      const a = h("a", { href: url, download: profile.filename }, ["profile"]);
      a.click();
      URL.revokeObjectURL(url);
    });

    recommendedSection.append(
      h("h2", {}, ["iPhone & iPad: Safe DNS profile"]),
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
      makeCheckWorkedRow(),
    );
  } else {
    // Other / Linux
    recommendedSection.append(
      h("h2", {}, ["Safe DNS setup"]),
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
      h("h3", {}, ["Way 1: Browser extension"]),
      h("p", { class: "muted" }, [
        "Best for detailed ad-blocking on websites. Removes banner ads, blocks tracking scripts, and hides cookie consent banners.",
      ]),
      h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
        h("a", { class: "btn sm", href: "#/extension" }, ["Browser extension guide", createIcon("arrow-right", 14)]),
      ]),
    ]),
    h("article", { class: "card" }, [
      h("div", { class: "tile-icon", style: "margin-bottom: var(--sp-3);" }, [createIcon("dns", 24)]),
      h("h3", {}, ["Way 2: Whole-device Safe DNS"]),
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
      "Use Private messages & files whenever you need to send sensitive messages or files.",
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

    const probeResultBox = h("div", { style: "margin-top: var(--sp-3);" });
    const checkBtn = h("button", { class: "btn sm", type: "button" }, [
      createIcon("check", 14),
      "Check it worked",
    ]);
    checkBtn.addEventListener("click", async () => {
      checkBtn.disabled = true;
      probeResultBox.replaceChildren(h("span", { class: "pill neutral" }, ["Checking DNS..."]));
      try {
        const res = await probeDns();
        if (res.status === "on") {
          probeResultBox.replaceChildren(
            h("div", { class: "banner ok" }, [createIcon("check", 14), " Safe DNS is on."]),
          );
        } else if (res.status === "off") {
          probeResultBox.replaceChildren(
            h("div", { class: "banner alert" }, ["Safe DNS is off. Finish setup, then check again."]),
          );
        } else {
          probeResultBox.replaceChildren(
            h("div", { class: "banner" }, ["Could not check yet. Check your internet and try again."]),
          );
        }
      } catch {
        probeResultBox.replaceChildren(
          h("div", { class: "banner" }, ["Could not check yet. Check your internet and try again."]),
        );
      } finally {
        checkBtn.disabled = false;
      }
    });

    if (platform === "android") {
      const copyBtn = h("button", { class: "btn primary sm", type: "button" }, [createIcon("copy", 16), "Copy hostname"]);
      copyBtn.addEventListener("click", () => {
        copyToClipboard("dns.adguard-dns.com", copyBtn, [createIcon("copy", 16), "Copy hostname"], "Copied hostname!");
      });

      const openSettingsBtn = detectDevice().os === "android"
        ? h("a", {
            class: "btn sm",
            href: "intent:#Intent;action=android.settings.PRIVATE_DNS_SETTINGS;end",
          }, [createIcon("arrow-right", 14), "Open Private DNS settings"])
        : "";

      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3);" }, [
            createIcon("android", 28),
            h("h2", { style: "margin: 0;" }, ["Android private DNS setup"]),
          ]),
          h("p", { class: "muted" }, [
            "Android natively supports encrypted Private DNS. This blocks ads, trackers, and scam sites across Chrome, Samsung Internet, and all mobile apps.",
          ]),
          h("ol", { class: "stepper-list" }, [
            h("li", {}, [
              h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
                h("span", {}, ["Copy this hostname: "]),
                h("span", { class: "mono", style: "font-weight: 700; color: var(--accent-coral);" }, ["dns.adguard-dns.com"]),
                h("div", { class: "row", style: "gap: var(--sp-2); flex-wrap: wrap;" }, [copyBtn, ...(openSettingsBtn ? [openSettingsBtn] : [])]),
              ]),
            ]),
            openSettingsBtn
              ? h("li", {}, ["Tap Open Private DNS settings, paste the hostname, and tap Save."])
              : h("li", {}, ["On your Android phone, open Settings → Network & internet → Private DNS, paste the hostname, and tap Save."]),
            h("li", {}, ["Select 'Private DNS provider hostname'."]),
            h("li", {}, ["Paste dns.adguard-dns.com and tap Save. All internet lookups are now protected."]),
          ]),
          h("div", { class: "row", style: "margin-top: var(--sp-4); align-items: center; gap: var(--sp-3); flex-wrap: wrap;" }, [
            checkBtn,
          ]),
          probeResultBox,
        ]),
      );
    } else {
      const downloadBtn = h("a", {
        class: "btn primary",
        href: `${import.meta.env.BASE_URL}downloads/nxtl-shield.mobileconfig`,
        download: "nxtl-shield.mobileconfig",
      }, [
        createIcon("download", 18),
        "Download iPhone profile",
      ]);

      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3);" }, [
            createIcon("apple", 28),
            h("h2", { style: "margin: 0;" }, ["iPhone & iPad: Safe DNS profile"]),
          ]),
          h("p", { class: "muted" }, [
            "Apple iOS natively supports encrypted DNS profiles to protect Safari and all apps.",
          ]),
          h("ol", { class: "stepper-list" }, [
            h("li", {}, [
              h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
                h("span", {}, ["Download the official Apple profile (open in Safari):"]),
                h("div", { class: "row" }, [downloadBtn]),
              ]),
            ]),
            h("li", {}, ["Open Settings on your iPhone or iPad."]),
            h("li", {}, ["Tap Profile Downloaded near the top."]),
            h("li", {}, ["Tap Install in the top right and enter your passcode."]),
          ]),
          h("div", { class: "row", style: "margin-top: var(--sp-4); align-items: center; gap: var(--sp-3); flex-wrap: wrap;" }, [
            checkBtn,
          ]),
          probeResultBox,
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
        h("a", { class: "btn sm", href: "#/messages" }, ["Open Private messages & files", createIcon("arrow-right", 14)]),
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
  const extStatusPill = h("span", { class: `pill ${ext ? "ok" : "neutral"}` }, [
    ext ? createIcon("check", 12) : h("span", { class: "status-dot" }),
    ext ? "On" : "Not added",
  ]);

  const checkAgainBtn = h("button", { class: "btn", type: "button" }, [
    createIcon("refresh", 16),
    "Check again",
  ]);

  const statusBox = h("section", { class: "card", "data-testid": "extension-status" }, [
    h("div", { class: "status-row" }, [
      h("div", { class: "status-label-group" }, [
        h("span", { class: "status-label" }, [createIcon("extension", 18), "Browser extension"]),
        extStatusPill,
      ]),
      checkAgainBtn,
    ]),
  ]);

  checkAgainBtn.addEventListener("click", async () => {
    checkAgainBtn.disabled = true;
    checkAgainBtn.textContent = "Checking...";
    const fresh = await queryExtension(1200);
    checkAgainBtn.disabled = false;
    checkAgainBtn.replaceChildren(createIcon("refresh", 16), "Check again");
    extStatusPill.className = `pill ${fresh ? "ok" : "neutral"}`;
    extStatusPill.replaceChildren(
      fresh ? createIcon("check", 12) : h("span", { class: "status-dot" }),
      fresh ? "On" : "Not added",
    );
  });

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
      "Paste a link, message, or QR code before you open it.",
    ]),
  ]);

  const diagram = diagramCheck();

  const tabs = h("div", { class: "tabs", role: "tablist" });
  const panel = h("div", { id: "check-panel" });
  const names = [
    ["link", "Link", "link"],
    ["message", "Message", "message"],
    ["file", "File", "file"],
    ["qr", "QR code", "qr"],
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

  root.append(header, tabs, panel, intro, diagram);
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
    out.replaceChildren(renderCheckingPlaceholder("Checking against threat intelligence databases..."));

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
    placeholder: "Paste SMS, email, or chat message text here...",
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
    out.replaceChildren(renderCheckingPlaceholder("Scanning message patterns..."));

    try {
      const reputation = await loadReputation();
      const res = checkText(raw, reputation);
      const card = resultCard({ ...res, isText: true });
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
  const fileInput = h("input", {
    type: "file",
    class: "sr-only",
    "data-testid": "check-input",
    "aria-label": "Choose a file to inspect",
  }) as HTMLInputElement;

  const dropZone = h("div", {
    class: "file-drop",
    tabindex: "0",
    role: "button",
    "aria-label": "Choose a file to inspect",
  }, [
    h("div", { class: "file-drop-inner" }, [
      h("div", { class: "file-drop-icon" }, [createIcon("file", 32)]),
      h("div", { class: "file-drop-text" }, [
        h("span", { class: "file-drop-title" }, ["Choose a file or drop it here"]),
        h("span", { class: "file-drop-hint" }, ["Inspect file type and safety locally"]),
      ]),
    ]),
  ]);

  const filePickerContainer = h("div", { class: "file-picker-container" });
  const out = h("div");

  function renderEmpty() {
    filePickerContainer.replaceChildren(dropZone);
  }

  function renderSelected(file: File) {
    const removeBtn = h("button", {
      type: "button",
      class: "btn ghost sm",
      "aria-label": "Remove",
    }, [
      createIcon("trash", 14),
      "Remove",
    ]);
    removeBtn.addEventListener("click", () => {
      fileInput.value = "";
      renderEmpty();
      out.replaceChildren();
    });

    const info = h("div", {
      class: "file-selected-chip",
      style: "display: flex; align-items: center; justify-content: space-between; padding: var(--sp-3); background: var(--raised); border: 1px solid var(--line); border-radius: 2px;",
    }, [
      h("span", { class: "mono", style: "font-weight: 600;" }, [`${file.name} (${(file.size / 1024).toFixed(1)} KB)`]),
      removeBtn,
    ]);
    filePickerContainer.replaceChildren(info);
  }

  renderEmpty();

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer?.files.length) {
      fileInput.files = e.dataTransfer.files;
      const file = fileInput.files?.[0];
      if (file) renderSelected(file);
    }
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) renderSelected(file);
  });

  const button = h("button", { class: "primary", type: "button", "data-testid": "check-run" }, [
    createIcon("search", 18),
    "Inspect file",
  ]);

  button.addEventListener("click", async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      out.replaceChildren(h("p", { class: "banner" }, ["Choose a file first."]));
      return;
    }
    button.disabled = true;
    out.replaceChildren(renderCheckingPlaceholder("Inspecting file type and structure..."));
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
    field("File to inspect", h("div", {}, [fileInput, filePickerContainer])),
    h("div", { class: "row" }, [button]),
    out,
  ]);
}

function qrForm() {
  const fileInput = h("input", {
    type: "file",
    accept: "image/*",
    class: "sr-only",
    "data-testid": "check-input",
    "aria-label": "Choose a QR code image",
  }) as HTMLInputElement;

  const dropZone = h("div", {
    class: "file-drop",
    tabindex: "0",
    role: "button",
    "aria-label": "Choose a QR code image",
  }, [
    h("div", { class: "file-drop-inner" }, [
      h("div", { class: "file-drop-icon" }, [createIcon("qr", 32)]),
      h("div", { class: "file-drop-text" }, [
        h("span", { class: "file-drop-title" }, ["Choose a QR picture or drop it here"]),
        h("span", { class: "file-drop-hint" }, ["PNG, JPG, or WebP screenshot"]),
      ]),
    ]),
  ]);

  const qrPickerContainer = h("div", { class: "file-picker-container" });
  const out = h("div");

  function renderEmpty() {
    qrPickerContainer.replaceChildren(dropZone);
  }

  function renderSelected(file: File) {
    const removeBtn = h("button", {
      type: "button",
      class: "btn ghost sm",
      "aria-label": "Remove",
    }, [
      createIcon("trash", 14),
      "Remove",
    ]);
    removeBtn.addEventListener("click", () => {
      fileInput.value = "";
      renderEmpty();
      out.replaceChildren();
    });

    const info = h("div", {
      class: "file-selected-chip",
      style: "display: flex; align-items: center; justify-content: space-between; padding: var(--sp-3); background: var(--raised); border: 1px solid var(--line); border-radius: 2px;",
    }, [
      h("span", { class: "mono", style: "font-weight: 600;" }, [file.name]),
      removeBtn,
    ]);
    qrPickerContainer.replaceChildren(info);
  }

  renderEmpty();

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer?.files.length) {
      fileInput.files = e.dataTransfer.files;
      const file = fileInput.files?.[0];
      if (file) renderSelected(file);
    }
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) renderSelected(file);
  });

  const button = h("button", { class: "primary", type: "button", "data-testid": "check-run" }, [
    createIcon("search", 18),
    "Read QR image",
  ]);

  button.addEventListener("click", async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      out.replaceChildren(h("p", { class: "banner" }, ["Choose a QR picture first."]));
      return;
    }
    button.disabled = true;
    out.replaceChildren(renderCheckingPlaceholder("Scanning QR code..."));
    try {
      if (!("BarcodeDetector" in window)) {
        out.replaceChildren(
          h("p", { class: "banner alert" }, [
            "Your browser does not support QR image reading directly. Scan the QR code with your camera app and paste the text into Check.",
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
          h("p", { class: "mono", style: "word-break: break-all; margin-bottom: var(--sp-3);" }, [`Decoded address: ${norm.value}`]),
          card,
        );
        reportsAdd(makeReport("url", res.verdict, norm.value));
      } else {
        const res = checkText(raw, reputation);
        const card = resultCard({ ...res, isText: true });
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
    field("QR code picture", h("div", {}, [fileInput, qrPickerContainer])),
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
  const undo = h("button", { type: "button", class: "btn ghost", style: "display: none;" }, [
    createIcon("refresh", 16),
    "Undo",
  ]);

  button.addEventListener("click", () => {
    previous = input.value;
    const result = cleanUrl(input.value);
    undo.style.display = result.changed ? "inline-flex" : "none";

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
    undo.style.display = "none";
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
    h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
      field("URL to clean", input),
      h("div", { class: "row" }, [button, undo]),
      out,
    ]),
    intro,
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
    what: "Create a strong password or passphrase on this device. Nothing is stored or sent unless you choose the optional leak check.",
    howSteps: [
      "Choose your length and whether to include symbols.",
      "Click New password to generate one.",
      "Click Copy password, then save it in your password manager.",
    ],
    limit: "Passwords are created on this device and never leave it, unless you run the optional leak check.",
    howItWorks: "The optional leak check only asks a public leak database whether a short, incomplete fingerprint of the password has been seen before. Your full password is never sent.",
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

  const diagram = diagramPassword();
  root.append(header, controls, intro, diagram);
  return root;
}

// ----------------------------------------------------
// YOUR CONNECTION (REPLACE CONNECTION DOCTOR)
// ----------------------------------------------------
export async function pageConnection(): Promise<HTMLElement> {
  const root = h("div", { class: "grid" });

  const header = h("div", {}, [
    h("h1", {}, ["Your connection"]),
    h("p", { class: "lede" }, ["See what websites see about you, and check whether Safe DNS is on."]),
  ]);

  const intro = introBlock({
    what: "Websites and shops see an address for your connection, and a rough city for that address. Use this to check you are on the network you expect, and that Shield's Safe DNS is actually on.",
    when: [
      "I connected to cafe Wi-Fi — is my address and city what I expect?",
      "I turned on Safe DNS — is it really active and blocking threats?",
      "To check whether your internet provider exposes an IPv6 address.",
    ],
    howSteps: [
      "Review your public address, location, and provider below.",
      "Check the Safe DNS status row to verify active protection.",
      "Click Refresh anytime you change Wi-Fi networks or activate Safe DNS.",
    ],
    limit: "City and provider come from a public address lookup. They are what most websites would also see.",
  });

  const diagram = diagramConnection();

  const out = h("div", { "data-testid": "connection-result" });
  const refreshBtn = h("button", { type: "button", class: "btn primary", "data-testid": "connection-refresh" }, [
    createIcon("refresh", 18),
    "Refresh",
  ]);

  async function loadConnectionData(force = false) {
    refreshBtn.disabled = true;
    out.replaceChildren(renderCheckingPlaceholder("Checking your connection and Safe DNS..."));

    try {
      const [conn, dns] = await Promise.all([
        fetchConnectionInfo(force).catch(() => null),
        probeDns().catch(() => ({ status: "unknown" as const, detail: "Could not check DNS." })),
      ]);

      if (!conn) {
        out.replaceChildren(
          h("div", { class: "banner alert", style: "margin-top: var(--sp-4);" }, [
            "Could not read your connection just now. Check your internet and tap Refresh.",
          ]),
        );
        return;
      }

      // IPv4 row
      const ipv4CopyBtn = h("button", { class: "btn ghost sm", type: "button" }, [createIcon("copy", 14), "Copy"]);
      ipv4CopyBtn.addEventListener("click", () => {
        if (conn.ipv4) copyToClipboard(conn.ipv4, ipv4CopyBtn, [createIcon("copy", 14), "Copy"]);
      });

      const ipv4Row = h("div", { class: "status-row" }, [
        h("span", { class: "status-label" }, [createIcon("connection", 18), "IPv4 address"]),
        h("div", { class: "cluster" }, [
          h("span", { class: "mono", style: "font-weight: 600;" }, [conn.ipv4 || "None detected"]),
          conn.ipv4 ? ipv4CopyBtn : "",
        ]),
      ]);

      // IPv6 row
      const ipv6CopyBtn = h("button", { class: "btn ghost sm", type: "button" }, [createIcon("copy", 14), "Copy"]);
      ipv6CopyBtn.addEventListener("click", () => {
        if (conn.ipv6) copyToClipboard(conn.ipv6, ipv6CopyBtn, [createIcon("copy", 14), "Copy"]);
      });

      const ipv6Row = h("div", { class: "status-row" }, [
        h("span", { class: "status-label" }, [createIcon("connection", 18), "IPv6 address"]),
        h("div", { class: "cluster" }, [
          conn.ipv6
            ? h("span", { class: "mono", style: "font-weight: 600;" }, [conn.ipv6])
            : h("span", { class: "muted-soft" }, ["No IPv6 seen"]),
          conn.ipv6 ? ipv6CopyBtn : "",
        ]),
      ]);

      // Location row
      const locText = [conn.city, conn.country].filter(Boolean).join(", ") || "Unknown location";
      const locRow = h("div", { class: "status-row" }, [
        h("span", { class: "status-label" }, [createIcon("location", 18), "Location"]),
        h("span", { style: "font-weight: 600;" }, [
          conn.flagEmoji ? `${conn.flagEmoji} ` : "",
          locText,
        ]),
      ]);

      // Provider row
      const providerRow = h("div", { class: "status-row" }, [
        h("span", { class: "status-label" }, [createIcon("shield", 18), "Network provider"]),
        h("span", { style: "font-weight: 600;" }, [conn.provider || "Not seen"]),
      ]);

      // DNS row
      let dnsPill: HTMLElement;
      let dnsAction: HTMLElement | string = "";
      if (dns.status === "on") {
        dnsPill = h("span", { class: "pill ok" }, [createIcon("check", 12), "On"]);
      } else if (dns.status === "off") {
        dnsPill = h("span", { class: "pill neutral" }, [h("span", { class: "status-dot" }), "Off"]);
        dnsAction = h("a", { class: "btn primary", href: "#/setup" }, ["Set up Safe DNS", createIcon("arrow-right", 12)]);
      } else {
        dnsPill = h("span", { class: "pill neutral" }, [h("span", { class: "status-dot" }), "Not checked yet"]);
      }

      const dnsRow = h("div", { class: "status-row" }, [
        h("div", { class: "status-label-group" }, [
          h("span", { class: "status-label" }, [createIcon("dns", 18), "Safe DNS"]),
          dnsPill,
        ]),
        dnsAction,
      ]);

      const card = h("section", { class: "card", "data-testid": "connection-info-card", style: "margin-top: var(--sp-4);" }, [
        h("h2", { style: "font-size: 1.25rem; margin-bottom: var(--sp-4);" }, ["Connection details"]),
        h("div", { class: "status-list" }, [ipv4Row, ipv6Row, locRow, providerRow, dnsRow]),
        h("p", { class: "muted-soft", style: "font-size: 0.85rem; margin-top: var(--sp-4); padding-top: var(--sp-3); border-top: 1px solid var(--line);" }, [
          "City and provider come from a public address lookup. They are what most websites would also see.",
        ]),
      ]);

      out.replaceChildren(card);
    } catch {
      out.replaceChildren(
        h("div", { class: "banner alert", style: "margin-top: var(--sp-4);" }, [
          "Could not read your connection just now. Check your internet and tap Refresh.",
        ]),
      );
    } finally {
      refreshBtn.disabled = false;
    }
  }

  refreshBtn.addEventListener("click", () => loadConnectionData(true));

  // Collapsed "How this check works"
  const details = h("details", { style: "margin-top: var(--sp-4);" }, [
    h("summary", {}, ["How this check works"]),
    h("p", { class: "muted" }, [
      "The lookup goes to a public address service only when this page is open or refreshed. DNS testing checks whether known advertising and scam test domains are blocked.",
    ]),
  ]);

  root.append(
    header,
    out,
    h("div", { class: "row", style: "margin-top: var(--sp-4);" }, [refreshBtn]),
    intro,
    diagram,
    details,
  );

  // Auto-run on mount
  loadConnectionData(false);

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
    h("option", { value: "firefox" }, ["Firefox and Safari"]),
    h("option", { value: "ios" }, ["iPhone or iPad"]),
    h("option", { value: "android" }, ["Android"]),
  ]);
  (os as HTMLSelectElement).value = device.os === "ios" ? "ios" : device.os === "android" ? "android" : device.browser === "firefox" ? "firefox" : "chrome";

  const out = h("div");
  const perm = h("p", { class: "banner" }, [
    "Shield does not read your location. You can block websites from using your location in this browser.",
  ]);

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
    h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
      perm,
      field("Device or browser", os),
      out,
    ]),
    intro,
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
    h("p", { class: "lede" }, ["Travel data in 180+ countries. One eSIM and a balance that does not expire."]),
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

  const card = h("section", { class: "card" }, [
    h("p", {}, [
      "NXTL eSIM is our travel data service. It is optional. You do not need it to use these free tools.",
    ]),
    h("p", { class: "muted" }, [
      "Routes your traffic via London for consistent privacy abroad.",
    ]),
    h("div", { class: "row", style: "margin-top: var(--sp-4);" }, [
      h("a", { class: "btn primary", href: NXTL_LINKS.pricing, target: "_blank", rel: "noreferrer" }, [
        "Get NXTL eSIM",
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
    h("h1", {}, ["Safe DNS setup"]),
    h("p", { class: "lede" }, [
      "Block scam sites, ads, and trackers across your entire phone, tablet, or computer.",
    ]),
  ]);

  const intro = introBlock({
    what: "Safe DNS blocks ads, tracking beacons, and known scam websites across your entire device — covering every app and browser.",
    when: [
      "Block annoying banner ads and tracking across all apps on your phone.",
      "Prevent malware and phishing links from connecting on your home or office PC.",
      "Encrypt DNS lookups so public Wi-Fi operators cannot see what domains you visit.",
    ],
    howSteps: [
      "Select your device platform below.",
      "Follow the quick 1-click download or hostname setup step.",
      "Tap 'Check it worked' to verify that Safe DNS is actively filtering.",
    ],
    limit: "Safe DNS blocks threats by domain name. It does not inspect the contents of encrypted messages.",
  });

  const diagram = diagramDns();

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
            : device.os === "linux"
              ? "linux"
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
              h("h2", { style: "margin: 0;" }, ["Windows setup"]),
            ]),
            h("span", { class: "pill ok" }, ["Reversible anytime"]),
          ]),
          h("p", { class: "muted" }, [
            "Sets Safe DNS on your active connection and configures encrypted DNS in Chrome and Edge.",
          ]),
          h("div", { class: "row", style: "gap: var(--sp-3); flex-wrap: wrap; margin: var(--sp-4) 0;" }, [
            h("a", {
              class: "btn primary lg",
              href: `${import.meta.env.BASE_URL}downloads/windows/nxtl-shield-windows-dns.cmd`,
              download: "nxtl-shield-windows-dns.cmd",
            }, [
              createIcon("download", 20),
              "Download Windows setup (.cmd)",
            ]),
            h("a", {
              class: "btn lg",
              href: `${import.meta.env.BASE_URL}downloads/windows/nxtl-shield-windows-setup.zip`,
              download: "nxtl-shield-windows-setup.zip",
            }, [
              createIcon("file", 20),
              "Download ZIP (includes undo)",
            ]),
          ]),
          h("ol", { class: "stepper-list" }, [
            h("li", {}, ["Download the setup file above."]),
            h("li", {}, ["Open the file and choose Yes if Windows asks for permission."]),
            h("li", {}, ["Restart your browser to apply the new DNS settings."]),
            h("li", {}, ["Tap 'Check it worked' below to confirm protection is on."]),
          ]),
          h("p", { class: "muted-soft", style: "font-size: 0.88rem; margin: var(--sp-3) 0;" }, [
            "Windows will ask for Administrator permission. If SmartScreen warns, choose More info → Run anyway — the script only changes DNS and can be undone anytime.",
          ]),
          h("div", { class: "row", style: "align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--sp-3); margin-top: var(--sp-4); padding-top: var(--sp-4); border-top: 1px solid var(--line);" }, [
            h("div", { class: "row", style: "align-items: center; gap: var(--sp-3); flex-wrap: wrap;" }, [
              h("a", {
                class: "btn sm ghost",
                href: `${import.meta.env.BASE_URL}downloads/windows/nxtl-shield-windows-dns-undo.cmd`,
                download: "nxtl-shield-windows-dns-undo.cmd",
              }, [
                createIcon("refresh", 14),
                "Undo script",
              ]),
            ]),
            makeCheckWorkedRow(),
          ]),
        ]),
      );
    } else if (activeTab === "android") {
      const copyBtn = h("button", { class: "btn primary sm", type: "button" }, [createIcon("copy", 16), "Copy hostname"]);
      copyBtn.addEventListener("click", () => {
        copyToClipboard(resolver.dotHost, copyBtn, [createIcon("copy", 16), "Copy hostname"], "Copied hostname!");
      });

      const openSettingsBtn = detectDevice().os === "android"
        ? h("a", {
            class: "btn sm",
            href: "intent:#Intent;action=android.settings.PRIVATE_DNS_SETTINGS;end",
          }, [createIcon("arrow-right", 14), "Open Private DNS settings"])
        : "";

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
            h("li", {}, [
              h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
                h("span", {}, ["Copy this hostname: "]),
                h("span", { class: "mono", style: "font-weight: 700; color: var(--accent-coral);" }, [resolver.dotHost]),
                h("div", { class: "row", style: "gap: var(--sp-2); flex-wrap: wrap;" }, [copyBtn, ...(openSettingsBtn ? [openSettingsBtn] : [])]),
              ]),
            ]),
            openSettingsBtn
              ? h("li", {}, ["Tap Open Private DNS settings, paste the hostname, and tap Save."])
              : h("li", {}, ["On your Android phone, open Settings → Network & internet → Private DNS, paste the hostname, and tap Save."]),
            h("li", {}, ["Select 'Private DNS provider hostname'."]),
            h("li", {}, ["Paste the hostname and tap Save. All internet lookups are now protected."]),
          ]),
          h("div", { style: "margin-top: var(--sp-4);" }, [
            makeCheckWorkedRow(),
          ]),
        ]),
      );
    } else if (activeTab === "ios") {
      const downloadBtn = h("a", {
        class: "btn primary",
        href: `${import.meta.env.BASE_URL}downloads/nxtl-shield.mobileconfig`,
        download: "nxtl-shield.mobileconfig",
      }, [
        createIcon("download", 18),
        "Download iPhone profile",
      ]);

      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3);" }, [
            createIcon("apple", 28),
            h("h2", { style: "margin: 0;" }, ["iPhone & iPad: Safe DNS profile"]),
          ]),
          h("p", { class: "muted" }, [
            "Apple iOS natively supports encrypted DNS configuration profiles for Safari and all apps.",
          ]),
          h("ol", { class: "stepper-list" }, [
            h("li", {}, [
              h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
                h("span", {}, ["Download the official Apple profile (open in Safari):"]),
                h("div", { class: "row" }, [downloadBtn]),
              ]),
            ]),
            h("li", {}, ["Open Settings on your iPhone or iPad."]),
            h("li", {}, ["Tap 'Profile Downloaded' near the top."]),
            h("li", {}, ["Tap 'Install' in the top right and enter your passcode."]),
          ]),
          h("div", { style: "margin-top: var(--sp-4);" }, [
            makeCheckWorkedRow(),
          ]),
        ]),
      );
    } else if (activeTab === "mac") {
      const downloadBtn = h("a", {
        class: "btn primary",
        href: `${import.meta.env.BASE_URL}downloads/nxtl-shield.mobileconfig`,
        download: "nxtl-shield.mobileconfig",
      }, [
        createIcon("download", 18),
        "Download macOS profile",
      ]);

      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3);" }, [
            createIcon("apple", 28),
            h("h2", { style: "margin: 0;" }, ["macOS: Safe DNS profile"]),
          ]),
          h("p", { class: "muted" }, [
            "macOS supports encrypted DNS system-wide via configuration profiles.",
          ]),
          h("ol", { class: "stepper-list" }, [
            h("li", {}, [
              h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
                h("span", {}, ["Download the profile:"]),
                h("div", { class: "row" }, [downloadBtn]),
              ]),
            ]),
            h("li", {}, ["Open System Settings → Privacy & Security → Profiles."]),
            h("li", {}, ["Install the profile and enter your password."]),
          ]),
          h("p", { class: "muted-soft", style: "font-size: 0.88rem; margin: var(--sp-3) 0;" }, [
            "macOS may say the profile is not signed. That is normal for this free profile.",
          ]),
          h("div", { style: "margin-top: var(--sp-4);" }, [
            makeCheckWorkedRow(),
          ]),
        ]),
      );
    } else {
      // Linux
      const copyDohBtn = h("button", { class: "btn primary sm", type: "button" }, [createIcon("copy", 16), "Copy DoH URL"]);
      copyDohBtn.addEventListener("click", () => {
        copyToClipboard(resolver.dohUrl, copyDohBtn, [createIcon("copy", 16), "Copy DoH URL"], "Copied DoH URL!");
      });

      const detailsAdvanced = h("details", { style: "margin-top: var(--sp-3);" }, [
        h("summary", {}, ["Command-line setup"]),
        h("ol", { class: "stepper-list" }, [
          h("li", {}, ["In /etc/systemd/resolved.conf or NetworkManager, set the DNS address."]),
          h("li", {}, ["Restart systemd-resolved: sudo systemctl restart systemd-resolved"]),
        ]),
      ]);

      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3);" }, [
            createIcon("desktop", 28),
            h("h2", { style: "margin: 0;" }, ["Linux: Encrypted DNS"]),
          ]),
          h("p", { class: "muted" }, [
            "Set this encrypted DNS address in your Linux network settings or in your browser:",
          ]),
          h("ol", { class: "stepper-list" }, [
            h("li", {}, [
              h("div", { style: "display: flex; flex-direction: column; gap: var(--sp-2);" }, [
                h("span", {}, ["DNS over HTTPS address:"]),
                h("span", { class: "mono", style: "font-weight: 700; color: var(--accent-coral);" }, [resolver.dohUrl]),
                h("div", { class: "row" }, [copyDohBtn]),
              ]),
            ]),
            h("li", {}, ["In your network settings, set DNS to this address."]),
          ]),
          detailsAdvanced,
          h("div", { style: "margin-top: var(--sp-4);" }, [
            makeCheckWorkedRow(),
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

  root.append(header, tabContainer, contentArea, intro, diagram, resolverCard);
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
  const guideBox = h("div");

  function render() {
    const hasPrompt = Boolean((window as any).__storedInstallPrompt);
    const guide = installInstructions({
      userAgent: navigator.userAgent,
      standalone,
      beforeInstallPrompt: hasPrompt,
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

  if (standalone) {
    button.style.display = "none";
  }

  button.addEventListener("click", async () => {
    const prompt = (window as any).__storedInstallPrompt;
    if (prompt) {
      await prompt.prompt();
      return;
    }
    guideBox.querySelector("h2")?.scrollIntoView({ behavior: "smooth" });
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    (window as any).__storedInstallPrompt = event;
    render();
  });
  render();

  return h("div", { class: "grid" }, [
    h("h1", {}, ["Install NXTL Shield"]),
    h("p", { class: "lede" }, [
      "Install NXTL Shield to your home screen or desktop for fast, offline access anytime.",
    ]),
    standalone
      ? h("div", { class: "cluster", style: "margin-bottom: var(--sp-4);" }, [
          h("span", { class: "pill ok" }, [createIcon("check", 14), "Installed"]),
        ])
      : h("div", { class: "row" }, [button]),
    guideBox,
  ]);
}

// ----------------------------------------------------
// REPORTS / SETTINGS
// ----------------------------------------------------
export function pageSettings(): HTMLElement {
  const list = h("div", { style: "display: grid; gap: var(--sp-2);" });

  const kindLabel: Record<string, string> = {
    url: "Link check",
    text: "Message check",
    file: "File check",
    dns: "Safe DNS",
  };
  const verdictLabel: Record<string, { text: string; variant: string }> = {
    clean: { text: "Looks safe", variant: "ok" },
    no_known_match: { text: "Looks safe", variant: "ok" },
    suspicious_indicators: { text: "Be careful", variant: "indicator" },
    indicator: { text: "Be careful", variant: "indicator" },
    known_match: { text: "Likely scam", variant: "alert" },
    malware: { text: "Likely scam", variant: "alert" },
    phishing: { text: "Likely scam", variant: "alert" },
    scam: { text: "Likely scam", variant: "alert" },
  };

  function render() {
    const items = loadReports(localStorage);
    list.replaceChildren(
      items.length
        ? h("p", { style: "font-weight: 600;" }, [`${items.length} saved check${items.length === 1 ? "" : "s"}.`])
        : h("p", { class: "muted" }, ["No saved checks."]),
      ...items.map((item) => {
        const v = verdictLabel[item.verdict] ?? { text: item.verdict, variant: "neutral" };
        let dateStr = item.at;
        try {
          dateStr = new Date(item.at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch {
          /* keep raw date */
        }
        return h("div", { class: "card", style: "padding: var(--sp-3);" }, [
          h("div", { class: "row", style: "align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--sp-2);" }, [
            h("div", { class: "row", style: "align-items: center; gap: var(--sp-2);" }, [
              h("span", { class: `pill ${v.variant}` }, [v.text]),
              h("span", { style: "font-weight: 600;" }, [kindLabel[item.kind] || item.kind]),
            ]),
            h("span", { class: "muted-soft", style: "font-size: 0.85rem;" }, [dateStr]),
          ]),
          h("p", { class: "mono muted-soft", style: "margin: var(--sp-2) 0 0; word-break: break-all;" }, [item.redacted]),
        ]);
      }),
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
    h("h1", {}, ["Reports"]),
    h("p", { class: "lede" }, [
      "Checks you run on this device can appear here. They stay in this browser.",
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
      "Checks, encryption, and passwords stay on your device. You do not need an account.",
    ]),
  ]);

  const privacyCard = h("section", { class: "card" }, [
    h("h2", {}, ["What stays on your device"]),
    h("p", {}, [
      "All security checks run locally inside your web browser. When you check a link, scan a message, inspect a file, or generate a password, no data is sent to NXTL or any central server.",
    ]),
    h("p", { class: "muted" }, [
      "There are no user accounts, no tracking cookies, no advertising beacons, and no telemetry.",
    ]),
  ]);

  const sourcesCard = h("section", { class: "card", style: "margin-top: var(--sp-4);" }, [
    h("div", { class: "row", style: "align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-3);" }, [
      h("h2", { style: "margin: 0;" }, ["Threat lists"]),
    ]),
    h("p", {}, [
      "NXTL Shield ships with open threat lists used to flag scam, malware, and tracker domains. The lists come with the app and are updated over time.",
    ]),
    h("ul", { style: "line-height: 1.8; margin-left: var(--sp-4);" }, [
      h("li", {}, [h("strong", {}, ["Scam and malware domains: "]), "Known phishing sites, scam infrastructure, and harmful downloads."]),
      h("li", {}, [h("strong", {}, ["Trackers and ads: "]), "Advertising and analytics domains used to follow you across sites."]),
    ]),
  ]);

  const externalCard = h("section", { class: "card", style: "margin-top: var(--sp-4);" }, [
    h("h2", {}, ["External lookups (only when you click)"]),
    h("p", {}, [
      "Shield only touches the network when you explicitly trigger an external lookup:",
    ]),
    h("ul", { style: "line-height: 1.8; margin-left: var(--sp-4);" }, [
      h("li", {}, [h("strong", {}, ["Password leak check: "]), "Only if you click the button. A short, incomplete fingerprint of the password is sent to a public leak database. Your password itself is never sent."]),
      h("li", {}, [h("strong", {}, ["Your connection check: "]), "When you open or refresh the Your connection page, it queries a public address lookup to show your IP address, city, and network provider, and tests whether Safe DNS is actively blocking threats."]),
      h("li", {}, [h("strong", {}, ["eSIM rates: "]), "Only if you look up rates for a destination. This fetches current NXTL eSIM plan prices."]),
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

export function pageShareApp(): HTMLElement {
  const root = h("div", {});
  const header = h("header", { class: "page-header" }, [
    h("h1", {}, ["Share Shield"]),
    h("p", { class: "lede" }, [
      "Know someone who gets scam texts? Share Shield with them.",
    ]),
  ]);

  const APP_URL = "https://nxtlsim.github.io/nxtl-shield/";
  const SHARE_TEXT = `Know someone who gets scam texts? Share Shield with them. ${APP_URL}`;
  const EMAIL_SUBJECT = "A free tool that checks scam texts and links";
  const EMAIL_BODY = `Know someone who gets scam texts? Share Shield with them.\n\n${APP_URL}`;

  const shareActions = h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" });

  // Native share if supported
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    const nativeShareBtn = h("button", {
      type: "button",
      class: "btn primary",
      style: "width: 100%; justify-content: center;",
    }, [
      createIcon("shield", 18),
      "Share",
    ]);
    nativeShareBtn.addEventListener("click", async () => {
      try {
        await navigator.share({
          title: "NXTL Shield",
          text: `Know someone who gets scam texts? Share Shield with them.`,
          url: APP_URL,
        });
      } catch {
        // User cancelled or share dismissed — stay quiet
      }
    });
    shareActions.append(nativeShareBtn);
  }

  // Copy link action
  const copyBtn = h("button", {
    type: "button",
    class: "btn",
    style: "width: 100%; justify-content: center;",
  }, [
    createIcon("copy", 18),
    "Copy link",
  ]);
  copyBtn.addEventListener("click", async () => {
    await copyToClipboard(APP_URL, copyBtn, [createIcon("copy", 18), "Copy link"], "Link copied.");
  });

  // Email action
  const emailLink = h("a", {
    class: "btn",
    style: "width: 100%; justify-content: center;",
    href: `mailto:?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`,
  }, [
    createIcon("mail", 18),
    "Email",
  ]);

  // Text message (SMS) action
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const smsDelimiter = isIos ? "&" : "?";
  const smsHref = `sms:${smsDelimiter}body=${encodeURIComponent(SHARE_TEXT)}`;

  const smsLink = h("a", {
    class: "btn",
    style: "width: 100%; justify-content: center;",
    href: smsHref,
  }, [
    createIcon("message", 18),
    "Text message",
  ]);

  shareActions.append(copyBtn, emailLink, smsLink);

  // Local QR Code Card
  let qrSvgString = "";
  try {
    const writer = new QRCodeWriter();
    const matrix = writer.encode(APP_URL, BarcodeFormat.QR_CODE, 0, 0, new Map());
    const size = matrix.getWidth();
    let path = "";
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (matrix.get(x, y)) {
          path += `M${x},${y}h1v1h-1z `;
        }
      }
    }
    qrSvgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="200" height="200" fill="currentColor" role="img" aria-label="QR code for NXTL Shield website"><path d="${path}"/></svg>`;
  } catch {
    qrSvgString = "";
  }

  const qrCard = h("div", {
    class: "card",
    style: "margin-top: var(--sp-4); text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--sp-3);",
  }, [
    h("h2", { style: "margin: 0; font-size: 1.15rem;" }, ["Scan QR code"]),
    h("p", { class: "muted", style: "margin: 0;" }, ["Point any phone camera at this code to open Shield."]),
    h("div", {
      style: "background: #ffffff; color: #0a0c12; padding: 16px; border-radius: 4px; display: inline-flex; justify-content: center; align-items: center;",
      innerHTML: qrSvgString,
    }),
  ]);

  root.append(header, shareActions, qrCard);
  return root;
}

