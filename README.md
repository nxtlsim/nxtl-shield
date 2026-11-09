# NXTL Shield: free, open-source privacy and security tools

## What is NXTL Shield?

NXTL Shield is a free, open-source set of privacy and security tools from NXTL eSIM. Use it in the browser as an installable web app, or add the browser extension for continuous controls. Every tool works without an account. NXTL eSIM mobile data is optional and does not unlock Shield.

## Features

### Phishing and scam link checker
Paste a link before you open it. Shield checks the URL against bundled threat host lists and simple heuristics in your browser. A miss is not a promise that a page is safe.

### Message and SMS scam checker
Paste a message. Shield extracts links and checks them the same way, without reading your inbox.

### QR code safety check
Decode a QR image locally, then decide whether to open the result.

### Ad and tracker blocking (extension)
Turn on tracker-domain blocking in the extension. This is not a full ad blocker; it targets tracker hosts from a bundled list.

### Link cleaner
Remove common tracking parameters from a URL. Signed, login, and payment links are left alone. The extension can clean navigations when you enable that toggle.

### Cookie-banner hiding (extension)
Optionally hide some cookie banners. Shield does not reject consent for you.

### Encrypted DNS setup
Follow device-specific steps for Android Private DNS, iPhone/iPad/Mac configuration profiles, Windows, and browser DNS-over-HTTPS. You choose a public resolver; Shield does not run a resolver for you.

### Location privacy controls (Chromium extension)
Block website geolocation in Chromium and add exceptions (for example Google Maps on www.google.com). Firefox does not expose the same setting. Phone app permissions stay manual.

### Secure Share
Encrypt or decrypt a message or file you enter here with a shared password. Cryptography runs locally with OpenPGP.js. Nothing is uploaded. Send the password through a separate trusted channel.

### Password generator and breach check
Create passwords or passphrases on the device. An optional range check sends only the first five characters of a SHA-1 hash to the public HIBP API.

### Connection Doctor
Explain browser-visible connection signals and optional public-IP or pricing lookups you choose to run. It cannot prove which SIM is active.

### Optional NXTL eSIM
Guidance and live rates for NXTL eSIM, an optional paid London-exit mobile connection. It does not unlock Shield and is not described as a privacy tunnel.

## Install

- **Web app:** open [https://nxtlsim.github.io/nxtl-shield/](https://nxtlsim.github.io/nxtl-shield/) and use Install / Add to Home Screen when your browser offers it.
- **Hugging Face Space:** [https://huggingface.co/spaces/nxtl-esim/nxtl-shield](https://huggingface.co/spaces/nxtl-esim/nxtl-shield)
- **Chromium extension:** download the zip from [GitHub Releases](https://github.com/nxtlsim/nxtl-shield/releases) and load it unpacked, or sideload the zip where your browser allows.
- **Firefox extension:** install the signed XPI from the release (unlisted on addons.mozilla.org).

## Platform support

| Surface | Status |
|---|---|
| Web app (desktop & mobile browsers) | Works |
| Installable PWA | Works where the browser supports it |
| Chromium extension (threats, trackers, cleaning, location) | Works |
| Firefox extension (threats, trackers, cleaning) | Works; location content setting unsupported |
| Encrypted DNS profiles / Private DNS | Needs your setup steps |
| Android native companion / call screening / antivirus | Not in this version |

Details: [docs/features.md](docs/features.md), [docs/support-matrix.md](docs/support-matrix.md).

## Privacy

Checks, Secure Share, and password generation run in your browser. Shield does not create an account. Optional lookups (breach range hash, public IP, NXTL pricing) only run when you choose them and are disclosed beside the action. See [docs/privacy.md](docs/privacy.md).

## FAQ

**Is NXTL Shield free?**  
Yes. The web tools and extension are free. NXTL eSIM is an optional paid product.

**Do I need an NXTL eSIM?**  
No.

**Does Shield collect my browsing history?**  
No. Extension settings stay in the browser. Bundled lists ship with the app.

**Does Secure Share upload my files?**  
No. Encryption and decryption stay on the device.

**Is this a network tunnel?**  
No. Shield does not choose an internet exit or run a tunnel. NXTL eSIM is a separate optional mobile connection.

**Will it stop every scam?**  
No. List misses and new sites happen. Treat results as guidance.

**Does location blocking work on Firefox?**  
Not via the extension content setting. Use browser or OS permission controls.

**Where do I report a problem?**  
[GitHub Issues](https://github.com/nxtlsim/nxtl-shield/issues).

## Open source

Licence: GPL-3.0-or-later. Third-party lists and libraries keep their own licences — see [docs/sources.md](docs/sources.md).

## Links

- Live web app: https://nxtlsim.github.io/nxtl-shield/
- Hugging Face Space: https://huggingface.co/spaces/nxtl-esim/nxtl-shield
- Firefox add-on (unlisted): https://addons.mozilla.org/en-US/firefox/addon/nxtl-shield/
- Source: https://github.com/nxtlsim/nxtl-shield
- NXTL eSIM: https://nxtlsim.com
