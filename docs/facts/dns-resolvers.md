# Encrypted public DNS resolvers + device setup (verified 2026-11-09; raw/dns/)

- Live verification:
  - `raw/dns/doh_test.py` sends RFC 8484 POST queries with curl and parses them with dnspython. Results: `raw/dns/doh_results.json`.
  - DoT: `openssl s_client -connect host:853` returned "Verify return code: 0 (ok)" for every DoT hostname listed below, including dns.nextdns.io.

## Resolver table
| Provider / profile | DoH URL | DoT / Android Private DNS host | IPv4 | IPv6 | Blocks | Live test 2026-11-09 |
|---|---|---|---|---|---|---|
| AdGuard Default | https://dns.adguard-dns.com/dns-query | dns.adguard-dns.com | 94.140.14.14, 94.140.15.15 | 2a10:50c0::ad1:ff, 2a10:50c0::ad2:ff | ads, trackers | doubleclick.net → 0.0.0.0 ✔ |
| AdGuard Family | https://family.adguard-dns.com/dns-query | family.adguard-dns.com | 94.140.14.15, 94.140.15.16 (confirmed on adguard-dns.io public page) | 2a10:50c0::bad1:ff, ::bad2:ff | + adult, Safe Search/Safe Mode | doubleclick → 0.0.0.0; nudity.testcategory.com NOT blocked (adult test domain is Cloudflare-specific) |
| AdGuard Unfiltered | https://unfiltered.adguard-dns.com/dns-query | unfiltered.adguard-dns.com | 94.140.14.140, 94.140.14.141 | 2a10:50c0::1:ff, ::2:ff | nothing | all resolve ✔ |
| Quad9 (secure) | https://dns.quad9.net/dns-query | dns.quad9.net | 9.9.9.9, 149.112.112.112 | 2620:fe::fe, 2620:fe::9 | malware/phishing + DNSSEC | isitblocked.org → NXDOMAIN ✔ (Quad9 block test) ; ads not blocked |
| Quad9 ECS / unsecured | dns11.quad9.net / dns10.quad9.net | | 9.9.9.11 / 9.9.9.10 | | ECS+malware / none | not tested |
| Cloudflare Families malware | https://security.cloudflare-dns.com/dns-query | security.cloudflare-dns.com | 1.1.1.2, 1.0.0.2 | 2606:4700:4700::1112, ::1002 | malware | malware.testcategory.com → 0.0.0.0 ✔ |
| Cloudflare Families malware+adult | https://family.cloudflare-dns.com/dns-query | family.cloudflare-dns.com | 1.1.1.3, 1.0.0.3 | 2606:4700:4700::1113, ::1003 | + adult | malware & nudity.testcategory.com → 0.0.0.0 ✔ |
| Mullvad (dns/adblock/base/extended/family/all) | https://{dns,adblock,base,extended,family,all}.dns.mullvad.net/dns-query | same hostnames | 194.242.2.2/.3/.4/.5/.6/.9 | 2a07:e340::2/3/4/5/6/9 | none / ads+trackers / +malware / +adult / +gambling / +social | adblock & base: doubleclick.net → NXDOMAIN ✔; malware.testcategory.com not blocked |
| ControlD free | https://freedns.controld.com/{p0,p1,p2,p3,family,uncensored} | {id}.freedns.controld.com | 76.76.2.0–.5, 76.76.10.0–.5 | 2606:1a40::N | p0 none, p1 malware, p2 ads/tracking+malware, p3 +social, family, uncensored | p2: doubleclick → 0.0.0.0 ✔; p1: test domains not blocked |
| NextDNS | https://dns.nextdns.io/{config-id} (needs account config) | {id}.dns.nextdns.io | per-config | | user-configured | DoT TLS ok; filtering not tested (no account) |
| DNS0.eu | — | — | — | — | — | **Discontinued Oct 2025** (BleepingComputer 2025-10-20, Techzine); DoH from box: malformed/empty reply. DO NOT USE |

Notes:
- `malware.testcategory.com` and `nudity.testcategory.com` are Cloudflare's test domains (https://developers.cloudflare.com/1.1.1.1/setup/#1111-for-families). They are not a universal test. Use each resolver's own check page.
- Quad9 uses `isitblocked.org`. AdGuard and Mullvad: use a known ad domain such as doubleclick.net.

