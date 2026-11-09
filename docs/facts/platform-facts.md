# Platform facts (verified 2026-11-09; raw/platform/)

Browser support data comes from @mdn/browser-compat-data (BCD) 8.1.8 (released 2026-11-02, fetched from npm/unpkg).

## PWA install
- `beforeinstallprompt`:
  - Supported: Chrome 61+, Chrome Android 61+, Edge 79+, Opera 48+, Samsung Internet 8.0+.
  - NOT supported: Firefox (desktop and Android), Safari, Safari iOS.
  - Use feature detection, with manual instructions as the fallback.
- iOS / iPadOS 26 (https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/26/ios/26):
  - Safari → Share → Add to Home Screen (or via Edit Actions) → turn on **Open as Web App** → Add.
  - iOS 27 is now current (Apple guide version picker shows iOS 27). Whether the iOS 27 wording changed: UNVERIFIED.
- macOS Safari: File/Share → **Add to Dock** (https://support.apple.com/guide/safari/use-web-apps-ibrw9e991864/mac).
- Chrome Android: ⋮ More → Add to home screen → Install.
- Chrome desktop: ⋮ → Cast, save, and share → Install page as app, or use the address-bar install icon.
  - Uninstall steps are on the same Google help pages.
- Firefox Windows "web apps" (SUMO): page behind a JS challenge, UNVERIFIED.
- Samsung Internet developer docs: 404, UNVERIFIED. BCD shows Samsung supports beforeinstallprompt.

## Web APIs
- BarcodeDetector:
  - Chrome Android 83+ and Samsung 13+.
  - Desktop Chrome: ChromeOS and macOS only.
  - Safari: behind a flag. Firefox: none.
  - Ship a JS fallback decoder (@zxing/library).
- `navigator.userAgentData`: Chromium only. `Permissions.query`: Safari 16+.

## Extensions
- declarativeNetRequest (BCD):
  - Chrome/Edge 84+, Firefox and **Firefox Android 113+**, Safari and Safari iOS 15+.
  - `updateDynamicRules`: Safari 15.4+.
- Chrome DNR limits (developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest):
  - Static rulesets: 100 declared, 50 enabled.
  - GUARANTEED_MINIMUM_STATIC_RULES = 30,000. More comes from a shared global pool; check it with getAvailableStaticRuleCount().
  - Dynamic rules: 30,000 "safe" (Chrome 121+) and 5,000 unsafe.
  - Session rules: 5,000. Regex rules: 1,000. Each rule must be under 2 KB.
  - Safe actions: block, allow, allowAllRequests, upgradeScheme.
  - Chrome 148 supports the `browser.*` namespace.
- `chrome.contentSettings.location` (Chrome docs):
  - Values: allow / block / ask (default ask).
  - Scope: regular or incognito_session_only. Patterns have precedence. Provides `clear()`.
  - BCD has NO contentSettings entry, and the MDN WebExtensions index doesn't list it. **Firefox and Safari have no contentSettings**, so location blocking via an extension is Chromium-desktop only.
- Microsoft Learn API support table: contentSettings MV2/MV3 is listed on Windows/Linux/Mac/**Android**, and DNR/downloads/webRequest also list Android.
  - Edge Android extension availability is restricted. Microsoft collection: https://microsoftedge.microsoft.com/addons/collection/mobile_android_extensions
  - microsoft/MicrosoftEdge-Extensions issue #529: an extension must apply and pass a QA process to be offered on Edge mobile.
  - Device test on Edge Android: UNVERIFIED.
- Chrome Android does not run extensions. The Chrome Web Store help says that on a phone you add extensions "to Desktop".
- Kiwi Browser: archived/unmaintained after January 2025; its extension code went into Edge Canary (github.com/kiwibrowser/src.next README). Do not recommend it.
- Firefox Android:
  - Has an open extension ecosystem (Mozilla blog: more than 1,000 extensions by May 2024).
  - The manifest needs `browser_specific_settings.gecko_android` (Mozilla Add-ons blog, 2023-10-05).
  - DNR is supported from 113 per BCD.
  - Real-device test of our DNR ruleset size on Firefox Android: UNVERIFIED.
- AMO signing (https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/):
  - Release and Beta Firefox require Mozilla signing through AMO.
  - Self-distribution means an **unlisted** submission via web upload, `web-ext sign`, or the AMO API.
  - Requires an AMO account and API credentials (JWT issuer/secret). We have neither, so this is a BLOCKER for a signed XPI.

## Location privacy (OS guidance)
- iOS (https://support.apple.com/en-ie/102647, published 2026-10-24):
  - Settings → Privacy & Security → Location Services → [app].
  - Options: Never / Ask Next Time Or When I Share / While Using / Always. Plus the Precise Location toggle.
- Android (https://support.google.com/android/answer/6179507):
  - Settings → Location → App location permissions.
  - Options: Allowed all the time / Allowed only while in use / Ask every time / Not allowed.
  - Alternative path: long-press the app → App info → Permissions → Location. Plus the "Use precise location" toggle.

## Android native (for a later APK)
- VpnService (https://developer.android.com/develop/connectivity/vpn): "There's only one active service per user or profile. Starting a new service, automatically stops an existing service." A local DNS filter VPN therefore conflicts with any other VPN, including an employer VPN.
- CallScreeningService: requires the `RoleManager.ROLE_CALL_SCREENING` role, requested via `RoleManager.createRequestRoleIntent`.
- File scanning (https://developer.android.com/training/data-storage/manage-all-files):
  - MANAGE_EXTERNAL_STORAGE grants broad shared-storage access. Even so, apps "still can't access the app-specific directories that belong to other apps" (/Android/data, /sdcard/Android).
  - The developer page and Google Play policy (https://support.google.com/googleplay/android-developer/answer/10467955) list anti-virus apps as a permitted use case. Play requires a declaration and review.
- Installed-app inventory: QUERY_ALL_PACKAGES is permitted for antivirus apps under the Play policy (https://support.google.com/googleplay/android-developer/answer/10158779), subject to Prominent Disclosure. See also https://developer.android.com/training/package-visibility.
- iOS: all third-party apps are sandboxed (Apple Platform Security, app sandbox page). A general antivirus can't scan other apps.
