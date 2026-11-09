export interface InstallGuide {
  platform: string;
  canPrompt: boolean;
  standalone: boolean;
  steps: string[];
  limits: string[];
}

export function installInstructions(input: {
  userAgent: string;
  standalone?: boolean;
  beforeInstallPrompt?: boolean;
}): InstallGuide {
  const ua = input.userAgent || "";
  const standalone = Boolean(input.standalone);
  if (standalone) {
    return {
      platform: "standalone",
      canPrompt: false,
      standalone: true,
      steps: ["This window is already running as an installed app (standalone display mode). You do not need to install it again."],
      limits: ["An installed PWA is still a website. It does not add antivirus, a device tunnel, or system-wide filtering."],
    };
  }
  const inApp = /Instagram|FBAN|FBAV|Line\/|Twitter|MicroMessenger/i.test(ua);
  if (inApp) {
    return {
      platform: "in-app browser",
      canPrompt: false,
      standalone: false,
      steps: ["Open this page in Safari or Chrome. In-app browsers usually cannot install a PWA or load an extension."],
      limits: ["The tools in the page still run here if the scripts load. Install and extension status stay not detected."],
    };
  }
  const ios = /iPhone|iPad|iPod/i.test(ua);
  if (ios) {
    return {
      platform: "iOS / iPadOS Safari",
      canPrompt: false,
      standalone: false,
      steps: [
        "In Safari, tap Share → Add to Home Screen.",
        "Turn on Open as Web App, then Add. That wording is from Apple's iOS 26 guide. Whether iOS 27 changed the words is UNVERIFIED.",
        "beforeinstallprompt does not exist in Safari. There is no one-tap install API to call.",
      ],
      limits: ["Chrome on iOS uses WebKit and also has no beforeinstallprompt. Use the Safari steps.", "The home-screen icon does not grant native location or SMS filtering."],
    };
  }
  const macSafari = /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
  if (macSafari) {
    return {
      platform: "macOS Safari",
      canPrompt: false,
      standalone: false,
      steps: ["File or Share → Add to Dock.", "Source: Apple's Safari web-apps guide, reviewed 2026-11-09."],
      limits: ["This is a web app in the Dock, not a Mac App Store security suite."],
    };
  }
  const firefox = /Firefox/i.test(ua);
  if (firefox) {
    return {
      platform: "Firefox",
      canPrompt: false,
      standalone: false,
      steps: [
        "Firefox does not support beforeinstallprompt.",
        "Use the site in a tab. Firefox Windows “web apps” menu text was UNVERIFIED on 2026-11-09.",
        "On Android, Firefox can install extensions. The Shield extension is a separate install from the page.",
      ],
      limits: ["Lack of an install prompt does not remove the checks in this page."],
    };
  }
  const android = /Android/i.test(ua);
  if (android && /SamsungBrowser/i.test(ua)) {
    return {
      platform: "Samsung Internet",
      canPrompt: Boolean(input.beforeInstallPrompt),
      standalone: false,
      steps: [
        input.beforeInstallPrompt
          ? "This browser offered an install prompt. Use Install NXTL Shield to show it."
          : "Samsung Internet supports beforeinstallprompt according to browser-compat data. The exact menu labels were UNVERIFIED (Samsung's developer page returned 404).",
        "If no prompt appears, use the browser menu and look for Add page to or Install.",
      ],
      limits: ["Menu text was not confirmed on a Samsung phone."],
    };
  }
  if (android) {
    return {
      platform: "Chrome on Android",
      canPrompt: Boolean(input.beforeInstallPrompt),
      standalone: false,
      steps: [
        input.beforeInstallPrompt
          ? "This browser offered an install prompt. The Install button will show it. That is a real prompt, not a stored preference."
          : "Menu → Add to Home screen → Install. Chrome on Android does not run extensions.",
      ],
      limits: ["Installing the PWA does not install the extension and does not change Private DNS."],
    };
  }
  const desktopChromium = /Chrome|Chromium|Edg/i.test(ua);
  if (desktopChromium) {
    return {
      platform: /Edg/i.test(ua) ? "Edge on desktop" : "Chrome on desktop",
      canPrompt: Boolean(input.beforeInstallPrompt),
      standalone: false,
      steps: [
        input.beforeInstallPrompt
          ? "An install prompt is available. Use the Install button."
          : "Menu → Cast, save, and share → Install page as app. An install icon may also appear in the address bar.",
        "Uninstall steps are on the same Google or Microsoft help pages.",
      ],
      limits: ["The extension is a separate install. The PWA does not include it automatically."],
    };
  }
  return {
    platform: "this browser",
    canPrompt: Boolean(input.beforeInstallPrompt),
    standalone: false,
    steps: [
      input.beforeInstallPrompt
        ? "An install prompt is available. Use the Install button."
        : "No install API was detected. Keep using the site in this tab. Shield does not claim one-tap install on every device.",
    ],
    limits: ["Manual tools in the page do not require installation."],
  };
}
