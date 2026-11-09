# Sources and licences

Shield is GPL-3.0-or-later. Bundled lists keep their own notices.

| Source | Retrieved | Licence | Role |
|---|---|---|---|
| uBlock Origin uAssets badware | 2026-11-09 | GPL-3.0 | Host snapshot for the link checker and the extension |
| HaGeZi Threat Intelligence Feeds mini | 2026-11-09 | GPL-3.0 | Host snapshot. Aggregated inputs have their own terms; those individual terms were not re-checked one by one. |
| EasyPrivacy (host anchors whose names look like trackers) | 2026-11-09 | GPL-3.0-or-later and CC BY-SA 3.0 | Optional extension rules. Attribution: The EasyList authors (https://easylist.to/). |
| ClearURLs rules | 2026-11-09 | LGPL-3.0-or-later | Scoped tracking-parameter rules. Path rewriting is not applied. |
| Public Suffix List, via tldts 7.4.19 | PSL version dated 2026-11-08 | MPL-2.0 | Host parsing |
| OpenPGP.js 6.3.2 | 2026-11-09 | LGPL-3.0-or-later | Secure Share. https://github.com/openpgpjs/openpgpjs |
| @zxcvbn-ts/core 4.2.0 | | MIT | Password strength estimate |
| @scure/bip39 2.4.0 | | MIT | Passphrase word list. Not a wallet seed. |
| @zxing/library 0.23.0 | | Apache-2.0 | QR decoding |
| Pwned Passwords range API | 2026-11-09 | No attribution required for this API | Optional prefix check. https://haveibeenpwned.com/API/v3 |

OpenPhish, URLhaus, and PhishTank are not included. OpenPhish’s community terms restrict organisational use. URLhaus needs an API key. PhishTank’s redistribution terms were not verified.

These feeds are not used: email-breach APIs, session-cookie feeds, and phone-number reputation lists.

Argon2 in OpenPGP.js is loaded as WebAssembly, which is why the page content-security policy allows `wasm-unsafe-eval`.

Fonts are Plus Jakarta Sans, Inter, and JetBrains Mono from Fontsource, under the SIL Open Font License.
