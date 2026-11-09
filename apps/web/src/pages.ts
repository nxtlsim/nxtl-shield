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
import { field, h, resultCard, introBlock, faqSection, emptyState } from "./dom";
import { createIcon, type IconName } from "./icons";
import { listFailure, loadReputation } from "./lists";

function reportsAdd(entry: ReportEntry) {
  const items = loadReports(localStorage);
  items.unshift(entry);
  saveReports(localStorage, items);
}

export async function pageHome(): Promise<HTMLElement> {
  const root = h("div", { class: "grid" });
  const ext = await queryExtension();

  // First-visit 3-step guide (dismissable)
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
    class: "btn-sm ghost",
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
        "First-time setup",
      ]),
      h("h2", { style: "font-size: 1.25rem; margin: 4px 0 0;" }, ["Get protected in 3 simple steps"]),
      h("p", { class: "muted", style: "margin: 0;" }, ["Follow these three steps to shield your browsing and your device."]),
    ]),
    dismissBtn,
  ]);

  const guideSteps = h("div", { class: "guide-steps" }, [
    h("div", { class: "guide-step-card" }, [
      h("span", { class: "guide-step-number" }, ["Step 1 · Whole device"]),
      h("h3", { style: "font-size: 1.05rem;" }, ["Set up Safe DNS"]),
      h("p", { class: "muted-soft", style: "flex: 1;" }, [
        "Blocks malicious websites and phishing domains across every app on your phone or computer.",
      ]),
      h("a", { class: "btn sm", href: "#/setup" }, ["Set up DNS", createIcon("arrow-right", 14)]),
    ]),
    h("div", { class: "guide-step-card" }, [
      h("span", { class: "guide-step-number" }, ["Step 2 · Browser"]),
      h("h3", { style: "font-size: 1.05rem;" }, ["Add Browser Extension"]),
      h("p", { class: "muted-soft", style: "flex: 1;" }, [
        "Adds continuous ad & tracker blocking, URL cleaning, and live malicious site alerts in your browser.",
      ]),
      h("a", { class: "btn sm", href: "#/extension" }, ["Get Extension", createIcon("arrow-right", 14)]),
    ]),
    h("div", { class: "guide-step-card" }, [
      h("span", { class: "guide-step-number" }, ["Step 3 · Standby"]),
      h("h3", { style: "font-size: 1.05rem;" }, ["Install NXTL Shield"]),
      h("p", { class: "muted-soft", style: "flex: 1;" }, [
        "Keep these free tools one tap away on your home screen or desktop for fast checks anytime.",
      ]),
      h("a", { class: "btn sm", href: "#/install" }, ["Install App", createIcon("arrow-right", 14)]),
    ]),
  ]);

  guideBanner.append(guideHeader, guideSteps);

  // Hero Section
  const hero = h("section", { class: "hero-launcher" }, [
    h("div", { class: "hero-pill" }, [
      createIcon("shield-check", 16),
      "Free, open-source security tools by NXTL eSIM",
    ]),
    h("h1", {}, ["Check a link before you open it."]),
    h("p", { class: "lede" }, [
      "Shield runs link, message, and file checks in this browser. Continuous blocking needs the extension or a DNS profile you install yourself. NXTL eSIM is an optional paid connection and does not unlock Shield.",
    ]),
    h("div", { class: "row", style: "margin-bottom: var(--sp-5);" }, [
      h("a", { class: "btn primary lg", href: "#/check" }, [
        createIcon("search", 20),
        "Check a link, message or file",
      ]),
      h("a", { class: "btn lg", href: "#/share" }, [
        createIcon("share-lock", 20),
        "Secure Share",
      ]),
      h("a", { class: "btn lg", href: "#/install", "data-testid": "install-link" }, [
        createIcon("install", 20),
        "Install NXTL Shield",
      ]),
    ]),
  ]);

  // Unified Fast Launcher Box inside Hero
  const fastInput = h("input", {
    type: "text",
    placeholder: "Paste a suspicious link, message text, or website address here...",
    style: "background: var(--bg); border: 2px solid var(--line-strong); font-size: 1.05rem; padding: 14px 18px;",
  });
  const fastBtn = h("button", { class: "primary", type: "button" }, [
    createIcon("search", 18),
    "Quick Check",
  ]);
  const fastOutput = h("div", { style: "margin-top: var(--sp-4);" });

  fastBtn.addEventListener("click", async () => {
    const val = fastInput.value.trim();
    if (!val) {
      fastOutput.replaceChildren(h("p", { class: "muted" }, ["Please enter a URL or message text to check."]));
      return;
    }
    fastBtn.disabled = true;
    const rep = await loadReputation();
    const result = /^https?:\/\//i.test(val) ? checkUrl(val, rep) : checkText(val, rep);
    reportsAdd(makeReport(/^https?:\/\//i.test(val) ? "url" : "text", result.verdict, result.inputRedacted));
    fastOutput.replaceChildren(resultCard(result));
    fastBtn.disabled = false;
  });

  const fastLauncherCard = h("div", {
    class: "card",
    style: "background: var(--bg-2); border-color: var(--line-accent); padding: var(--sp-4);",
  }, [
    h("label", { style: "font-weight: 700; margin-bottom: var(--sp-2); display: block;" }, [
      "Instant Scanner",
    ]),
    h("div", { style: "display: flex; gap: var(--sp-2); flex-wrap: wrap;" }, [
      h("div", { style: "flex: 1; min-width: 260px;" }, [fastInput]),
      fastBtn,
    ]),
    fastOutput,
  ]);
  hero.append(fastLauncherCard);

  // 12 Protection Tiles Section
  const allTilesSection = h("section", { style: "margin: var(--sp-6) 0;" }, [
    h("h2", {}, ["All protections and tools"]),
    h("p", { class: "muted" }, [
      "Every protection runs locally on your device or in your browser. Tap any protection to learn what it does and use it.",
    ]),
  ]);

  const tilesList: Array<{
    id: string;
    icon: IconName;
    title: string;
    desc: string;
    href: string;
  }> = [
    {
      id: "ad-blocker",
      icon: "ad-block",
      title: "Ad & tracker blocker",
      desc: "Stops annoying ads and privacy-invasive tracking scripts across web pages.",
      href: "#/ad-blocker",
    },
    {
      id: "phishing-link",
      icon: "link",
      title: "Phishing & scam link check",
      desc: "Checks suspicious web links against updated threat lists and deceptive typos.",
      href: "#/check?tab=link",
    },
    {
      id: "sms-check",
      icon: "message",
      title: "Message/SMS scam check",
      desc: "Analyzes text messages and emails for scam links and deceptive impersonation.",
      href: "#/check?tab=message",
    },
    {
      id: "qr-check",
      icon: "qr",
      title: "QR code check",
      desc: "Safely reads and inspects destination URLs from QR codes before opening them.",
      href: "#/check?tab=qr",
    },
    {
      id: "safe-dns",
      icon: "dns",
      title: "Safe DNS protection",
      desc: "Blocks malicious domains and trackers across your whole phone or computer.",
      href: "#/setup",
    },
    {
      id: "location-privacy",
      icon: "location",
      title: "Location privacy",
      desc: "Controls website location permissions and explains what IP geolocation reveals.",
      href: "#/location",
    },
    {
      id: "secure-share",
      icon: "share-lock",
      title: "Secure Share",
      desc: "Encrypts confidential text and files locally using OpenPGP standards.",
      href: "#/share",
    },
    {
      id: "password-gen",
      icon: "password",
      title: "Password generator",
      desc: "Creates strong passwords and checks them against known breached databases.",
      href: "#/password",
    },
    {
      id: "clean-link",
      icon: "clean",
      title: "Link cleaner",
      desc: "Strips marketing tracking parameters like UTM tags from web addresses.",
      href: "#/clean",
    },
    {
      id: "connection-check",
      icon: "connection",
      title: "Connection check",
      desc: "Diagnoses your network connection, public IP address, and WebRTC privacy.",
      href: "#/connection",
    },
    {
      id: "browser-ext",
      icon: "extension",
      title: "Browser extension",
      desc: "Adds real-time threat protection, tracker blocking, and site alerts to your browser.",
      href: "#/extension",
    },
    {
      id: "nxtl-esim",
      icon: "esim",
      title: "NXTL eSIM",
      desc: "Mobile data with London internet exit — optional companion connectivity.",
      href: "#/esim",
    },
  ];

  const tilesContainer = h("div", { class: "tiles-grid" });
  for (const t of tilesList) {
    const tile = h("a", { class: "tile", href: t.href }, [
      h("div", { class: "tile-icon" }, [createIcon(t.icon, 24)]),
      h("h3", { class: "tile-title" }, [
        t.title,
        createIcon("arrow-right", 16),
      ]),
      h("p", { class: "tile-desc" }, [t.desc]),
      h("span", { class: "tile-cta" }, ["Open tool"]),
    ]);
    tilesContainer.append(tile);
  }
  allTilesSection.append(tilesContainer);

  // Required Sections for Test Verification
  const can = h("section", { class: "card" }, [
    h("h2", {}, ["What you can check now"]),
    h("p", { class: "muted" }, ["These run locally without an account or a purchase."]),
    h("div", { class: "row" }, [
      link("Link", "#/check"),
      link("Message", "#/check?tab=message"),
      link("QR", "#/check?tab=qr"),
      link("File hash", "#/check?tab=file"),
      link("Clean a URL", "#/clean"),
      link("Secure Share", "#/share"),
      link("Password", "#/password"),
    ]),
  ]);

  const configured = h("section", { class: "card" }, [h("h2", {}, ["What's configured"])]);
  configured.append(
    statusRow(
      "Extension",
      ext ? "Detected in this browser" : "Not detected",
      ext ? "ok" : "neutral",
      ext ? "#/extension" : "#/extension",
      ext ? "Manage" : "Add extension",
    ),
    statusRow(
      "Threat rules",
      ext?.blockingEnabled ? "Enabled (read from the extension)" : ext ? "Off" : "Needs the extension",
      ext?.blockingEnabled ? "ok" : "neutral",
    ),
    statusRow(
      "Tracker rules",
      ext?.trackersEnabled ? "Enabled" : "Off or not detected",
      ext?.trackersEnabled ? "ok" : "neutral",
    ),
    statusRow(
      "URL cleaning in the extension",
      ext?.cleaningEnabled ? "Enabled" : "Off or not detected",
      ext?.cleaningEnabled ? "ok" : "neutral",
    ),
    statusRow(
      "Pause",
      ext?.paused ? `Paused until ${ext.pauseUntil ? new Date(ext.pauseUntil).toLocaleString() : "a deadline"}` : "Not paused",
      ext?.paused ? "indicator" : "ok",
    ),
    statusRow(
      "DNS profile",
      "Not verified — Shield cannot read device DNS",
      "neutral",
      "#/setup",
      "Set up DNS",
    ),
    statusRow(
      "NXTL data line",
      "Connection not verified",
      "neutral",
      "#/esim",
      "Learn more",
    ),
  );

  const setup = h("section", { class: "card" }, [
    h("h2", {}, ["What needs setup"]),
    h("p", {}, [
      "Browser blocking, tracker rules, cookie-banner hiding, and location blocking need the extension, and only where that browser supports them.",
    ]),
    h("p", { class: "muted" }, [
      "Encrypted DNS needs a profile or a setting you apply. The page cannot switch it on.",
    ]),
    h("a", { class: "btn", href: "#/setup" }, ["Open protection setup", createIcon("arrow-right", 16)]),
  ]);

  const fresh = h("section", { class: "card" }, [
    h("h2", {}, ["Data freshness"]),
    h("p", { "data-testid": "snapshot-version", class: "mono" }, [
      `List snapshot ${SNAPSHOT_MANIFEST.version}, retrieved 2026-11-09.`,
    ]),
    h("p", { class: "muted" }, [
      listFailure() ??
        "Bundled threat lists are a snapshot and are not auto-updated. A miss is not a promise that a site is safe. See Sources for list details.",
    ]),
    h("p", { "data-testid": "extension-status" }, [
      ext ? "Extension: detected" : "Extension: not detected",
    ]),
  ]);

  const wifi = h("section", { class: "card" }, [
    h("h2", {}, ["Skip public Wi-Fi"]),
    h("p", {}, [
      "Connect with NXTL mobile data. Your connection uses NXTL's London internet exit. That can limit what a website learns about your travel location from your IP address alone.",
    ]),
    h("p", { class: "muted" }, [
      "Optional paid connectivity. Shield stays fully usable without it. This page cannot tell whether NXTL is active.",
    ]),
    h("a", { class: "btn sm", href: "#/esim" }, ["NXTL eSIM details", createIcon("arrow-right", 14)]),
  ]);

  const grid = h("div", { class: "grid cards" }, [can, configured, setup, fresh, wifi]);

  root.append(guideBanner, hero, allTilesSection, grid);
  return root;
}

function link(text: string, href: string) {
  return h("a", { class: "btn", href }, [text]);
}

function statusRow(
  name: string,
  value: string,
  pillVariant: "ok" | "match" | "indicator" | "neutral" = "neutral",
  actionHref?: string,
  actionLabel?: string,
) {
  const row = h("div", { class: "status-row" }, [
    h("span", { class: "status-label" }, [
      createIcon(pillVariant === "ok" ? "check" : pillVariant === "indicator" ? "alert" : "info", 16),
      name,
    ]),
    h("div", { class: "cluster" }, [
      h("span", { class: `pill ${pillVariant}` }, [value]),
      actionHref && actionLabel
        ? h("a", { class: "btn sm ghost", href: actionHref }, [actionLabel, createIcon("arrow-right", 12)])
        : "",
    ]),
  ]);
  return row;
}

// ----------------------------------------------------
// DEDICATED PAGE: AD & TRACKER BLOCKER
// ----------------------------------------------------
export async function pageAdBlocker(): Promise<HTMLElement> {
  const root = h("div", { class: "grid" });
  const ext = await queryExtension();

  const intro = introBlock({
    what: "Stop annoying advertisements, video interruptions, and third-party tracking scripts from following you across websites.",
    when: "Keep it active whenever you browse the web to protect your privacy and speed up website load times.",
    howSteps: [
      "Option 1 (Recommended for browser): Install the NXTL Shield browser extension for full ad blocking and cosmetic element hiding.",
      "Option 2 (Recommended for whole device): Turn on Safe DNS in your phone or PC settings to filter tracker and ad domains device-wide.",
      "Verify below that your protection is active.",
    ],
    limits: [
      "A web page inside a browser tab cannot block ads on other websites or apps without the extension or device DNS.",
      "DNS blocking filters at the domain level; it cannot remove blank ad spaces without the browser extension.",
      "Does not block first-party sponsored posts embedded directly in server content (like native Instagram feed ads).",
    ],
  });

  const header = h("div", {}, [
    h("h1", {}, ["Ad & tracker blocker"]),
    h("p", { class: "lede" }, [
      "There are two real, verified ways to block ads and trackers: through our browser extension, or by setting up Safe DNS on your device.",
    ]),
  ]);

  // Real Status Card
  const statusCard = h("section", { class: "card" }, [
    h("h2", {}, ["Current protection status"]),
    h("div", { class: "status-row" }, [
      h("span", { class: "status-label" }, [createIcon("extension", 18), "Browser extension ad blocking"]),
      h("span", { class: `pill ${ext?.blockingEnabled ? "ok" : "neutral"}` }, [
        ext?.blockingEnabled ? "Active & blocking" : ext ? "Extension present (rules off)" : "Not installed",
      ]),
    ]),
    h("div", { class: "status-row" }, [
      h("span", { class: "status-label" }, [createIcon("dns", 18), "Whole-device Safe DNS"]),
      h("span", { class: "pill neutral" }, ["Device setting (verify below)"]),
    ]),
  ]);

  // Two Real Ways Cards
  const methodsGrid = h("div", { class: "grid cards", style: "margin-top: var(--sp-4);" }, [
    h("article", { class: "card" }, [
      h("div", { class: "tile-icon", style: "margin-bottom: var(--sp-3);" }, [createIcon("extension", 24)]),
      h("h3", {}, ["Way 1: Browser Extension"]),
      h("p", { class: "muted" }, [
        "Best for detailed ad-blocking on websites. Removes banner ads, blocks tracking scripts, and hides cookie consent banners.",
      ]),
      h("p", { class: "muted-soft" }, [
        "Works in Chrome, Edge, Brave, and Firefox.",
      ]),
      h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
        h("a", { class: "btn primary", href: "#/extension" }, ["Install extension", createIcon("arrow-right", 16)]),
      ]),
    ]),
    h("article", { class: "card" }, [
      h("div", { class: "tile-icon", style: "margin-bottom: var(--sp-3);" }, [createIcon("dns", 24)]),
      h("h3", {}, ["Way 2: Whole-Device Safe DNS"]),
      h("p", { class: "muted" }, [
        "Best for blocking ads and trackers across your entire phone, tablet, or PC, including in third-party mobile apps.",
      ]),
      h("p", { class: "muted-soft" }, [
        "Android Private DNS (3 taps) or Apple configuration profile.",
      ]),
      h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [
        h("a", { class: "btn primary", href: "#/setup" }, ["Set up Safe DNS", createIcon("arrow-right", 16)]),
      ]),
    ]),
  ]);

  const faqs = faqSection([
    {
      q: "Can this website block ads without installing anything?",
      a: "No. Web standards and browser security prevent any website from intercepting traffic from other websites. You must use either the browser extension or system-level Safe DNS.",
    },
    {
      q: "Which one should I choose?",
      a: "For the best protection, use both! Safe DNS protects your phone and background apps, while the browser extension removes leftover white spaces and cookie banners.",
    },
    {
      q: "Will this slow down my internet connection?",
      a: "No, blocking ad scripts and tracking beacons typically makes web pages load 30% to 50% faster and saves mobile battery.",
    },
  ]);

  root.append(header, intro, statusCard, methodsGrid, faqs);
  return root;
}

