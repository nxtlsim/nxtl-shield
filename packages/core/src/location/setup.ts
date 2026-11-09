export interface LocationGuide {
  os: string;
  websitePermission: string;
  nativePermission: string;
  ipLocation: string;
  steps: string[];
  limits: string[];
  sourceUrl?: string;
  sourceAccessed: string;
}

const SHARED = {
  websitePermission:
    "A website's Location permission is separate. Blocking it does not change native app permissions or the IP address a server sees.",
  ipLocation:
    "IP-inferred location is a guess made by the server or a database. A DNS profile or an eSIM exit can change the address. It does not turn location off.",
  sourceAccessed: "2026-11-09",
};

export function locationPrivacySetup(os: string): LocationGuide {
  const key = os.toLowerCase();
  if (key === "ios" || key === "iphone" || key === "ipados") {
    return {
      os: "iOS / iPadOS",
      ...SHARED,
      nativePermission: "Per-app choices live in Settings. An ordinary app or a PWA cannot change other apps' permissions, and Shield does not show a switch that pretends to.",
      steps: [
        "Settings → Privacy & Security → Location Services.",
        "Open each app. Choices described by Apple (published 2026-10-24): Never, Ask Next Time Or When I Share, While Using, Always, plus Precise Location.",
        "There is no public settings URL for that screen that Shield can open. Follow the path above.",
        "Emergency and system services can still use location. Shield does not claim they are off.",
      ],
      limits: [
        "A global Location Services switch also affects Maps and other apps you may want. It is not a per-app exception.",
        "Installing the NXTL Shield PWA does not grant or remove location access for other apps.",
      ],
      sourceUrl: "https://support.apple.com/en-ie/102647",
    };
  }
  if (key === "android") {
    return {
      os: "Android",
      ...SHARED,
      nativePermission: "Per-app location is an Android setting. A normal app cannot silently revoke other apps' location permission. Shield does not request device-owner, root, or accessibility click automation.",
      steps: [
        "Settings → Location → App location permissions.",
        "Choices described by Google's help page: Allowed all the time, Allowed only while in use, Ask every time, Not allowed. Plus Use precise location.",
        "Alternative: long-press the app → App info → Permissions → Location.",
        "Pick “While using” for a map you actually want, instead of turning the system location switch off.",
      ],
      limits: [
        "Menus differ by manufacturer. The paths above are from Google's help, not a Samsung re-test.",
        "One active VPN per user or profile means a future local-filtering VPN would conflict with another VPN. v1 does not ship that VPN.",
      ],
      sourceUrl: "https://support.google.com/android/answer/6179507",
    };
  }
  if (key === "chrome" || key === "chromium" || key === "edge") {
    return {
      os: "Chromium (Chrome, Edge, and other Chromium browsers that expose contentSettings)",
      ...SHARED,
      nativePermission: "The extension can set the browser's location content setting. Firefox and Safari do not offer contentSettings, so this control is unsupported there.",
      steps: [
        "Install the NXTL Shield extension and turn on Block location in this browser.",
        "Add an exact origin exception for a map you trust. https://www.google.com/maps is the origin https://www.google.com, not maps.google.com and not every Google subdomain.",
        "Prefer Ask rather than Allow. Allow is an explicit choice.",
        "Restore clears only the content settings this extension set.",
      ],
      limits: [
        "Incognito is not changed.",
        "This does not affect other browsers or native apps.",
        "Edge on Android may not offer the extension. Chrome on Android does not run extensions.",
      ],
      sourceUrl: "https://developer.chrome.com/docs/extensions/reference/api/contentSettings",
    };
  }
  if (key === "firefox") {
    return {
      os: "Firefox",
      ...SHARED,
      nativePermission: "Firefox has no contentSettings API. The extension cannot block Geolocation for other sites. Use the site's own permission icon or Firefox settings.",
      steps: [
        "This control is unsupported in the Firefox extension.",
        "Manual checks in the NXTL Shield page still work. The page does not request location.",
      ],
      limits: ["Do not expect a location switch in the Firefox popup. It is intentionally absent."],
    };
  }
  return {
    os: "This browser",
    ...SHARED,
    nativePermission: "Shield does not request location for itself. Permission state shown in the page, when the Permissions API exists, is only this site's status.",
    steps: [
      "Use the operating-system steps for iOS or Android if you want to review app permissions.",
      "Use the Chromium extension where contentSettings exists.",
    ],
    limits: ["If the browser is an in-app webview, open Shield in Safari or Chrome before relying on install or permission prompts."],
  };
}
