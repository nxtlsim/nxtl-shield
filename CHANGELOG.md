# Changelog

## 0.5.0

- Private messages & files can create a private link that is gone after it is opened. You can also require a password. The locked text is deleted when someone opens it, or after 1 hour, 1 day, or 7 days.
- Share Shield lets you send the official app link by copy, email, text message, or QR code.
- Coverage wording is 180+ countries, and the travel data card keeps the London routing sentence.
- Check results are clearer: a lottery text is marked Likely scam, with a short headline and no fake buttons.
- Layout and wording polish: badges sit with their labels, buttons line up, the dark theme menu stays readable, and file Remove appears only after you choose a file.


## 0.4.0

- Clearer verdicts when you check a link or message: Likely scam, Be careful, or Looks safe. Prize and similar scam texts are flagged even without a link.
- Renamed Secure Share to Private messages & files with route `#/messages` (and `#/share` redirect).
- Your connection shows the public IPv4 and IPv6 address, city, country, and network provider that websites can see, and checks whether Safe DNS looks on.
- Safer, simpler setup: one-click Windows Safe DNS download, an Apple profile, and short steps for Android, Mac, and Linux.
- Secure Share uses a single file drop zone. Moving between tools starts at the top of the page.
- Short diagrams explain each tool, and motion respects reduced-motion settings.

## 0.3.0

- Clearer setup and home layout, with square controls and a compact Shield mark in the header.
- Easier Windows Safe DNS setup: download a setup folder, with undo files and browser policy files included.
- Password generator includes a one-tap Copy button.
- Link check accepts a bare domain such as delfi.lt and adds https:// for you.
- Customer-facing text covers how to use the tools, without internal notes.

## 0.2.0

- First public redesign of the web app, browser extension, and setup guides.

## 0.1.1

- Fix Chromium threat redirect regex escaping and signed-URL cleaning allow rules.
- Firefox MV3 background scripts fallback and data collection permissions for AMO signing.
- Location API supports contentSettings.location; extension E2E covers block/allowlist/pause/clean/location.

## 0.1.0

- Link, message, QR, and file checks
- Link cleaner
- Password tools and an optional range check
- Secure Share
- Connection Doctor and NXTL eSIM guidance
- DNS setup, including Apple profiles
- Chromium and Firefox extension builds
- Read-only HTTP API and MCP server
