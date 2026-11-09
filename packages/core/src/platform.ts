export interface PlatformRow {
  surface: string;
  install: string;
  manualTools: string;
  extension: string;
  dns: string;
  location: string;
  offline: string;
  evidence: string;
}

export function platformSupport(): PlatformRow[] {
  return [
    {
      surface: "Chrome / Edge desktop",
      install: "beforeinstallprompt when the browser fires it, otherwise the browser's install menu.",
      manualTools: "URL, text, QR, cleaner, passwords, file hash, connection doctor, eSIM guidance.",
      extension: "MV3 package. Load unpacked in v1. Not published to a store.",
      dns: "Chrome secure-DNS steps, plus OS steps you apply yourself.",
      location: "contentSettings block and exact-origin exceptions, read back from the browser.",
      offline: "Service worker caches the app shell and list snapshots after one online visit. Submissions are not cached.",
      evidence: "Playwright Chromium when the suite has been run. Not a substitute for every Chrome version.",
    },
    {
      surface: "Firefox desktop",
      install: "No beforeinstallprompt. The page works in a tab. Windows web-app menu text is UNVERIFIED.",
      manualTools: "Same local tools.",
      extension: "MV3 build. Release Firefox needs an AMO signature this repo cannot produce. Temporary load is the test path.",
      dns: "Firefox DoH steps. Current Settings labels were UNVERIFIED.",
      location: "Unsupported. No contentSettings API.",
      offline: "Same service worker, when the browser allows it.",
      evidence: "Playwright Firefox for the page. Extension load is recorded separately and may be lint-only.",
    },
    {
      surface: "Safari / WebKit desktop",
      install: "macOS: File or Share → Add to Dock.",
      manualTools: "Same local tools, where WebKit supports the APIs. QR uses zxing, not BarcodeDetector.",
      extension: "Not built. Safari would need a separate Web Extension packaging step.",
      dns: "Apple configuration profile you install yourself. Deprecated type at OS 27.",
      location: "No contentSettings. Use system Settings.",
      offline: "Service worker support varies. A failed worker leaves the online page usable.",
      evidence: "Playwright WebKit is not a physical Mac or iPhone pass.",
    },
    {
      surface: "Chrome on Android",
      install: "Menu → Add to Home screen → Install, or the install prompt when fired.",
      manualTools: "Same page, tested at 320–430 px in emulation.",
      extension: "Chrome on Android does not run extensions.",
      dns: "Private DNS hostname steps. You type the hostname. Shield cannot flip the setting.",
      location: "Manual per-app steps. The extension control does not exist here.",
      offline: "After one cached visit, the shell can reload. Not device-tested.",
      evidence: "Emulated viewport only. Not a physical Android pass.",
    },
    {
      surface: "Safari on iPhone / iPad",
      install: "Share → Add to Home Screen → Open as Web App. iOS 27 wording UNVERIFIED.",
      manualTools: "Same page. Camera QR needs a user gesture and camera permission.",
      extension: "Not shipped. Safari Web Extensions on iOS need a signed native wrapper. Not built.",
      dns: "Download the .mobileconfig and install it from Safari. Shield does not install it. OS 27 deprecation applies.",
      location: "Settings → Privacy & Security → Location Services. No silent switch.",
      offline: "Not verified on a device.",
      evidence: "Not run on iPhone hardware.",
    },
    {
      surface: "Firefox on Android",
      install: "No beforeinstallprompt.",
      manualTools: "Same page if the browser loads it.",
      extension: "Manifest declares gecko_android. A real-device ruleset test was not run (UNVERIFIED).",
      dns: "Android Private DNS is system-wide and separate from the extension.",
      location: "Unsupported in the extension.",
      offline: "Not device-tested.",
      evidence: "Not run on a phone.",
    },
    {
      surface: "Samsung Internet",
      install: "beforeinstallprompt is in compat data. Menu labels UNVERIFIED.",
      manualTools: "Expected to work. Not device-tested.",
      extension: "Not a target.",
      dns: "Android Private DNS steps. Samsung menu path UNVERIFIED.",
      location: "Manual Android steps.",
      offline: "Not device-tested.",
      evidence: "Not run.",
    },
    {
      surface: "TV, router, and other embedded devices",
      install: "No client.",
      manualTools: "Not claimed.",
      extension: "Not claimed.",
      dns: "Only if the device has its own DNS settings you edit. No profile generator for routers.",
      location: "Not claimed.",
      offline: "Not claimed.",
      evidence: "Not run.",
    },
  ];
}