## Privacy / jurisdiction / terms for being recommended by a third-party free app
| Provider | Privacy policy | Logging (per policy) | Jurisdiction | Third-party recommendation/bundling terms |
|---|---|---|---|---|
| AdGuard DNS | https://adguard-dns.io/en/privacy.html | anonymous 24 h domain stats | ADGUARD SOFTWARE LIMITED, Limassol, Cyprus; EULA under Cyprus law | EULA (https://adguard-dns.io/en/eula.html) says the public DNS server component is dual-licensed: commercial or AGPLv3. It has no explicit clause on apps recommending the public resolver, so recommending it is UNVERIFIED and you should ask AdGuard. Shipping AdGuard *software* would follow AGPLv3. |
| Quad9 | https://quad9.net/privacy/policy/ | no IP logging (policy) | Swiss foundation Quad9, c/o SWITCH, Werdstrasse 2, 8004 Zürich; FDPIC | No clause found. UNVERIFIED. The policy text itself is CC BY-NC-SA (that covers the document, not the service). |
| Cloudflare 1.1.1.1 / Families | https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/ | truncated IP deleted within 25 h; logs within 25 h; APNIC research; audited | Cloudflare, Inc. (US) | No clause found. UNVERIFIED. |
| Mullvad DNS | https://mullvad.net/en/help/privacy-policy | (policy fetched; see raw/dns/mullvad-privacy.txt) | Mullvad VPN AB, Gothenburg, Sweden | No clause found. UNVERIFIED. DoH/DoT only (ports 443/853); plain DNS is not offered. |
| ControlD free | https://controld.com/privacy | free DNS "no logs" per docs (docs.controld.com/docs/free-dns, updated 2026-08-17); blocklists refresh every 30 min | Toronto, Canada | No clause found. UNVERIFIED. |
| NextDNS | https://nextdns.io/privacy | no data logged unless the user enables it | NextDNS Inc. (US) | Terms page text unreadable (JS-rendered, 147 bytes). UNVERIFIED. Free tier is 300,000 queries/month, then filtering stops (resolver keeps working). Pro €1.99/month (https://nextdns.io/pricing). Needs a per-user account, so it is not a turnkey default. |

- Recommended defaults for Shield (opt-in, user-applied):
  - **AdGuard Default** (ads, trackers) or **Mullvad base** (ads, trackers, malware).
  - **Quad9** or **Cloudflare 1.1.1.2** (malware only).
  - **Cloudflare 1.1.1.3** or **AdGuard Family** (family).
  - Ads plus malware in one profile: Mullvad base or ControlD p2.

## Verification endpoints (HTTP 200 on 2026-11-09)
- Quad9: https://on.quad9.net/. The title says "Yes/No, you are (NOT) using quad9". The box got "No, you are NOT using quad9", as expected.
- Cloudflare: https://1.1.1.1/help (shows DoH/DoT in use).
- Mullvad: https://mullvad.net/en/check
- AdGuard: https://adguard.com/en/test.html
- NextDNS: https://test.nextdns.io/ (returned 200 with an empty body to curl; the JSON status format is UNVERIFIED).
- ControlD: https://controld.com/check returned 404. The correct verify URL is UNVERIFIED.
- A web page cannot read the device's DNS setting. Shield can only call these check pages, or run a DoH query itself, which does not test the OS resolver.

## Apple .mobileconfig (com.apple.dnsSettings.managed)
- Source: https://developer.apple.com/documentation/devicemanagement/dnssettings, JSON copies in raw/dns/apple-dnssettings*.json.
- Payload type `com.apple.dnsSettings.managed`.
- "When installed from an MDM, the setting only applies to managed Wi-Fi networks. When installed manually, this setting also applies to cellular networks."
- Top-level keys:
  - `DNSSettings` (required dict)
  - `OnDemandRules` (optional)
  - `ProhibitDisablement` (supervised only)
