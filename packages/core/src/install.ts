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
      platform: "Installed app",
      canPrompt: false,
      standalone: true,
      steps: ["NXTL Shield is running as an installed app. You do not need to install it again."],
      limits: ["All tools run directly on your device with offline support."],
    };
  }
  const inApp = /Instagram|FBAN|FBAV|Line\/|Twitter|MicroMessenger/i.test(ua);
  if (inApp) {
    return {
      platform: "In-app browser",
      canPrompt: false,
      standalone: false,
      steps: ["Open this page in Safari or Chrome to add it to your home screen."],
      limits: ["In-app browsers do not support adding apps to your home screen."],
    };
  }
  const ios = /iPhone|iPad|iPod/i.test(ua);
  if (ios) {
    return {
      platform: "iPhone & iPad (Safari)",
      canPrompt: false,
      standalone: false,
      steps: [
        "In Safari, tap the Share button at the bottom of the screen.",
        "Scroll down and tap 'Add to Home Screen'.",
        "Tap 'Add' in the top right. NXTL Shield will appear on your home screen.",
      ],
      limits: ["Safari does not offer an automatic install button; use Share → Add to Home Screen."],
    };
  }
  const macSafari = /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
  if (macSafari) {
    return {
      platform: "macOS Safari",
      canPrompt: false,
      standalone: false,
      steps: [
        "In Safari, click File or the Share button in the toolbar.",
        "Choose 'Add to Dock' to install NXTL Shield.",
      ],
      limits: ["Creates a standalone window shortcut in your Dock."],
    };
  }
  const firefox = /Firefox/i.test(ua);
  if (firefox) {
    return {
      platform: "Firefox",
      canPrompt: false,
      standalone: false,
      steps: [
        "In Firefox, keep using this site in a tab, or add a bookmark for quick access.",
        "To get continuous browser protection, add the Firefox extension from the Browser Extension page.",
      ],
      limits: ["Firefox desktop does not support one-click app installation."],
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
          ? "Tap the Install button above to add NXTL Shield to your device."
          : "Open the browser menu and select 'Add page to' → 'Home screen'.",
      ],
      limits: ["Adds a quick-launch icon to your home screen."],
    };
  }
  if (android) {
    return {
      platform: "Android (Chrome)",
      canPrompt: Boolean(input.beforeInstallPrompt),
      standalone: false,
      steps: [
        input.beforeInstallPrompt
          ? "Tap the Install button above to add NXTL Shield to your device."
          : "Tap the menu (three dots) and select 'Install app' or 'Add to Home screen'.",
      ],
      limits: ["Allows instant offline access from your home screen."],
    };
  }
  const desktopChromium = /Chrome|Chromium|Edg/i.test(ua);
  if (desktopChromium) {
    return {
      platform: /Edg/i.test(ua) ? "Microsoft Edge" : "Google Chrome",
      canPrompt: Boolean(input.beforeInstallPrompt),
      standalone: false,
      steps: [
        input.beforeInstallPrompt
          ? "Click the Install button above to install NXTL Shield."
          : "Click the Install icon in the address bar, or open the browser menu and choose 'Install NXTL Shield'.",
      ],
      limits: ["Installs as a fast desktop app on your computer."],
    };
  }
  return {
    platform: "This browser",
    canPrompt: Boolean(input.beforeInstallPrompt),
    standalone: false,
    steps: [
      input.beforeInstallPrompt
        ? "Click the Install button above to install NXTL Shield."
        : "Bookmark this page or pin this tab for fast access.",
    ],
    limits: ["All privacy and security tools work directly in this browser window."],
  };
}
