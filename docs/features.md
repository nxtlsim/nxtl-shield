# Features

Shield runs in your browser. A few protections need the extension or a setting you apply yourself.

| Feature | Status | What to know |
|---|---|---|
| Link check | Works in the browser | Local parsing and bundled lists. A miss is not a promise that a page is safe. |
| Message check | Works in the browser | You paste the text. Shield does not read your messages. |
| QR check | Works in the browser | Decoded locally. You choose whether to open the result. |
| File name and hash | Works in the browser | Not a malware scan. |
| Link cleaner | Works in the browser | Leaves signed, login, and payment links unchanged. |
| Password tools | Works in the browser | Generated on the device. Not stored. |
| Breached-password check | Works in the browser | Optional. Sends only the first five characters of a SHA-1 hash. |
| Secure Share | Works in the browser | Encrypts only what you enter here. Uses OpenPGP.js 6.3.2, AES-256-OCB, and Argon2. |
| Connection Doctor | Works in the browser | Browser signals and optional lookups. It cannot prove which SIM is active. |
| NXTL eSIM guidance | Works in the browser | Optional paid connection. Rates come from NXTL’s public pricing API. |
| Reports, theme, install | Works in the browser | History stays on the device and is redacted. |
| Encrypted DNS | Needs setup | You install a profile or change a setting. Shield does not run a resolver. |
| Browser threat blocking | Needs the extension | Turn it on in the extension. The manual checker uses the fuller list. |
| Tracker domains | Needs the extension | Off until you enable it. Not a full ad blocker. |
| Link cleaning in the browser | Needs the extension | Same conservative parameter list as the page. |
| Cookie-banner hiding | Needs the extension | Hides some banners. It does not reject consent. |
| Location blocking | Needs the extension on Chromium | Unsupported in Firefox. Phone app permissions are manual steps. |
| Android companion | Needs a native app | Not built. See [android-companion.md](android-companion.md). |
| Device-wide tunnel | Not in this version | Shield does not choose an exit or run a tunnel. |
| Malware content scan | Not in this version | No antivirus engine is included. |
| Call screening | Needs a native app | A website cannot screen calls. |
| Password vault | Not in this version | Shield does not store passwords. |
| Email breach monitoring | Unsupported | No email lookup is offered. |

The machine-readable list is [capability-manifest.json](capability-manifest.json).