- `DNSSettings` keys:
  - `DNSProtocol` (required: `HTTPS` or `TLS`)
  - `ServerURL` (DoH, https:// template, RFC 8484)
  - `ServerName` (DoT hostname, RFC 7858)
  - `ServerAddresses` (optional IP list; if absent, resolved from the host)
  - `SupplementalMatchDomains`
  - `PayloadCertificateUUID` (iOS 16+ / macOS 13+)
  - `AllowFailover` (iOS/macOS 26+)
- Introduced iOS 14 / macOS 11.
- **Deprecated at iOS/iPadOS/macOS/visionOS 27.0**. Apple says: "Use the declarative management `com.apple.configuration.network.dns-settings` configuration."
  - Whether manually installed (non-MDM) profiles still work on iOS 27 / macOS 27: **UNVERIFIED** (no device test).
  - Whether the declarative replacement can be applied without MDM enrolment: **UNVERIFIED**.
- Signed vs unsigned:
  - Unsigned profiles install, but show "Not Signed / Unverified" in the install sheet.
  - Signing uses a CMS (S/MIME) signature with a code-signing or SSL certificate, for example `openssl smime -sign -signer cert.pem -inkey key.pem -certfile chain.pem -nodetach -outform der`.
  - Both points are standard practice, but no Apple page for them was fetched this run: UNVERIFIED wording. **Never put a private key in the repo.**
- iPhone install/remove (https://support.apple.com/guide/iphone/install-or-remove-configuration-profiles-iph6c493b19/ios; version picker shows iOS 27):
  - Install: download from Safari; you are asked for permission to install the profile.
  - View and remove: "Settings > General > VPN & Device Management".
  - "If you delete a profile, all of the settings, apps, and data associated with the profile are also deleted."
  - The intermediate "Profile Downloaded" step wording: UNVERIFIED on iOS 27.
- After install on iOS, the DNS entry appears under Settings > General > VPN & Device Management > DNS. The exact label on iOS 27 is UNVERIFIED.
- macOS: System Settings → Privacy & Security → Profiles (or General → Device Management on newer macOS). Apple guide fetched (raw/dns/apple-profile-mac.*) but the exact macOS 27 path is UNVERIFIED in the extracted text.
- AdGuard offers ready .mobileconfig downloads and a profile constructor on https://adguard-dns.io/en/public-dns.html. Linking there avoids self-signing.

## Android Private DNS (Android 9+)
- Path (from AdGuard's public DNS page): Settings → Network & Internet (or Wi-Fi & Internet) → Advanced → Private DNS → "Private DNS provider hostname" → enter the DoT hostname, for example `dns.adguard-dns.com`.
- Hostname only: no https://, no IP.
- OEM menus differ. Samsung: Settings → Connections → More connection settings → Private DNS. The Samsung path is UNVERIFIED this run.
- Verify with the provider check page above, or open a blocked test domain (for example doubleclick.net for ad-blocking profiles).
- Private DNS is overridden while a VPN supplies its own DNS. That behaviour is UNVERIFIED this run, but implied by the VpnService DNS settings.

## Windows 11 DoH
- Only the Windows **Server** doc was fetched: https://learn.microsoft.com/en-us/windows-server/networking/dns/doh-client-support. The support.microsoft.com Windows 11 article URL tried returned 404, so the exact Windows 11 UI label is UNVERIFIED.
- Mechanism (Server 2022+; Windows 11 is believed to share it):
  - Settings → Network & Internet → [Ethernet/Wi-Fi] → DNS server assignment → Edit → Manual.
  - Enter the Preferred/Alternate DNS. If the IP is in the *known DoH servers* list, the "Preferred DNS encryption" dropdown appears with "Encrypted only (DNS over HTTPS)" and other options.
- Known list by default: Cloudflare 1.1.1.1/1.0.0.1, Google 8.8.8.8/8.8.4.4, Quad9 9.9.9.9/149.112.112.112 (plus IPv6). Check it with `Get-DnsClientDohServerAddress`.
- Add others (AdGuard, Mullvad, Cloudflare 1.1.1.2): `Add-DnsClientDohServerAddress -ServerAddress '<ip>' -DohTemplate '<url>' -AllowFallbackToUdp $False -AutoUpgrade $True` (admin PowerShell).

## Chrome "Use secure DNS"
- Source: https://support.google.com/chrome/answer/10468685
- Path: ⋮ → Settings → Privacy and security → Security → under "Advanced" turn **Use secure DNS** on → choose a provider, or a custom provider URL (for example https://dns.adguard-dns.com/dns-query).
- ChromeOS: "Manage secure DNS in ChromeOS settings" → "Use secure connections to look up sites".

## Firefox DoH
- SUMO article blocked by a JS challenge (UNVERIFIED UI path).
- Mozilla wiki (https://wiki.mozilla.org/Trusted_Recursive_Resolver):
  - Use the UI in Network Settings / about:preferences, not about:config.
  - `network.trr.mode`: 0 off, 2 first (fallback), 3 only.
  - `network.trr.uri` is the DoH URL.
  - Support was added in Firefox 62.
- Current Firefox UI (Settings → Privacy & Security → DNS over HTTPS → Increased/Max Protection → Custom provider): UNVERIFIED this run.

## Self-hosted AdGuard Home on GCP free tier vs public resolver
- Source: https://cloud.google.com/free/docs/free-cloud-features
- Free tier allowance:
  - "1 non-preemptible e2-micro VM instance per month" in **us-west1 (Oregon), us-central1 (Iowa) or us-east1 (South Carolina)** only.
  - 30 GB-months standard persistent disk.
  - "**1 GB of outbound data transfer from North America** to all region destinations (excluding China and Australia) per month".
  - The limit is by hours, not instances.
- Sign-up "must provide a credit card or other payment method". That conflicts with "do not purchase" and needs the owner's decision.
- External IPv4 address charges and e2-micro RAM (1 GB): not re-verified this run. UNVERIFIED.
- Viability:
  - 1 GB/month egress is about 4–10 million DoH responses at roughly 100–250 bytes each (estimate, UNVERIFIED).
  - A US-only location adds latency for EU and travelling users.
  - It is a single point of failure with no SLA, and NXTL would become the DNS log controller (GDPR duties).
  - **Recommendation: use the public resolvers above (opt-in) for v1. Treat self-hosting as a later, owner-approved option.**