// ----------------------------------------------------
// DEDICATED PAGE: PROTECT YOUR PHONE
// ----------------------------------------------------
export function pagePhoneProtection(): HTMLElement {
  const root = h("div", { class: "grid" });

  const intro = introBlock({
    what: "Comprehensive protection for your smartphone against malware, phishing SMS links, and app-based tracking.",
    when: "Set this up once when setting up a new smartphone or traveling on untrusted mobile networks.",
    howSteps: [
      "Step 1: Set up Safe DNS (Android Private DNS or iPhone mobileconfig profile).",
      "Step 2: Bookmark NXTL Shield to quickly check suspicious SMS, WhatsApp, and email links.",
      "Step 3: Use Secure Share whenever you need to send passwords or sensitive documents.",
    ],
    limits: [
      "Shield does not claim device-wide malware scanning on iOS/Android (mobile operating systems prohibit apps from scanning other apps).",
      "Safe DNS blocks known malicious domains; it cannot detect a new scam URL before it is listed.",
      "Location privacy settings must be configured in your phone's system settings.",
    ],
  });

  const header = h("div", {}, [
    h("h1", {}, ["Protect your phone"]),
    h("p", { class: "lede" }, [
      "Turn on system-wide protection on your smartphone in under two minutes. No paid apps, subscriptions, or battery drain.",
    ]),
  ]);

  // Platform Selector Tabs
  let activePlatform = /iPhone|iPad/.test(navigator.userAgent) ? "ios" : "android";
  const contentArea = h("div");

  function renderPlatform(platform: "android" | "ios") {
    activePlatform = platform;
    androidBtn.setAttribute("aria-selected", platform === "android" ? "true" : "false");
    iosBtn.setAttribute("aria-selected", platform === "ios" ? "true" : "false");

    if (platform === "android") {
      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; margin-bottom: var(--sp-3);" }, [
            createIcon("android", 28),
            h("h2", { style: "margin: 0;" }, ["Android: Private DNS Setup (3 Taps)"]),
          ]),
          h("p", { class: "muted" }, [
            "Android has built-in support for encrypted Private DNS. This blocks malicious domains across Chrome, Samsung Internet, and all mobile apps.",
          ]),
          h("ol", { class: "numbered-steps", style: "font-size: 1rem; margin: var(--sp-4) 0;" }, [
            h("li", {}, ["Open your phone's Settings app."]),
            h("li", {}, ["Tap Network & internet (or Connections) → More connection settings → Private DNS."]),
            h("li", {}, ["Select Private DNS provider hostname."]),
            h("li", {}, ["Paste one of our recommended resolvers below and tap Save."]),
          ]),
          h("div", { class: "card", style: "background: var(--raised); margin-top: var(--sp-4);" }, [
            h("h3", {}, ["Recommended Hostname"]),
            h("p", { class: "mono", style: "font-size: 1.1rem; color: var(--accent-coral); font-weight: 700;" }, ["dns.quad9.net"]),
            h("div", { class: "row" }, [
              h("button", { class: "primary sm", type: "button" }, [
                createIcon("copy", 16),
                "Copy dns.quad9.net",
              ]),
            ]),
          ]),
        ]),
      );
      contentArea.querySelector("button")?.addEventListener("click", () => {
        navigator.clipboard.writeText("dns.quad9.net").catch(() => undefined);
      });
    } else {
      contentArea.replaceChildren(
        h("section", { class: "card" }, [
          h("div", { class: "row", style: "align-items: center; margin-bottom: var(--sp-3);" }, [
            createIcon("apple", 28),
            h("h2", { style: "margin: 0;" }, ["iPhone & iPad: Safe DNS Profile"]),
          ]),
          h("p", { class: "muted" }, [
            "Apple iOS natively supports encrypted DNS through configuration profiles. This protects Safari, third-party browsers, and apps.",
          ]),
          h("ol", { class: "numbered-steps", style: "font-size: 1rem; margin: var(--sp-4) 0;" }, [
            h("li", {}, ["Tap Download Apple Profile below."]),
            h("li", {}, ["Open the Settings app on your iPhone or iPad."]),
            h("li", {}, ["Tap Profile Downloaded near the top."]),
            h("li", {}, ["Tap Install in the top right and enter your passcode."]),
          ]),
          h("div", { style: "margin-top: var(--sp-4);" }, [
            h("a", { class: "btn primary", href: "#/setup" }, [
              createIcon("download", 18),
              "Download Safe DNS Profile",
            ]),
          ]),
        ]),
      );
    }
  }

  const androidBtn = h("button", { type: "button", role: "tab", class: "btn" }, [
    createIcon("android", 18),
    "Android Guide",
  ]);
  const iosBtn = h("button", { type: "button", role: "tab", class: "btn" }, [
    createIcon("apple", 18),
    "iPhone / iPad Guide",
  ]);

  androidBtn.addEventListener("click", () => renderPlatform("android"));
  iosBtn.addEventListener("click", () => renderPlatform("ios"));

  const tabs = h("div", { class: "tabs", role: "tablist" }, [androidBtn, iosBtn]);
  renderPlatform(activePlatform as "android" | "ios");

  // Mobile Tools Section
  const mobileTools = h("section", { style: "margin-top: var(--sp-6);" }, [
    h("h2", {}, ["Everyday phone security tools"]),
    h("div", { class: "grid cards", style: "margin-top: var(--sp-3);" }, [
      h("article", { class: "card" }, [
        h("div", { class: "tile-icon", style: "margin-bottom: var(--sp-2);" }, [createIcon("message", 22)]),
        h("h3", {}, ["Check SMS & WhatsApp links"]),
        h("p", { class: "muted" }, ["Received an unexpected delivery text or bank alert? Check the link here before tapping."]),
        h("a", { class: "btn sm", href: "#/check?tab=message" }, ["Check message", createIcon("arrow-right", 14)]),
      ]),
      h("article", { class: "card" }, [
        h("div", { class: "tile-icon", style: "margin-bottom: var(--sp-2);" }, [createIcon("qr", 22)]),
        h("h3", {}, ["Safe QR code scanner"]),
        h("p", { class: "muted" }, ["Scan restaurant or parking meter QR codes to inspect the URL safely without launching it."]),
        h("a", { class: "btn sm", href: "#/check?tab=qr" }, ["Scan QR", createIcon("arrow-right", 14)]),
      ]),
      h("article", { class: "card" }, [
        h("div", { class: "tile-icon", style: "margin-bottom: var(--sp-2);" }, [createIcon("share-lock", 22)]),
        h("h3", {}, ["Encrypt confidential text"]),
        h("p", { class: "muted" }, ["Send passwords, Wi-Fi keys, or personal files with strong on-device encryption."]),
        h("a", { class: "btn sm", href: "#/share" }, ["Open Secure Share", createIcon("arrow-right", 14)]),
      ]),
      h("article", { class: "card" }, [
        h("div", { class: "tile-icon", style: "margin-bottom: var(--sp-2);" }, [createIcon("install", 22)]),
        h("h3", {}, ["Add to Home Screen"]),
        h("p", { class: "muted" }, ["Install NXTL Shield as a lightweight app so it is always accessible offline."]),
        h("a", { class: "btn sm", href: "#/install" }, ["Install app", createIcon("arrow-right", 14)]),
      ]),
    ]),
  ]);

  const faqs = faqSection([
    {
      q: "Does this drain my battery?",
      a: "No. Safe DNS uses standard DNS protocols already running on your phone, requiring zero extra background CPU cycles.",
    },
    {
      q: "Does NXTL Shield scan my whole phone for malware?",
      a: "No. Neither Android nor iOS allows third-party web apps to scan your device's memory or private app folders.",
    },
    {
      q: "Can I remove this at any time?",
      a: "Yes. On Android, change Private DNS back to Automatic. On iPhone, delete the profile in Settings → VPN & Device Management.",
    },
  ]);

  root.append(header, intro, tabs, contentArea, mobileTools, faqs);
  return root;
}

