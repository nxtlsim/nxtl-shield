# Threat/filter/library source registry (verified 2026-11-09)

- Licences come from the GitHub API `license.spdx_id` unless another source is noted. Raw files are in raw/sources/.
- "Recommend" is a decision for the NXTL free, branded, hosted distribution. A source's licence does not settle the terms of the inputs it aggregates.

## Filter / blocklists
| Source | Exact artifact URL | Licence / terms | Commercial / redistrib. | Attribution | Size / cadence (2026-11-09) | Key? | Recommend |
|---|---|---|---|---|---|---|---|
| AdGuard DNS filter | https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt | GPL-3.0 (repo AdguardTeam/AdGuardSDNSFilter) | Yes, under GPL; publish source/notices | keep header | 4.6 MB, 189,803 lines, modified 2026-11-09T14:10Z | No | ENABLE (DNS / DNR) |
| AdGuard Tracking Param filter | https://filters.adtidy.org/extension/ublock/filters/17.txt | GPL-3.0 (AdguardFilters) | Yes under GPL | header | 183 KB, expires 5 d | No | ENABLE (URL cleaner) |
| HaGeZi Pro mini | https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.mini.txt | GPL-3.0; FAQ says inputs carry own terms | GPL; inputs vary | header | 2.4 MB, ~100k; GitHub daily | No | ENABLE |
| HaGeZi TIF mini | .../adblock/tif.mini.txt | GPL-3.0; TIF inputs incl. netapi, phishdestroy, cert.pl | inputs vary: UNVERIFIED per-input | header | 3.9 MB, 187,113; expires 8 h | No | ENABLE (phishing/malware) with input review |
| HaGeZi Light | .../adblock/light.txt | GPL-3.0 | | | 2.2 MB | No | optional |
| EasyList | https://easylist.to/easylist/easylist.txt | dual GPLv3+ / CC BY-SA 3.0+ (https://easylist.to/pages/licence.html) | Yes | "The EasyList authors (https://easylist.to/)" | 2.0 MB, expires 4 d | No | ENABLE (extension) |
| EasyPrivacy | https://easylist.to/easylist/easyprivacy.txt | same | Yes | same | 1.5 MB, expires 4 d | No | ENABLE |
| EasyList Cookie List (Fanboy) | https://secure.fanboy.co.nz/fanboy-cookiemonster.txt | header says CC BY 3.0 | Yes w/ attribution | Fanboy | | No | OPTIONAL, 906 KB (hiding ≠ rejecting consent) |
| uBlock uAssets badware | https://ublockorigin.github.io/uAssets/filters/badware.txt | GPL-3.0 | Yes | | 274 KB, 5 d | No | ENABLE |
| uBlock uAssets privacy | .../filters/privacy.txt | GPL-3.0 | Yes | | 186 KB, 7 d | No | ENABLE |
| ClearURLs rules | https://rules2.clearurls.xyz/data.minify.json | LGPL-3.0 (ClearURLs/Rules, push 2026-11-03) | Yes | | 37 KB | No | ENABLE (URL cleaner) |
| Phishing.Database ACTIVE | Phishing-Database/Phishing.Database | MIT (repo); source repo has no licence | | | 11 MB; last version V.2026-10-02 (stale) | No | DO NOT DEFAULT (stale, size) |
| OpenPhish community | https://openphish.com/feed.txt | https://openphish.com/terms.html: personal use only, no commercial/organisational use, no redistribution without written consent | NO | | 300 lines | No | DISABLE |
| URLhaus | https://urlhaus.abuse.ch/api/ | Auth-Key required; commercial use may need paid subscription | Conditional | | | Yes | DISABLE |
| PhishTank | https://phishtank.org/ (FAQ) | FAQ: commercial use "OK"; free registration and app key; a few downloads per day without key | redistribution UNVERIFIED (terms page HTTP 500) | | | Yes | DISABLE until terms verified |
| Public Suffix List | https://publicsuffix.org/list/public_suffix_list.dat | MPL-2.0 | Yes | | 339 KB, VERSION 2026-11-08 | No | ENABLE (bundle snapshot) |

## Libraries
| Library | Version (npm/GitHub) | Licence | Note |
|---|---|---|---|
| @zxcvbn-ts/core | 4.2.0 (2026-08-12) | MIT | use instead of zxcvbn (last push 2024) |
| jsQR | 1.4.0 (2021) | Apache-2.0 | unmaintained but works |
| @zxing/library | 0.23.0 (2026-04) | Apache-2.0 | preferred QR decoder |
| html5-qrcode | | Apache-2.0 | |
| tldts | 7.4.19 | MIT | PSL parsing |
| punycode | | MIT | IDN |
| uBlock Origin / uBOL-home | | GPL-3.0 | reference / integration |
| AdGuard Home | | GPL-3.0 | self-host resolver |
| ClamAV | 1.5.4 and 1.4.6 (published 2026-08-07, multiple CVE fixes); 1.4 = LTS (3 y support + 1 y signature access) | GPL-2.0 | Docker min 3 GiB / preferred 4 GiB RAM; ~1.2 GiB load, ~2.4 GiB on reload (ConcurrentDatabaseReload no reduces). Signatures via freshclam/cvdupdate; cloud hosts likely rate-limited |

## HIBP Pwned Passwords
- Endpoint: `GET https://api.pwnedpasswords.com/range/{first 5 SHA-1 hex}`. Free, no key.
- "no licencing or attribution requirements on the Pwned Passwords API".
- CORS returns `access-control-allow-origin: *`.
- Send the `Add-Padding: true` header, which pads responses to 800–1000 results. A user-agent is required.
- Responses carry `cache-control: no-store`.
- Live test: HTTP 200 on 2026-11-09.
- The breach and paste APIs are NOT free: they need a paid key and are CC BY 4.0. Shield must not offer email breach monitoring.

## Update policy hints
- AdGuard/EasyList `! Expires` headers: 4–5 d. HaGeZi TIF: 8 h.
- HaGeZi GitHub publishes once per day; the hagezi-mirror.dnsbunker.org build mirror publishes every 4–8 h.
- Use ETag/Last-Modified conditional GETs, size caps (for example ≤15 MB per list), and last-known-good rollback.
