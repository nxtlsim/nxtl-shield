# NXTL official facts (verified)
All accessed 2026-11-09 (box time, Europe/Kiev). Raw copies: `raw/<name>.html|.txt|.json`. All URLs returned HTTP 200.

## Routing / privacy — https://nxtlsim.com/global-routing/ (raw/global-routing.*)
- Quote: "The current service uses London as its internet exit—without a separate routing app or a location menu".
- Data path: device → partner mobile network → London internet exit → apps and websites. "There is no separate routing profile to install."
- "London is the internet exit, not the limit of where you can use NXTL."
- "NXTL's routing infrastructure is not a personal VPN or a promise of anonymous browsing. Keep using the security tools you need, including an employer-required VPN. Website encryption, device permissions and the services you sign in to still matter."
- FAQ answers:
  - There is no other exit location and no customer location picker.
  - Switching Cheapest to Best coverage changes the network preference, not the exit city.
  - Websites may estimate location from the IP address. Permitted device location and account settings also matter.
  - NXTL does not guarantee which country is displayed, or access to location-restricted content.
  - NXTL does not guarantee faster speed.
- Allowed Shield copy: "NXTL routes mobile data via a London internet exit; it is not a VPN or anonymity tool."
- FORBIDDEN copy: "VPN", "anonymous", "hides your location", "no-logs", "encrypts your traffic".

## Privacy policy — https://nxtlsim.com/privacy-policy/ (last updated June 2026; raw/privacy-policy.*)
- Controller: NXTL, MB, company code 306225619, Perkūnkiemio g. 13-91, LT-12114 Vilnius, Lithuania. GDPR applies.
- Data collected includes ICCID, usage records, country/network context, IP, user agent and Expo push token. The site uses Cloudflare Turnstile.
- The only encryption statement is "encryption in transit where supported", and it applies to protecting personal data.
- NO statement on traffic logging, no-logs, or encryption of routed traffic. Do not imply any of these.

## Product — https://nxtlsim.com/ai-info/ , /product/global-esim/ , /ai/*.json
- Reusable pay-as-you-go data eSIM: 180+ countries, 460+ networks, data-only.
- No monthly subscription. Unused standard prepaid balance never expires.
- Internet exit: "Automatic London routing · no location picker".
- Requires an eSIM-compatible, carrier-unlocked device. Region, model number, carrier firmware and WWAN configuration can change the answer.
- AI citation formula: Destination + network/preference + amount per GB + currency + updated date + source URL.
- Air and maritime coverage is conditional. Never describe it as satellite-to-phone.
- https://nxtlsim.com/ai/nxtl-product.json (updated 2026-10-15T20:20:02Z):
  - starter_price_usd 11.99, included_credit_usd 10, model pay_as_you_go
  - Currency notes: "starter: USD catalog price; visitor currency at checkout"; "usage_rates: EUR per GB"
- https://nxtlsim.com/ai/coverage.json (2026-10-14T13:11:27Z):
  - country_count 182
  - Entries: iso2, name, networks[{operator, eur_per_gb, lte, nr5g}]
  - Plus 2 onboard entries
- https://nxtlsim.com/ai/pricing.json: currency EUR, unit per_gb, countries[].cheapest_eur_per_gb and range_eur_per_gb{min,max}.
- Site showed €10.74 total / €8.96 balance for the box's visitor currency. Prices are visitor-currency dependent, so do not hard-code them.

## Canonical links (from /ai-info/)
- Main pages:
  - product: /product/global-esim/
  - pricing: /pricing/
  - coverage: /esim-coverage/
  - destinations: /esim-destinations/
  - compatibility: /esim-compatible-devices/
  - setup: /esim-setup/
  - guarantee: /connectivity-guarantee/
  - contact: /contact-us/
  - compare: /compare/
  - business: /for-business/
  - account: /my-account/
- Network pages: /network-preference/ and /manual-network-selection/
- FAQ, usage limits: /faq/#faq-usage-limits
- Apps:
  - iOS: https://apps.apple.com/app/id6796002935
  - Android: https://play.google.com/store/apps/details?id=com.nxtlsim.mobile
- Feeds: /ai/destinations.json, /ai/comparisons.json, /ai/reviews.json. Index: /llms.txt and /.well-known/llms.txt
- API reference: /nxtl-api-reference/ is authenticated B2B. Do not use it.

## Setup — https://nxtlsim.com/esim-setup/
- Connection checklist:
  1. Turn the NXTL line on.
  2. Select NXTL for mobile data.
  3. Enable Data Roaming for the NXTL line.
  4. Check the balance.
  5. Turn Wi-Fi off briefly and open a page.
- APN values: "internet", "plus". Change only the NXTL line's APN.
- Disable automatic data switching.
- iOS: Settings → Cellular / Mobile Data → choose NXTL for data → open the NXTL line → Data Roaming.
- iOS 17.4+: touch and hold a QR code → Add eSIM.
- Samsung: Settings → Connections → SIM manager.
- Pixel: Network & internet → SIMs.
- Windows: Settings → Network & internet → Cellular → eSIM profiles.
- The page states: "This guide cannot read your device settings or verify network service." Shield must say the same.
- The eSIM is opened via the NXTL app or My Account; the QR code is also emailed.

## Compatibility — https://nxtlsim.com/esim-compatible-devices/
- 407 devices, reviewed 2026-09-09. The page uses compat-evaluator.js, compatible-devices-data.js and compatible-devices.js (/wp-content/themes/nxtl/assets/js/).
- iPhone carrier lock check: Settings → General → About → Carrier Lock = "No SIM restrictions".
- Reusable dataset: github nxtlsim/esim-compatibility-check `docs/devices.json` (MIT, commit a6a98d9, 2026-11-01).
  - Structure: {reviewed, source, devices[], codes_sources}; each device has fields b,m,c,s,n,a,x,src,k,r.
  - Statuses: supported / depends on configuration / region / cellular version needed / adapter / no eSIM.

## CORS (tested 2026-11-09 with curl -H Origin)
- `/ai/*.json` sends NO Access-Control-Allow-Origin. It cannot be fetched cross-origin from github.io or hf.space, so use a build-time snapshot that keeps the `updated` value.
- `https://nxtlsim.com/wp-json/nxtl-app/v1/pricing/countries` reflects any Origin, with credentials true. It returns per-country min/max EUR. It is used by trip-data-budget.
- `/wp-json/nxtl-app/v1/geo/country` returns 200.

## Existing NXTL tools (link, don't duplicate). All MIT, "Copyright (c) 2026 NXTL eSIM". All live URLs returned 200.
| Tool | Live | Notes |
|---|---|---|
| esim-compatibility-check | https://nxtlsim.github.io/esim-compatibility-check/ | devices.json reusable |
| trip-data-budget | https://nxtlsim.github.io/trip-data-budget/ | pricing endpoint + rates.json fallback |
| team-data-planner | https://nxtlsim.github.io/team-data-planner/ | |
| travel-connection-check | https://nxtlsim.github.io/travel-connection-check/ | latency/jitter/loss/speed PWA: use as the Connection Doctor link |
- PWA pattern used by these tools: `docs/` with index.html, manifest.json (id "./", display standalone) and sw.js.