// ----------------------------------------------------
// DEDICATED PAGE: BROWSER EXTENSION
// ----------------------------------------------------
export async function pageExtension(): Promise<HTMLElement> {
  const root = h("div", { class: "grid" });
  const ext = await queryExtension();
  const isFirefox = /Firefox/i.test(navigator.userAgent);

  const intro = introBlock({
    what: "The NXTL Shield browser extension provides continuous ad blocking, phishing protection, tracker stopping, URL parameter cleaning, and location privacy.",
    when: "Install it on your desktop computer or compatible browser for continuous background protection while surfing the web.",
    howSteps: [
      "Click the download button for your browser.",
      "Follow the browser-specific installation steps below.",
      "Click 'Verify installation' to verify that Shield extension is communicating with this page.",
    ],
    limits: [
      "Protects only web pages opened inside that specific browser; does not filter traffic in external apps.",
      "Threat lists are bundled snapshots and are not auto-updated between releases; new threats may take time to appear.",
      "Does not provide a network tunnel or route your entire computer's internet connection.",
    ],
  });

  const header = h("div", {}, [
    h("h1", {}, ["Browser extension"]),
    h("p", { class: "lede" }, [
      "Continuous protection in your browser. Blocks phishing websites, stops trackers, cleans URLs, and protects your location.",
    ]),
  ]);

  // Real Extension Status Box
  const statusBox = h("section", { class: "card", style: "border-color: var(--line-accent);" });
  const statusMsg = h("div", { "data-testid": "extension-status" }, [
    ext ? "Extension: detected" : "Extension: not detected",
  ]);

  const verifyBtn = h("button", { class: "primary sm", type: "button" }, [
    createIcon("refresh", 16),
    "Check if extension is working",
  ]);
  verifyBtn.addEventListener("click", async () => {
    verifyBtn.disabled = true;
    const freshStatus = await queryExtension(1200);
    verifyBtn.disabled = false;
    if (freshStatus) {
      statusBox.replaceChildren(
        h("div", { class: "row", style: "align-items: center;" }, [
          h("span", { class: "pill ok" }, [createIcon("shield-check", 14), "Extension Active"]),
          h("strong", {}, ["NXTL Shield extension is running and protecting this browser!"]),
        ]),
        h("p", { class: "muted", style: "margin-top: var(--sp-2);" }, [
          `Active rulesets: ${freshStatus.rulesets.join(", ") || "Standard"}. Blocking: ${freshStatus.blockingEnabled ? "On" : "Off"}.`,
        ]),
      );
    } else {
      statusBox.replaceChildren(
        h("div", { class: "row", style: "align-items: center;" }, [
          h("span", { class: "pill neutral" }, [createIcon("info", 14), "Not Detected"]),
          h("span", {}, ["Extension is not communicating yet. Follow the installation steps below."]),
        ]),
        h("div", { style: "margin-top: var(--sp-3);" }, [verifyBtn]),
      );
    }
  });

  if (ext) {
    statusBox.append(
      h("div", { class: "row", style: "align-items: center;" }, [
        h("span", { class: "pill ok" }, [createIcon("shield-check", 14), "Extension Active"]),
        h("strong", {}, ["NXTL Shield extension is detected and running!"]),
      ]),
      h("p", { class: "muted", style: "margin-top: var(--sp-2);" }, [
        `Active rulesets: ${ext.rulesets.join(", ") || "Standard"}.`,
      ]),
      statusMsg,
    );
  } else {
    statusBox.append(
      h("div", { class: "row", style: "align-items: center;" }, [
        h("span", { class: "pill neutral" }, [createIcon("info", 14), "Not Detected"]),
        h("span", {}, ["Extension not yet detected in this browser."]),
      ]),
      h("div", { style: "margin-top: var(--sp-3);" }, [verifyBtn]),
      statusMsg,
    );
  }

  // Browser-specific Download & Install Card
  const downloadCard = h("section", { class: "card", style: "margin-top: var(--sp-4);" });
  if (isFirefox) {
    downloadCard.append(
      h("div", { class: "row", style: "align-items: center; margin-bottom: var(--sp-3);" }, [
        createIcon("desktop", 24),
        h("h2", { style: "margin: 0;" }, ["Install for Firefox"]),
      ]),
      h("p", { class: "muted" }, [
        "Download the signed .xpi add-on file from our official GitHub release.",
      ]),
      h("div", { class: "row", style: "margin: var(--sp-4) 0;" }, [
        h("a", {
          class: "btn primary lg",
          href: "https://github.com/nxtlsim/nxtl-shield/releases/latest/download/nxtl-shield-firefox.xpi",
          target: "_blank",
          rel: "noreferrer",
        }, [
          createIcon("download", 20),
          "Add to Firefox (.xpi)",
        ]),
      ]),
    );
  } else {
    // Chrome / Edge / Brave / Chromium
    const copyExtensionsBtn = h("button", { class: "btn sm", type: "button" }, [
      createIcon("copy", 14),
      "Copy chrome://extensions",
    ]);
    copyExtensionsBtn.addEventListener("click", () => {
      navigator.clipboard.writeText("chrome://extensions").catch(() => undefined);
      copyExtensionsBtn.textContent = "Copied address!";
      setTimeout(() => {
        copyExtensionsBtn.replaceChildren(createIcon("copy", 14), "Copy chrome://extensions");
      }, 2000);
    });

    downloadCard.append(
      h("div", { class: "row", style: "align-items: center; margin-bottom: var(--sp-3);" }, [
        createIcon("desktop", 24),
        h("h2", { style: "margin: 0;" }, ["Install for Chrome, Edge, and Brave"]),
      ]),
      h("p", { class: "muted" }, [
        "Download the extension package (.zip) from our latest release and load it in 4 quick steps:",
      ]),
      h("div", { style: "margin: var(--sp-4) 0;" }, [
        h("a", {
          class: "btn primary lg",
          href: "https://github.com/nxtlsim/nxtl-shield/releases/latest/download/nxtl-shield-chromium.zip",
          target: "_blank",
          rel: "noreferrer",
        }, [
          createIcon("download", 20),
          "Download for Chrome (.zip)",
        ]),
      ]),
      h("ol", { class: "numbered-steps", style: "font-size: 1rem; margin: var(--sp-4) 0;" }, [
        h("li", {}, ["Download and unzip the extension zip file on your computer."]),
        h("li", {}, ["In your browser address bar, open chrome://extensions (or edge://extensions)."]),
        h("li", {}, ["Enable the Developer mode switch in the top-right corner of that page."]),
        h("li", {}, ["Click Load unpacked and select the unzipped extension directory."]),
      ]),
      h("div", { class: "row" }, [copyExtensionsBtn]),
    );
  }

  const faqs = faqSection([
    {
      q: "Does this extension track my browsing history?",
      a: "No. NXTL Shield collects zero browsing history, zero telemetry, and zero identifiers. All blocking takes place locally using standard declarativeNetRequest rules.",
    },
    {
      q: "Can I temporarily pause blocking if a site is broken?",
      a: "Yes. Simply click the NXTL Shield icon in your browser toolbar and click 'Pause 5 minutes'.",
    },
    {
      q: "Is this extension free and open source?",
      a: "Yes, 100% free and open source under GPLv3. There are no paid tiers, subscriptions, or hidden tracking.",
    },
  ]);

  root.append(header, intro, statusBox, downloadCard, faqs);
  return root;
}

// ----------------------------------------------------
// TOOL PAGES OVERHAUL
// ----------------------------------------------------

export async function pageCheck(tab = "link"): Promise<HTMLElement> {
  const root = h("div", { class: "grid" });

  const intro = introBlock({
    what: "Check web addresses, text messages, files, or QR codes against known threat lists and security heuristics.",
    when: "Use whenever you receive an unexpected message, a shortened link, a file from an unknown sender, or scan a physical QR code.",
    howSteps: [
      "Select Link, Message, File, or QR tab.",
      "Paste the address or content to inspect.",
      "Click Check to run the inspection.",
      "Review the color-coded verdict and recommended next step.",
    ],
    limits: [
      "Nothing you submit is uploaded or saved to any server; reputation checks run against the bundled local snapshot.",
      "File inspection computes a cryptographic hash (SHA-256) locally; it is not a deep memory or malware content scanner.",
      "A 'clean' verdict indicates no match in known lists, but can never guarantee a brand-new threat is safe.",
    ],
  });

  const header = h("div", {}, [
    h("h1", {}, ["Check a link, message or file"]),
    h("p", { class: "lede" }, [
      "Shield runs link, message, and file checks in this browser. Nothing you submit is uploaded. Reputation lists are the bundled snapshot.",
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

  const faqs = faqSection([
    {
      q: "Does NXTL Shield see the links or text I check?",
      a: "No. Everything runs inside your browser using bundled threat databases and regular expressions. Your inputs never leave your computer.",
    },
    {
      q: "How often are the threat lists updated?",
      a: "Threat lists ship as a bundled snapshot with each release. See Sources for where they come from.",
    },
  ]);
  root.append(faqs);
  return root;
}

function linkForm() {
  const input = h("textarea", {
    "data-testid": "check-input",
    rows: "3",
    placeholder: "https://example.com/suspicious-path",
  });
  const out = h("div");
  const button = h("button", { class: "primary lg", type: "button", "data-testid": "check-run" }, [
    createIcon("search", 20),
    "Check link",
  ]);

  button.addEventListener("click", async () => {
    if (!input.value.trim()) {
      out.replaceChildren(emptyState({
        iconName: "link",
        title: "Please enter a URL",
        description: "Paste a website address or link into the box above to inspect it.",
        example: "https://verify-account-security.example.org",
      }));
      return;
    }
    button.disabled = true;
    const rep = await loadReputation();
    const result = checkUrl(input.value, rep);
    reportsAdd(makeReport("url", result.verdict, result.inputRedacted));
    out.replaceChildren(resultCard(result));
    button.disabled = false;
  });

  return h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
    field("Website or link address", input, "Tested safely without visiting"),
    h("div", { class: "row" }, [button]),
    out,
  ]);
}

function messageForm() {
  const input = h("textarea", {
    "data-testid": "check-input",
    rows: "4",
    placeholder: "Paste an SMS, WhatsApp text, or email body here...",
  });
  const out = h("div");
  const button = h("button", { class: "primary lg", type: "button", "data-testid": "check-run" }, [
    createIcon("search", 20),
    "Check message",
  ]);

  button.addEventListener("click", async () => {
    if (!input.value.trim()) {
      out.replaceChildren(emptyState({
        iconName: "message",
        title: "Please paste a message",
        description: "Paste any suspicious SMS, text message, or email body to check for phishing links.",
      }));
      return;
    }
    button.disabled = true;
    const rep = await loadReputation();
    const result = checkText(input.value, rep);
    reportsAdd(makeReport("text", result.verdict, result.inputRedacted));
    out.replaceChildren(resultCard(result));
    button.disabled = false;
  });

  return h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
    field("Suspicious message text", input, "Stays in this browser, never uploaded"),
    h("div", { class: "row" }, [button]),
    out,
  ]);
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
    if (result.sha256) {
      card.append(h("p", { class: "mono", style: "margin-top: var(--sp-3);" }, [`SHA-256: ${result.sha256}`]));
    }
    card.append(h("p", { class: "muted-soft" }, ["Not a malware content scan. The file was not uploaded."]));
    out.replaceChildren(card);
  });

  return h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
    field("Select file to hash", input, "Files up to 32 MB are hashed locally"),
    h("p", { class: "muted" }, ["Calculates the cryptographic SHA-256 fingerprint without uploading."]),
    out,
  ]);
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
      out.replaceChildren(h("p", { class: "banner" }, ["No QR code was found in that image. Nothing was uploaded."]));
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  const camera = h("button", { type: "button", class: "btn" }, [
    createIcon("camera", 18),
    "Scan with camera",
  ]);
  camera.addEventListener("click", async () => {
    video.hidden = false;
    try {
      const { BrowserQRCodeReader } = await import("@zxing/library");
      const decoded = await new BrowserQRCodeReader().decodeOnceFromVideoDevice(undefined, video);
      await showDecoded(decoded.getText(), out);
    } catch {
      out.replaceChildren(h("p", { class: "banner" }, ["The camera did not return a code, or permission was denied."]));
    } finally {
      video.srcObject && (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      video.hidden = true;
    }
  });

  return h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
    field("Upload QR code screenshot or photo", file),
    h("div", { class: "row" }, [camera]),
    video,
    h("p", { class: "muted-soft" }, ["Decoded entirely on this device. Shield does not automatically navigate to the URL."]),
    out,
  ]);
}

async function showDecoded(text: string, out: HTMLElement) {
  const rep = await loadReputation();
  const result = /^https?:\/\//i.test(text.trim()) ? checkUrl(text.trim(), rep) : checkText(text, rep);
  reportsAdd(makeReport("qr", result.verdict, result.inputRedacted));
  const card = resultCard(result);
  card.prepend(h("p", { class: "mono", style: "font-weight: 700;" }, [`Decoded URL: ${result.inputRedacted}`]));
  if (/^https?:\/\//i.test(text.trim())) {
    const open = h("a", { class: "btn sm", href: text.trim(), rel: "noreferrer", target: "_blank" }, [
      "Open destination",
      createIcon("external", 14),
    ]);
    card.append(h("p", { class: "muted-soft" }, ["Opening this link is your choice. Shield never navigates automatically."]), open);
  }
  out.replaceChildren(card);
}

// ----------------------------------------------------
// LINK CLEANER
// ----------------------------------------------------
export function pageClean(): HTMLElement {
  const input = h("textarea", {
    "data-testid": "check-input",
    rows: "3",
    placeholder: "https://example.com/item?utm_source=newsletter&utm_medium=email&fbclid=123",
  });
  const out = h("div");
  let previous = "";

  const button = h("button", { class: "primary lg", type: "button", "data-testid": "check-run" }, [
    createIcon("clean", 20),
    "Clean URL",
  ]);
  const undo = h("button", { type: "button", class: "btn" }, [
    createIcon("refresh", 16),
    "Undo",
  ]);
  undo.disabled = true;

  button.addEventListener("click", () => {
    previous = input.value;
    const result = cleanUrl(input.value);
    undo.disabled = !result.changed;

    const card = h("section", { class: "card result-card ok", "data-testid": "verdict" }, [
      h("h2", {}, [result.preserved ? "Left unchanged" : result.changed ? "Tracking parameters removed" : "No change needed"]),
      h("p", { class: "muted" }, [result.reason]),
      h("p", { class: "mono diff", style: "padding: var(--sp-3); background: var(--raised); border-radius: var(--radius-sm);" }, [result.cleaned]),
      h("p", { class: "muted-soft" }, [result.removed.length ? `Removed tracking keys: ${result.removed.join(", ")}` : "No tracking keys found"]),
    ]);

    const copy = h("button", { type: "button", class: "primary sm" }, [
      createIcon("copy", 16),
      "Copy clean URL",
    ]);
    copy.addEventListener("click", () => {
      navigator.clipboard.writeText(result.cleaned).catch(() => undefined);
      copy.textContent = "Copied!";
      setTimeout(() => {
        copy.replaceChildren(createIcon("copy", 16), "Copy clean URL");
      }, 2000);
    });

    card.append(copy);
    out.replaceChildren(card);
    input.value = result.cleaned;
  });

  undo.addEventListener("click", () => {
    input.value = previous;
    undo.disabled = true;
  });

  const intro = introBlock({
    what: "Remove surveillance and advertising parameters (such as utm_source, fbclid, gclid) from links before sending them to others.",
    when: "Clean links before pasting into social media, messaging apps, or public posts.",
    howSteps: [
      "Paste the messy link into the box.",
      "Click Clean URL.",
      "Copy the cleaned, privacy-safe URL.",
    ],
    limits: [
      "Conservative cleaning: login, payment, and signed links are preserved untouched to prevent breaking access.",
      "Does not bypass URL shorteners (e.g. bit.ly); only removes tracking query strings from the visible link.",
    ],
  });

  const faqs = faqSection([
    {
      q: "Why should I clean links?",
      a: "Tracking tags allow ad companies to trace which friend sent a link to whom across social media platforms. Cleaning removes this tracking footprint.",
    },
    {
      q: "Can cleaning break a website?",
      a: "Our algorithm uses a safe list of purely promotional query parameters. If a link doesn't open properly, click Undo to restore the original.",
    },
  ]);

  return h("div", { class: "grid" }, [
    h("h1", {}, ["Clean a URL"]),
    h("p", { class: "lede" }, ["Conservative parameter removal. Signed, login, and payment URLs are kept as you pasted them. Nothing is sent."]),
    intro,
    h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
      field("URL to clean", input),
      h("div", { class: "row" }, [button, undo]),
      out,
    ]),
    faqs,
  ]);
}

// ----------------------------------------------------
// PASSWORD TOOLS
// ----------------------------------------------------
export function pagePassword(): HTMLElement {
  const length = h("input", { type: "text", value: "20", style: "max-width: 140px;" });
  const symbols = h("input", { type: "checkbox" });
  (symbols as HTMLInputElement).checked = true;

  const out = h("div");
  const generated = h("p", {
    class: "mono",
    "data-testid": "verdict",
    style: "font-size: 1.2rem; font-weight: 700; padding: var(--sp-4); background: var(--raised); border-radius: var(--radius-md); border: 1px solid var(--line-accent);",
  }, ["Generate a password. It is not saved."]);

  const make = h("button", { class: "primary", type: "button" }, [
    createIcon("password", 18),
    "Generate password",
  ]);
  const phrase = h("button", { class: "btn", type: "button" }, [
    createIcon("password", 18),
    "Generate passphrase",
  ]);
  const check = h("button", { class: "btn", type: "button" }, [
    createIcon("shield-alert", 18),
    "Check pwned range",
  ]);
  let current = "";

  make.addEventListener("click", () => {
    try {
      const value = generatePassword({ length: Number(length.value), symbols: (symbols as HTMLInputElement).checked });
      current = value.password;
      generated.textContent = value.password;
      out.replaceChildren(
        h("p", {}, [value.note]),
        h("p", { class: "pill ok" }, [passwordStrength(value.password).note + ` Score ${passwordStrength(value.password).score} of 4.`]),
      );
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
    out.replaceChildren(
      h("p", { style: "font-weight: 700;" }, [result.summary]),
      h("p", { class: "muted" }, [result.scope]),
      h("p", { class: "mono muted-soft" }, [result.requestUrl]),
    );
    current = "";
    generated.textContent = "Cleared from the page after the check.";
  });

  const copyStatus = h("p", { class: "muted", role: "status" });
  const copy = h("button", { type: "button", class: "btn" }, [
    createIcon("copy", 16),
    "Copy",
  ]);
  copy.addEventListener("click", async () => {
    const value = generated.textContent ?? "";
    if (!value || value.startsWith("Generate") || value.startsWith("Cleared")) {
      copyStatus.textContent = "Generate a password first.";
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      copyStatus.textContent = "Copied.";
    } catch {
      copyStatus.textContent = "The clipboard refused the copy. Select the password and use your device’s copy command.";
    }
  });

  const intro = introBlock({
    what: "Generate cryptographically strong, random passwords and passphrases entirely within your browser.",
    when: "Create new passwords for email, banking, social media, or device accounts.",
    howSteps: [
      "Choose desired password length (minimum 12 recommended).",
      "Click Generate password or Generate passphrase.",
      "Copy to your password manager.",
      "Optionally click 'Check pwned range' to verify against known breaches using k-anonymity.",
    ],
    limits: [
      "Generated passwords are never sent or stored anywhere.",
      "The breach check sends only the first 5 characters of the SHA-1 hash (k-anonymity) to api.pwnedpasswords.com. Your actual password is never transmitted.",
    ],
  });

  const faqs = faqSection([
    {
      q: "What is a passphrase vs a password?",
      a: "A passphrase is composed of several random dictionary words (e.g. 'correct horse battery staple'). It is often easier to type on phones while providing immense cryptographic strength.",
    },
    {
      q: "Does NXTL store my passwords?",
      a: "Never. All generation runs in Web Crypto on your device.",
    },
  ]);

  return h("div", { class: "grid" }, [
    h("h1", {}, ["Password tools"]),
    h("p", { class: "lede" }, ["Generated in this browser with Web Crypto. Passwords are not stored and are not sent unless you run the optional range check."]),
    intro,
    h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
      field("Password length (12–64 characters)", length),
      h("label", { class: "row" }, [symbols, " Include special symbols (!@#$%^&*)"]),
      h("div", { class: "row" }, [make, phrase, copy, check]),
      generated,
      copyStatus,
      out,
      h("p", { class: "muted-soft" }, [
        "The range check sends only the first five characters of the SHA-1 hash to api.pwnedpasswords.com, with Add-Padding. It is not an email breach search.",
      ]),
    ]),
    faqs,
  ]);
}

// ----------------------------------------------------
// CONNECTION DOCTOR
// ----------------------------------------------------
export async function pageConnection(): Promise<HTMLElement> {
  const out = h("div");
  const ipButton = h("button", { type: "button", class: "primary" }, [
    createIcon("search", 18),
    "Look up public IP",
  ]);
  const rtcButton = h("button", { type: "button", class: "btn" }, [
    createIcon("connection", 18),
    "Count WebRTC candidates",
  ]);
  const wifi = h("select", {}, [
    option("unknown", "I have not said"),
    option("yes", "I am on public Wi-Fi"),
    option("no", "I am not on public Wi-Fi"),
  ]);

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
      h("section", { class: "card result-card info" }, [
        h("h2", {}, [explanation.summary]),
        ...explanation.points.map((point) => h("p", {}, [point])),
        h("p", {}, [h("a", { class: "btn sm", href: explanation.links.connectionCheck }, ["Open the NXTL travel connection check"])]),
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

  const intro = introBlock({
    what: "Diagnose network settings, discover your public IP address, and test for WebRTC address exposure.",
    when: "Use when joining public Wi-Fi at airports or hotels, or troubleshooting connectivity issues.",
    howSteps: [
      "Click 'Look up public IP' to see what IP address remote websites observe.",
      "Click 'Count WebRTC candidates' to see if your local device IP is visible via WebRTC.",
      "Check the diagnostic report for recommendations.",
    ],
    limits: [
      "Checking your IP address requires querying an external endpoint (api.ipify.org).",
      "Does not route your traffic or encrypt your general connection.",
    ],
  });

  const root = h("div", { class: "grid" }, [
    h("h1", {}, ["Connection Doctor"]),
    h("p", { class: "lede" }, [IP_LOOKUP.disclosure]),
    intro,
    h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
      h("p", { class: "muted-soft mono" }, ["User Agent: ", navigator.userAgent]),
      h("div", { class: "row" }, [ipButton, rtcButton]),
      field("Public Wi-Fi, as you report it", wifi),
      out,
    ]),
  ]);
  render();
  return root;
}

// ----------------------------------------------------
// LOCATION PRIVACY
// ----------------------------------------------------
export function pageLocation(): HTMLElement {
  const detected = /iPhone|iPad/.test(navigator.userAgent)
    ? "ios"
    : /Android/.test(navigator.userAgent)
      ? "android"
      : /Firefox/.test(navigator.userAgent)
        ? "firefox"
        : "chrome";

  const os = h("select", {}, [
    option("chrome", "This Chromium browser"),
    option("firefox", "Firefox"),
    option("ios", "iPhone or iPad"),
    option("android", "Android"),
  ]);
  (os as HTMLSelectElement).value = detected;
  const out = h("div");
  const perm = h("p", { class: "pill neutral" }, ["Website permission for Shield: not requested."]);

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
        h("p", { class: "muted" }, [guide.ipLocation]),
        h("h3", { style: "margin-top: var(--sp-4);" }, ["Recommended steps"]),
        ...guide.steps.map((step) => h("p", {}, [step])),
        h("h3", { style: "margin-top: var(--sp-4);" }, ["Important boundaries"]),
        ...guide.limits.map((step) => h("p", { class: "muted-soft" }, [step])),
      ]),
    );
  }

  os.addEventListener("change", render);
  render();

  const intro = introBlock({
    what: "Understand and control how websites and mobile apps determine your physical location.",
    when: "Review when you want to avoid unwanted tracking of your physical movements by websites or advertising networks.",
    howSteps: [
      "Distinguish browser Geolocation API permissions from IP-based geographic estimates.",
      "Follow the OS-specific steps below to disable broad location access.",
      "Add Ask exceptions only for trusted map and navigation websites.",
    ],
    limits: [
      "Blocking browser geolocation stops exact GPS coordinates, but websites can still estimate your city from your public IP address.",
      "NXTL eSIM provides a London internet exit which can obscure your local travel country from IP geolocation.",
    ],
  });

  return h("div", { class: "grid" }, [
    h("h1", {}, ["Location privacy"]),
    intro,
    h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
      perm,
      field("Show steps for your device", os),
      out,
    ]),
  ]);
}

// ----------------------------------------------------
// NXTL eSIM
// ----------------------------------------------------
export function pageEsim(): HTMLElement {
  const routing = explainNxtlRouting();
  const compat = esimCompatibilityGuidance();
  const setup = esimSetupSteps();
  const country = h("input", { type: "text", value: "Lithuania" });
  const rates = h("div");
  const button = h("button", { class: "primary", type: "button" }, [
    createIcon("search", 18),
    "Look up rates",
  ]);

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
      rates.replaceChildren(h("p", { class: "banner" }, [result.note]));
    }
  });

  return h("div", { class: "grid" }, [
    h("h1", {}, ["NXTL eSIM"]),
    h("p", { class: "lede" }, [routing.summary]),
    h("section", { class: "card" }, [
      h("h2", {}, ["London exit & travel privacy"]),
      ...routing.points.map((point) => h("p", {}, [point])),
      h("p", {}, [h("a", { class: "btn sm", href: routing.sourceUrl }, ["NXTL routing details", createIcon("arrow-right", 14)])]),
    ]),
    h("section", { class: "card" }, [
      h("h2", {}, ["Already have NXTL?"]),
      ...setup.alreadyHave.map((step) => h("p", {}, [step])),
      h("p", { class: "mono", style: "padding: var(--sp-2); background: var(--raised);" }, [setup.apn]),
      ...setup.platforms.map((item) => h("p", {}, [`${item.os}: ${item.steps}`])),
      h("p", { class: "muted" }, [setup.cannotVerify]),
      h("a", { class: "btn sm", href: NXTL_LINKS.account }, ["My Account", createIcon("external", 14)]),
    ]),
    h("section", { class: "card" }, [
      h("h2", {}, ["Compatibility"]),
      h("p", {}, [compat.summary]),
      h("p", { class: "muted" }, [compat.uncertainty]),
      h("p", {}, [compat.iphoneLockCheck]),
      h("a", { class: "btn sm", href: compat.links.checker }, ["Open compatibility checker", createIcon("external", 14)]),
    ]),
    h("section", { class: "card" }, [
      h("h2", {}, ["Coverage and rates"]),
      h("p", { class: "muted" }, ["Live EUR per GB from the public pricing API. Optional. Buying data does not change Shield."]),
      field("Country name", country),
      button,
      rates,
      h("a", { class: "btn sm ghost", href: NXTL_LINKS.tripBudget }, ["Trip data budget", createIcon("external", 14)]),
    ]),
  ]);
}

// ----------------------------------------------------
// PROTECTION SETUP & SAFE DNS
// ----------------------------------------------------
export async function pageSetup(): Promise<HTMLElement> {
  const ext = await queryExtension();
  const device = /iPhone|iPad/.test(navigator.userAgent)
    ? "Apple"
    : /Android/.test(navigator.userAgent)
      ? "Android"
      : /Windows/.test(navigator.userAgent)
        ? "Windows"
        : /Mac/.test(navigator.userAgent)
          ? "Mac"
          : "this computer";

  const root = h("div", { class: "grid" }, [
    h("h1", {}, ["Protection setup"]),
    h("p", { class: "lede" }, [
      `Steps below include ${device}. Pick a resolver, then use the matching section. Nothing here turns on until you install it.`,
    ]),
  ]);

  const engine = h("section", { class: "card" }, [h("h2", {}, ["This browser"])]);
  if (!ext) {
    engine.append(
      h("p", { "data-testid": "extension-status", class: "pill neutral" }, ["Extension: not detected."]),
      h("p", {}, ["There is no on/off switch here, because this page cannot see an engine. Load the extension from a release zip, then come back."]),
      h("p", { class: "muted" }, [
        "Chrome, Edge, and other Chromium browsers: chrome://extensions → Developer mode → Load unpacked → the chromium folder. Firefox needs a signed XPI for a normal release install. The unsigned build can be temporary-loaded for development.",
      ]),
      h("a", { class: "btn sm", href: "#/extension" }, ["Extension guide", createIcon("arrow-right", 14)]),
    );
  } else {
    engine.append(
      h("p", { "data-testid": "extension-status", class: "pill ok" }, [
        createIcon("shield-check", 14),
        "Extension: detected. Switches below read the rulesets back after each change.",
      ]),
    );
    engine.append(toggle("Threat blocking", ext.blockingEnabled, "blocking"));
    engine.append(toggle("Tracker domains", ext.trackersEnabled, "trackers"));
    engine.append(toggle("URL cleaning", ext.cleaningEnabled, "cleaning"));
    engine.append(toggle("Hide cookie banners (does not reject consent)", ext.cosmeticEnabled, "cosmetic"));

    const pause = h("button", { type: "button", class: "btn sm" }, ["Pause blocking and cleaning for 5 minutes"]);
    pause.addEventListener("click", async () => {
      await commandExtension("pause", { durationMs: 5 * 60 * 1000 });
      location.reload();
    });

    const resume = h("button", { type: "button", class: "btn sm primary" }, ["Resume"]);
    resume.addEventListener("click", async () => {
      await commandExtension("resume");
      location.reload();
    });

    engine.append(
      h("p", { class: "muted", style: "margin-top: var(--sp-3);" }, [
        ext.paused ? "Paused." : "Not paused. Pause does not change location settings or DNS.",
      ]),
      h("div", { class: "row" }, [pause, resume]),
    );

    if (ext.locationSupported) {
      engine.append(h("h3", { style: "margin-top: var(--sp-4);" }, ["Location in this browser"]));
      engine.append(h("p", {}, [`Engine setting for a normal https site: ${ext.locationSetting}. Managed by Shield: ${ext.locationManaged ? "yes" : "no"}.`]));
      const block = h("button", { type: "button", class: "btn sm" }, ["Block location by default"]);
      block.addEventListener("click", async () => {
        await commandExtension("locationBlock");
        location.reload();
      });
      const restore = h("button", { type: "button", class: "btn sm" }, ["Restore location settings"]);
      restore.addEventListener("click", async () => {
        await commandExtension("locationRestore");
        location.reload();
      });
      const originInput = h("input", { type: "text", placeholder: "https://www.google.com/maps" });
      const add = h("button", { type: "button", class: "primary sm" }, ["Add Ask exception"]);
      add.addEventListener("click", async () => {
        await commandExtension("locationException", { url: originInput.value, setting: "ask" });
        location.reload();
      });
      engine.append(
        h("div", { class: "row", style: "margin-bottom: var(--sp-3);" }, [block, restore]),
        field("Map or site URL", originInput),
        add,
      );
    } else {
      engine.append(h("p", { class: "muted" }, ["Location control is unsupported in this browser's extension."]));
    }
  }
  root.append(engine);

  // Safe DNS Section
  const select = h("select", {});
  for (const resolver of RESOLVERS) select.append(option(resolver.id, resolver.name));
  const dnsOut = h("div");

  function renderDns() {
    const id = (select as HTMLSelectElement).value;
    const resolver = RESOLVERS.find((item) => item.id === id)!;
    const profile = buildMobileconfig(id);

    const download = h("button", { type: "button", class: "primary" }, [
      createIcon("download", 18),
      "Download Apple profile",
    ]);
    download.addEventListener("click", () => {
      const blob = new Blob([profile.plist], { type: "application/x-apple-aspen-config" });
      const url = URL.createObjectURL(blob);
      const anchor = h("a", { href: url, download: profile.filename }, ["profile"]);
      anchor.click();
      URL.revokeObjectURL(url);
    });

    const copy = h("button", { type: "button", class: "btn" }, [
      createIcon("copy", 18),
      "Copy Android hostname",
    ]);
    copy.addEventListener("click", () => {
      navigator.clipboard.writeText(resolver.dotHost).catch(() => undefined);
      copy.textContent = "Copied hostname!";
      setTimeout(() => {
        copy.replaceChildren(createIcon("copy", 18), "Copy Android hostname");
      }, 2000);
    });

    const paste = h("textarea", { placeholder: "Paste the provider check page text here to verify..." });
    const verdict = h("p", { class: "banner" });
    const judge = h("button", { type: "button", class: "primary sm" }, [
      createIcon("check", 16),
      "Read pasted check",
    ]);
    judge.addEventListener("click", () => {
      const result = interpretDnsCheckPaste(id, paste.value);
      verdict.textContent = `${result.verdict.replaceAll("_", " ")}: ${result.summary}`;
    });

    dnsOut.replaceChildren(
      h("p", { style: "font-weight: 600;" }, [`Blocks: ${resolver.blocks}`]),
      h("p", { class: "muted" }, [resolver.bundling]),
      h("p", {}, [
        h("a", { href: resolver.privacyUrl, target: "_blank", rel: "noreferrer" }, ["Privacy policy"]),
        resolver.verifyUrl ? " · " : "",
        resolver.verifyUrl ? h("a", { href: resolver.verifyUrl, target: "_blank", rel: "noreferrer" }, ["Provider check page"]) : "No verified check URL.",
      ]),
      h("div", { class: "row", style: "margin: var(--sp-4) 0;" }, [download, copy]),
      h("h3", {}, ["Android setup"]),
      ...androidPrivateDnsSteps(id).steps.map((step) => h("p", {}, [step])),
      h("h3", { style: "margin-top: var(--sp-4);" }, ["Apple removal and deprecation"]),
      ...appleRemovalSteps().map((step) => h("p", {}, [step])),
      ...profile.notes.map((note) => h("p", { class: "muted-soft" }, [note])),
      h("h3", { style: "margin-top: var(--sp-4);" }, ["Windows 11 setup"]),
      ...windowsDohSteps(id).steps.map((step) => h("p", {}, [step])),
      h("h3", { style: "margin-top: var(--sp-4);" }, ["Chrome browser Secure DNS"]),
      ...chromeSecureDnsSteps(id).steps.map((step) => h("p", {}, [step])),
      h("h3", { style: "margin-top: var(--sp-4);" }, ["Firefox browser DoH"]),
      ...firefoxDohSteps(id).steps.map((step) => h("p", {}, [step])),
      field("Verify DNS: Paste check page text", paste),
      judge,
      verdict,
    );
  }

  select.addEventListener("change", renderDns);
  renderDns();

  root.append(
    h("section", { class: "card", style: "margin-top: var(--sp-4);" }, [
      h("h2", {}, ["Device DNS"]),
      h("p", { class: "muted" }, [
        "You choose the resolver. Shield does not run one, and a download is not an installed profile.",
      ]),
      field("Select Safe DNS Provider", select),
      dnsOut,
    ]),
  );
  return root;
}

function toggle(label: string, on: boolean, key: string) {
  const input = h("input", { type: "checkbox" });
  (input as HTMLInputElement).checked = on;
  input.addEventListener("change", async () => {
    const status = await commandExtension("setToggle", { key, enabled: (input as HTMLInputElement).checked });
    if (!status) (input as HTMLInputElement).checked = on;
  });
  return h("label", { class: "row", style: "min-height: 44px;" }, [input, ` ${label}`]);
}

// ----------------------------------------------------
// CAPABILITY STATUS & SOURCES
// ----------------------------------------------------
export function pageStatus(): HTMLElement {
  const list = h("div", { class: "grid" });
  for (const item of CAPABILITIES) {
    list.append(
      h("article", { class: "card" }, [
        h("h2", { style: "font-size: 1.15rem;" }, [`${item.id}. ${item.name}`]),
        h("p", { class: "pill ok" }, [item.userStatus.replaceAll("_", " ")]),
        h("p", { class: "muted" }, [item.implementationStatus]),
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
    h("p", { class: "lede" }, ["What this version can do, and what still needs setup or a native app."]),
    list,
    h("h2", { style: "margin-top: var(--sp-6);" }, ["Support matrix"]),
    matrix,
    h("h2", { style: "margin-top: var(--sp-6);" }, ["Sources"]),
    sources,
  ]);
}

// ----------------------------------------------------
// INSTALL PAGE
// ----------------------------------------------------
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
      h("section", { class: "card", style: "margin-top: var(--sp-4);" }, [
        h("h2", {}, [guide.platform]),
        ...guide.steps.map((step) => h("p", {}, [step])),
        ...guide.limits.map((step) => h("p", { class: "muted-soft" }, [step])),
      ]),
    );
  }

  const button = h("button", { class: "primary lg", type: "button", "data-testid": "install-link" }, [
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
    deferred = event as unknown as { prompt: () => Promise<void> };
    render();
  });
  render();

  return h("div", { class: "grid" }, [
    h("h1", {}, ["Install"]),
    h("p", { class: "lede" }, [
      "Installing the page does not add native device protection, a device tunnel, or device DNS. Those are separate.",
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
    "Export",
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
      "Only redacted summaries are kept in this browser. Passwords and file bytes are not.",
    ]),
    h("div", { class: "row" }, [exportButton, wipe]),
    list,
  ]);
}

function option(value: string, label: string) {
  const el = h("option", { value }, [label]);
  return el;
}
