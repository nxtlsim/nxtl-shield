# NXTL Shield — feature map and Grok implementation prompt
Prepared for Mantas Dagys • 9 November 2026 • Final revision incorporating mobile/desktop support, installation, privacy controls and NXTL eSIM integration

## Product decision

Build NXTL Shield: an entirely free, open-source security suite with a mobile and desktop web dashboard, optional browser/native protection, straightforward installation, clear on/off controls and a useful integrated NXTL eSIM connection option.

The objective is broad functional coverage of NordVPN's publicly documented feature families. This is an engineering roadmap, not a claim of equivalent protection, detection rates, independent audits, server coverage or operating cost. NordVPN itself separates desktop next-generation antivirus from mobile DNS protection.

The dashboard can be one website. System-wide protection needs installation/configuration outside that website. Software can be free to use while bandwidth, hosting, storage, signing and operations have costs. The default distribution must work without a paid API or a purchased subscription; self-hosting may require the user's own hardware.

There is already an NXTL trip planner. Do not build another one.

NXTL eSIM integration must explain its actual privacy benefits. The current published service routes internet traffic through London. An exit IP associated with that gateway can limit what a website infers about a traveller's physical location from IP alone. Using NXTL mobile data also avoids depending on a public Wi-Fi network. Neither this routing nor a consumer VPN prevents identification through signed-in accounts, cookies or permitted device location. Present those limitations consistently for both. NXTL eSIM is a separately charged optional connectivity service; every Shield feature remains available without buying it.

Add Location Privacy with user-selected navigation exceptions, widest verified device support, per-component on/off controls and a persistent Install / Add to Home Screen action. On unsupported surfaces, offer accurate setup instructions and capability status.

## Feature map

Candidate integrations below require fresh maintenance, security, licence and terms verification before inclusion. “Web” means an actual manual browser tool; it does not imply continuous protection of other websites or apps.

| # | Feature family / detail to audit | Free/open implementation direction | Required surface and parity limit |
|---|---|---|---|
| 1 | Encrypted VPN tunnel and public-IP masking | WireGuard; OpenVPN where appropriate | Native client plus an actual gateway; web dashboard configures it |
| 2 | Country/server selection and global locations | Operator- or user-owned gateways | Each location needs working servers, bandwidth and operations |
| 3 | Fast connection / automatic server selection | Gateway health, latency and capacity selection | Measure actual deployed endpoints; no invented global map |
| 4 | NordLynx, OpenVPN and IKEv2 options | WireGuard, OpenVPN, strongSwan after review | Alternatives to functions; NordLynx-specific implementation is not reproduced |
| 5 | NordWhisper and obfuscated servers | Evaluate maintained AmneziaWG / other reviewed transports | Native integration; no claim of identical censorship resistance |
| 6 | Kill switch / fail-closed behavior | OS firewall and native VPN lockdown | Real packet-loss/tunnel-failure testing on each supported OS |
| 7 | Auto-connect, reconnect, startup and network-change handling | Native client policies | Platform-specific; no PWA background guarantee |
| 8 | Split tunnelling, per-app routing and exclusions | Native OS/client routing | OS restrictions and DNS interactions must be tested |
| 9 | DNS leak protection and custom DNS | Resolver inside verified tunnel; explicit custom resolver options | Need actual gateway/DNS setup; a manual DoH query is not proof of system DNS |
| 10 | IPv4, IPv6 and WebRTC leak checks/protection | Dual-stack routing/firewall; browser-specific controls | Checks can be web-based; fixes need native client/extension/configuration |
| 11 | Double VPN / multi-hop | Reviewed two-gateway routing | Needs two configured servers and egress verification |
| 12 | Onion Over VPN | Tor integration / Tor Browser guidance | Native Tor and gateway routing; different trust model |
| 13 | Post-quantum protection | Evaluate maintained audited PQ key-establishment integrations | Ordinary WireGuard alone is not equivalent; no custom cryptography |
| 14 | Dedicated IP | Static IP on user/operator-owned gateway | Address allocation has an infrastructure cost |
| 15 | Dedicated server and port forwarding | Self-hosted gateway, per-user isolation and explicit firewall rules | No public open proxy; ownership and resource limits required |
| 16 | SmartPlay / streaming convenience / smart DNS | Reviewed routing and DNS configuration | No guarantee of unblocking services or reproduction of proprietary system |
| 17 | Multiple devices | Per-device keys, enrolment, revocation, optional mesh | Each active device consumes resources; safe permissions and isolation |
| 18 | Windows/macOS/Linux/mobile/TV/router apps | Integrate maintained clients, with actual installation docs | Browser dashboard does not replace native clients on these platforms |
| 19 | Browser proxy extension | Reviewed browser proxy configuration and authenticated backend | Browser traffic only; proxy server must exist |
| 20 | Private encrypted DNS | AdGuard Home or another maintained open resolver | Self-host DoH/DoT or explicit opt-in third-party public DNS |
| 21 | Ad blocking | AdGuard DNS filter; reviewed EasyList-compatible extension rules | DNS blocks domains; extension handles browser requests and cosmetic rules |
| 22 | Tracker blocking | Reviewed tracker rules / EasyPrivacy-compatible filtering | No claim of defeating all fingerprinting or first-party tracking |
| 23 | Phishing and malicious-domain blocking | Licence-approved lists, e.g. reviewed HaGeZi/AdGuard sources | Coverage depends on source quality, update age and resolver/extension activation |
| 24 | Fake-shop and fraud warnings | Evidence-based URL/site checks plus licensed reputation data | Heuristics are limited and explained; no “certified safe” result |
| 25 | URL/link checker | Local parsing, exact URL/domain lookups, IDN and hostname analysis | Browser + API; no server-side visits to arbitrary destinations by default |
| 26 | Text/SMS scam checker | Paste/share text; extract URLs and explain local heuristic signals | Web works for supplied text; automatic SMS filtering requires native APIs |
| 27 | URL cleaner | Allowlisted tracking-parameter removal rules | Preserve signed URLs, authentication and payment functionality |
| 28 | Cookie banner hiding | Reviewed annoyance/cookie rules in a browser extension | Hiding is not rejecting consent; actual rejection needs separately verified behavior |
| 29 | Search-result safety indicators | Browser extension using approved local reputation engine | Per-browser/engine support; no invented badges |
| 30 | Email protection | Manual message/.eml analysis and link checks; optional mail-gateway integration | Automatic mailbox scanning requires a separate authorised integration |
| 31 | Download/file malware scanning | ClamAV with supported signatures and bounded file scanning | Browser-selected file via local/self-hosted scanner; not a mobile system scan |
| 32 | Double-extension and misleading-file warnings | Local filename/type checks alongside scanner | Suspicious formatting is not proof of malware |
| 33 | Automatic download interception | Extension/native companion where browser APIs permit | Actual download lifecycle interception must be verified |
| 34 | Quarantine, allow, delete and retention | Native/local scanner-managed quarantine | A remote web upload scanner cannot quarantine the original mobile file |
| 35 | Installed-app vulnerability scanning | Maintained OS inventory + matching against OSV/vendor/NVD data | Native inventory or user-supplied manifest; coverage is ecosystem-specific |
| 36 | Hijacked-session / stolen-cookie alerts | Only if a legitimate suitable data source is available | No equivalent free universal feed established; never collect/export session cookies |
| 37 | Crypto-wallet scam checks | Reviewed chain-specific licensed address reputation | Address validity is not scam detection; unsupported reputation returns unknown |
| 38 | Dark-web/email breach checks | Link to independent services; optional authorised provider adapter | Pwned Passwords does not provide email/dark-web monitoring |
| 39 | Dark Web Monitor Pro identifiers | Legitimate licensed phone/ID/card intelligence | No equivalent unrestricted free source established; do not collect IDs/cards for a demo |
| 40 | Breached-password checking | HIBP Pwned Passwords range API; local hashing and comparison | Five-character SHA-1 prefix only; this is a specific breach lookup protocol |
| 41 | Password generation and strength feedback | Web Crypto CSPRNG + maintained estimator | Local web tool; no password telemetry or backend submission |
| 42 | NordPass bundle/password vault | Integrate or guide toward KeePass-family/Bitwarden-compatible open tools after review | Full vault is a separate security-critical product; no home-made vault crypto |
| 43 | NordLocker bundle/encrypted files | Maintained Cryptomator / Nextcloud E2EE workflows after review | Client encryption and actual storage required; no free terabyte implied |
| 44 | Meshnet private device networking | Reviewed self-hosted NetBird or Headscale ecosystem | Native clients, coordination, relay and peer permissions |
| 45 | Meshnet file transfer / LAN / remote access / traffic routing | Reviewed mesh integrations, explicit sharing and routing permissions | Integrate real transports; browser control UI alone does not implement them |
| 46 | Scam-call alerts and call blocking | Android CallScreeningService / supported iOS extensions plus licensed number lists | Native app and permissions; caller identity may be spoofed |
| 47 | Automatic message protection | Native SMS/message filtering extensions where permitted | Country/OS/store constraints; web version checks supplied messages only |
| 48 | Protection activity, history, reports and alerts | Real local events, optional private notifications | Never fabricate blocked counts or infer device-wide protection from opening the page |
| 49 | Per-site allowlist, bypass and pause controls | Extension/DNS/native controls connected to the actual engine | Changes must apply to the correct installed component |
| 50 | No-logs/privacy promises | Data minimisation, redaction, short retention and published operational policy | Policy and audit work; open source alone is not evidence of a no-logs service |
| 51 | Account security / MFA / device revocation | Passkeys or maintained OIDC/MFA integration if accounts are needed | Core manual tools should work without registration |
| 52 | Favorites, notifications, language/theme/accessibility, settings import/export | First-party UI backed by working component APIs | Current Nord UI details need per-platform verification |
| 53 | Pause timers / trusted-network policies / local-network visibility | Native platform policies where supported | Audit current availability; these are not universal web-app capabilities |
| 54 | DNS/IP utilities and connection troubleshooting | Observed public IP, browser-visible checks, controlled DNS tests | Report uncertainty; full DNS leak diagnosis requires controlled authoritative infrastructure |
| 55 | Insurance / scam-loss recovery / identity restoration bundled by region | Educational recovery steps and official reporting links | An insurance contract and professional recovery service cannot be recreated in code |
| 56 | Data removal services offered in any current bundle | Request-generation and progress tracking where lawful | Sending a request is not proof of removal; verify current product/bundle scope |
| 57 | Independent audits, speed certifications and 24/7 human support | Publish evidence and community support boundaries | Cannot inherit another company's audits, certifications or staffing |

Rows include NordVPN core functions, smaller documented protection controls and separately labelled bundle/add-on functions. Some implementation details and regional bundle extras need a fresh official-source audit. This is not a statement that every row is present in every NordVPN subscription or OS.

## NXTL-specific additions

| Addition | Required behavior |
|---|---|
| NXTL eSIM inside Shield | Contextual mobile-data alternative to public Wi-Fi, exact compatibility/coverage checks, supported setup and London exit/privacy explanation |
| Location Privacy | Browser location blocking where supported, user-approved map-site exceptions, mobile OS permission guidance and native controls only where permitted |
| All-device access | Responsive PWA on supported mobile/tablet/desktop browsers; verified optional extension/native/router integrations |
| Easy installation | Feature-detected native install prompt or accurate platform instructions, one accessible persistent entry point |
| Easy control | Scope-labelled toggles connected to actual engines; configured/active/unknown status; temporary pause, exceptions and reversal |
| Latest NXTL branding | Verify current official logo/assets; generate original supplementary artwork/icons where useful; do not regenerate the official wordmark |

## Full prompt for Grok Bot

You are my implementation agent. Build, verify and publish NXTL Shield: a high-quality free, open-source security suite associated with NXTL eSIM.

Treat this as real software delivery. Continue through research, implementation, appropriate testing, documentation and publication within available permissions. Do not stop after a plan, landing page, attractive mockup or list of future ideas. Work in coherent milestones when the full suite exceeds one session; preserve a machine-readable capability ledger so later work resumes accurately.

### 1. Product objective and existing work

We want useful alternatives to every publicly documented NordVPN feature family, using free/open-source components and permitted data sources wherever possible. Use public documentation to understand behavior and design an original NXTL implementation. Do not copy proprietary source, trademarks, illustrations, paid datasets or unlicensed branding. This is functional analysis, not a claim to reproduce proprietary engines.

NXTL already has a trip planner. Reuse/link existing work where useful and do not rebuild it. Connection Doctor remains relevant as the troubleshooting section.

Inspect the current NXTL website, available brand assets and related repositories before choosing design tokens or architecture. Keep the project separate from existing production systems. Do not alter eSIM billing, authentication or other live NXTL services.

The whole NXTL Shield application and its first-party functionality must be free and open-source. There is no paid edition, subscription, trial, paywall, purchase requirement, referral gate or paid-API prerequisite. Optional self-hosting is allowed. NXTL eSIM is a separately paid optional connectivity service, and no Shield protection is unlocked by buying it. Clearly separate free software from the operator/user's hardware, hosting, bandwidth, storage, app-signing and maintenance costs. Do not start paid services, purchases or new recurring bills.

Free distribution describes our product model. Verify each upstream code licence and data/service terms against the actual NXTL-branded free distribution, optional eSIM links, hosted use and redistribution. Do not automatically classify every use as non-commercial just because users pay nothing. Prefer dependencies that permit the intended use; if a source restricts organisational use or redistribution, choose a suitable alternative or keep its adapter disabled. Do not charge users to resolve a dependency gap.

### 2. Audit every feature before promising parity

Start from these official sources and follow their relevant current feature/setup links:
- https://nordvpn.com/features/
- https://support.nordvpn.com/hc/en-us/articles/19559429814545-What-features-does-NordVPN-have
- https://support.nordvpn.com/hc/en-us/articles/19508765521425-What-is-NordVPN-s-Next-gen-antivirus
- https://nordvpn.com/next-gen-antivirus/
- https://nordvpn.com/features/dark-web-monitor/
- https://nordvpn.com/features/call-and-message-protection/
- https://nordvpn.com/blog/nordvpn-bundle-explained/
- https://nordvpn.com/meshnet/
- https://nordvpn.com/scam-checker/

Use the 57-row map in this document as a seed, then discover missing details in current official documentation, OS-specific settings, release notes and plan/region pages. Record conflicts rather than guessing. Separate current, retired, uncertain, bundled and paid-add-on features.

Create docs/feature-parity.md and a structured capability manifest. For each capability record: source URL/access date; OS/region/plan; actual function; selected upstream/version/licence; data source and permissions; web/extension/native/server requirements; cost owner; implementation status; test evidence; limitations and next dependency.

Status must distinguish implemented-and-verified, implemented-but-not-device-verified, externally-integrated, manual-only, awaiting-access, unsupported-on-platform, unavailable-data-source and not-yet-implemented. Do not call a link to another product a completed replacement. Never collapse partial coverage into “full NordVPN parity.”

### 3. Architecture

Choose a maintainable stack after inspecting the environment. A reasonable default is a TypeScript responsive PWA, a shared deterministic checking engine, an extension package, and a small containerised backend for optional scanning and server-dependent tools. A Python/Gradio adapter is acceptable for Hugging Face and MCP. Prefer one shared implementation over duplicated logic.

Support:
A. Mobile/tablet/desktop web dashboard: manual URL/text/file checks, password tools, Connection Doctor, Location Privacy, NXTL eSIM connection guidance, honest capability status and setup.
B. Browser extension: real request/domain blocking, URL cleaning, supported cosmetic filtering and verified warning flows.
C. DNS: self-hosted AdGuard Home or another reviewed resolver, plus explicit opt-in setup for an existing suitable free public resolver. A website toggle cannot change device DNS automatically.
D. VPN/mesh: maintained native clients and real self-hosted/operator-provided endpoints. No cosmetic “connected” switch.
E. Native companions where essential: Android/iOS/iPadOS/desktop only through permitted OS APIs and actual build/test evidence. Treat a PWA wrapper as a web app unless an actual native module provides and verifies the additional function.

One dashboard may control several components. Each control must state its scope and require the corresponding component to be installed/configured. Detect status through direct evidence where possible; otherwise show “setup not verified.”

Do not depend on unofficial public VPN lists, anonymous open proxies or somebody else's demo gateway. Do not reimplement VPN protocols or cryptography. Ordinary WireGuard is not post-quantum VPN protection.

### 4. Build the web tools fully

Implement:
- URL checker with robust parsing, IDNs/punycode, credentials-in-URL, misleading subdomains, IP-literal hosts, suspicious encoding and licence-approved domain/URL reputation.
- Paste/share text and email checker extracting URLs and explaining concrete scam signals. Do not claim an email's authenticity from pasted text alone.
- QR/image decoding locally where practical, with permission; analyse the decoded URL/text before opening it. Image text/OCR can be optional, with download/runtime limits.
- Tracking-parameter cleaner with conservative rules, undo/diff and copy/export.
- Local password/passphrase generation using Web Crypto CSPRNG, a maintained strength estimator and optional Pwned Passwords range lookup. Never transmit the plaintext password or full hash. Do not store passwords in history.
- Selected-file inspection and local hashing; optional real ClamAV scanner with current signatures, engine/version details and clear limits. A hash lookup and an actual content scan must be labelled separately.
- Connection Doctor: platform/model confirmation, eSIM compatibility guidance, APN/data-roaming/network checks and user-supplied settings interpretation. Detect only what browser/native APIs genuinely expose. Use current NXTL instructions where relevant.
- Public-IP observation and appropriately limited connection diagnostics. An IP lookup cannot prove VPN, anonymity or absence of leaks.
- Local/exportable reports, reset/delete controls, source freshness and capability explanations.

Verdicts: known malicious match, suspicious indicators, no known match, inconclusive, unavailable or unsupported. Do not label an unknown/new domain “safe” or call a failed scan clean. Explain matched evidence, source, timestamp, checked scope and uncertainty. No arbitrary 100% protection meter.

No AI model is required for baseline checks. Optional user-selected/local AI can explain findings, but cannot override deterministic evidence or silently upload private material. Avoid paid inference as a dependency.

### 5. Real ad, tracker and malicious-site blocking

Evaluate maintained uBlock Origin/uBO Lite patterns and appropriate browser APIs. Integrate existing tools or write a compatible extension within licence obligations. Verify current browser support rather than assuming all mobile browsers accept extensions.

Candidate lists include AdGuard DNS filter, reviewed HaGeZi outputs, EasyList/EasyPrivacy and independently permitted sources. Verify syntax support, upstream terms and derivative obligations for the exact artifact consumed. Preserve source licences/notices and publish corresponding sources where required. Inspect aggregate lists' upstream permissions.

Implement enable/disable, per-site allowlist, temporary pause, clear warning page, supported optional cookie/annoyance controls and rollback. Do not claim DNS removes all ads, YouTube ads or same-domain ads. Cookie-banner hiding does not establish that consent was rejected.

On Android, local VPN-based filtering can conflict with another VPN because the OS permits one active VPN service per user/profile. Integrate routing/filtering within a compatible design or explain the conflict. On iOS, use the required signed native capabilities/content blockers or user-installed DNS configuration. Never require installation of a root CA or TLS interception to make this demo work.

### 6. Threat data, licences and updates

Create a source registry with publisher, exact URL, licence/terms URL, retrieval date, commercial-use permission, redistribution permission, attribution, refresh minimum, API-key requirement and failure behavior.

Important starting constraints:
- OpenPhish's current community terms restrict organisational/commercial use. Do not include without suitable written permission.
- URLhaus currently requires an Auth-Key, and commercial use may require a paid arrangement. Do not treat it as an unconditional free production dependency.
- Pwned Passwords has a free range API. This does not grant free email breach, stolen-cookie or identity-monitoring data.
- A free public service is not automatically open-source software or redistributable data.
- Repo-level licences do not automatically resolve every aggregated source's terms.

Prefer sources suitable for this free NXTL project without paid subscriptions. Disable unsuitable providers explicitly and continue with permitted ones. Do not scrape third-party dashboards or proxy paid APIs.

Updates need timeouts, backoff, conditional fetching, size/domain-count limits, validation, atomic replacement, last-known-good rollback, a stale indicator, source-specific expiry and safe failure handling. Never update from arbitrary user-supplied remote code. Do not execute or render feed content.

### 7. Malware protection and hard platform boundaries

Use maintained ClamAV for actual supported file-content scanning where appropriate. Verify current releases/signatures and distribution terms. Isolate the scanner as an unprivileged resource-limited process/container; prevent network egress during scans unless specifically needed and controlled; cap size, archive depth, decompression, CPU and time. Never execute uploaded files. Encrypted archives and unsupported formats must remain unscanned/inconclusive.

Mobile web scanning checks only files the user deliberately supplies. It cannot inspect the entire phone, installed apps or other apps' storage. iOS sandboxing prevents a general third-party antivirus from scanning other apps/system files. Android app/package/file inspection requires native APIs and permissions and is still bounded. Respect these limits in product names, copy, status and test results.

Automatic downloads, quarantine, malware deletion, installed-app inventory, call blocking and background message filtering need an actual suitable native/extension integration. Build and test those integrations when the environment permits; otherwise record the exact blocker in the capability ledger and keep all independent work moving. Never simulate them with a working-looking switch.

Hijacked-session monitoring, worldwide scam-number reputation, full ID/card dark-web monitoring and crypto scam-address intelligence require legitimate adequate datasets. If suitable unrestricted free sources cannot be established, expose no false protection. Provide limited separate manual tools if useful and mark the coverage gap. Do not collect browser cookies, session tokens, national IDs or card numbers.

For password vaults, encrypted storage, mesh routing, obfuscation and post-quantum tunnels, reuse maintained reviewed systems. An integration must have a working connection and documented trust boundary. No unsupported security-equivalence claims, guaranteed streaming, inherited certifications or free hosted storage capacity.

### 8. Security, privacy and abuse resistance

Default to local processing and no account. Never log complete submitted URLs with tokens, messages, file content, passwords, secrets or personal identifiers. Do not retain submitted content in analytics/crash reporting, service-worker caches or CDN caches. Make any optional uploads/third-party queries explicit before transmission.

Protect backend URL handling from SSRF, redirects into private networks, IPv4/IPv6 alternate encodings, link-local/cloud metadata, DNS rebinding, credential URLs and unsafe protocols. Prefer list lookups without fetching targets. If remote inspection is needed, isolate it with public-only egress enforcement and strict redirect/time/size limits; do not rely solely on a one-time DNS check.

Add input limits, rate limits, upload quotas, secure response headers/CSP, correct CORS, auth/CSRF protection on any configuration endpoint, least-privilege containers and temporary-file cleanup on success, failure and crashes. Render messages/reputation data as text. Do not put upstream credentials in the frontend, repo, downloadable configurations or logs.

Public MCP/API endpoints must not expose unauthenticated administrative controls, file retrieval, shell commands, arbitrary URL fetch or infrastructure credentials. Use narrowly scoped operations.

### 9. Connect users' AI assistants

Expose documented read-only API/MCP tools, such as:
- check_url
- check_text
- clean_url
- explain_connection_issue
- get_capabilities
- get_source_status
- get_platform_support
- get_location_privacy_setup
- get_esim_compatibility_guidance
- get_esim_coverage_and_rates using current public NXTL sources with currency/unit/time
- explain_nxtl_routing using verified current routing information
- lookup_file_hash, only where a permitted real hash provider exists.

Use schema-validated inputs and structured outputs with evidence, timestamp, status, uncertainty and scope. State whether input stays local, reaches NXTL or reaches a third party. Do not expose password entry/checking through MCP; keep it in the local browser tool. Do not claim an MCP server can scan an assistant user's device remotely.

Provide real configuration/setup examples for currently supported MCP clients, and test at least one available client end to end. If Hugging Face MCP discovery is used, follow current Gradio/HF guidance; merely deploying Docker does not automatically create an MCP badge. Preserve the deterministic core across web/API/MCP.

### 10. NXTL design and mobile quality

Find the newest official NXTL eSIM logos, wordmarks, icon variants, graphics and design tokens in the current website and authorised repositories/assets before designing. Verify current use and provenance; do not assume an older cached asset or an arbitrary file with a newer timestamp is authoritative. Match the current NXTL red accent, typography, surfaces and spacing. Record the chosen source assets in docs/brand-assets.md, with source paths/URLs and dates/commits where available. Preserve official logo geometry, spacing and light/dark versions; do not recreate the logo with AI, substitute a generic shield logo for NXTL or distort the wordmark.

Generate or draw original complementary icons, Shield illustrations, onboarding graphics and app/store-preview artwork if existing assets are insufficient. Use available image-generation tools for appropriate raster artwork and a consistent maintained SVG/icon system for interface icons. Verify usage rights, record attribution/licences as needed, optimise output and inspect at mobile sizes. Include favicon, appropriate PWA sizes and maskable icons without cropping the wordmark. Avoid false security seals, audit badges or certificates. Asset generation is authorised for this dedicated project; it does not authorise unrelated brand changes.

The home screen should answer: what can I check now, which protections are configured, what needs setup and when data was updated. Use a central “Check a link, message or file” flow, reachable navigation, concise results and real evidence details. Active protection status must derive from the relevant component.

Make it excellent at 320, 360, 390 and 430 px widths, plus tablet/desktop. Include keyboard support, visible focus, accessible contrast, reduced motion, screen-reader labels, loading/error/empty/offline states, touch-sized controls and a genuine installable PWA. Do not cache sensitive submissions. Cache only approved static assets and permitted list snapshots with version/expiry information.

Use “Free, open-source security tools by NXTL eSIM” and the contextual connectivity integration specified below. Keep Shield fully usable without a purchase. No forced registration, purchase, affiliate gate, ads, unrelated trip planner or invented data-saving/revenue claims.

### 11. NXTL eSIM integration and accurate privacy positioning

Make the eSIM connection option an integrated useful part of Shield, with appropriate placement on the dashboard and in Connection Doctor. Keep a consistent distinction between connectivity, traffic routing, content blocking and device permissions.

Verify the live product/routing/compatibility sources before copy or implementation:
- https://nxtlsim.com/ai-info/
- https://nxtlsim.com/global-routing/
- https://nxtlsim.com/ai/nxtl-product.json
- https://nxtlsim.com/ai/coverage.json
- https://nxtlsim.com/ai/pricing.json
Follow these sources' canonical links for compatibility, setup, product purchase and existing-account management.

Useful flows:
- “Using public Wi-Fi?” offers “Use NXTL mobile data” and a concise explanation of the local-network exposure avoided by leaving that Wi-Fi network. Do not claim the user's present Wi-Fi is malicious without evidence.
- “Already have NXTL?” offers supported setup, select-data-line/data-roaming instructions and existing-account links.
- Device/destination checks show exact model/region uncertainty, current coverage/rates and current purchase terms from verified sources. Reuse the existing planner rather than duplicating it.
- Explain London routing in the same flow: the local partner supplies access, then the connection uses NXTL's published London internet exit, without a separate routing app/location picker.
- Explain the privacy benefit precisely: services see the public exit IP. If their IP databases associate it with London/the UK, IP alone may reveal less about the traveller's present country or approximate location. IP-geolocation databases and app behavior vary. Do not guarantee a UK location display or access to restricted content.
- Present mobile data as an alternative to relying on public Wi-Fi and a possible answer for users whose only reason for considering a VPN was avoiding that network. Do not describe eSIM routing as a universal personal VPN replacement.
- Users needing an encrypted device-to-VPN-server tunnel, employer access, user-selected exit locations, kill-switch enforcement or a particular anonymity model should still use suitable tools. Additional NXTL encryption/privacy claims require actual verified architecture showing scope and endpoints.
- Explain fairly that cookies, signed-in accounts, allowed GPS/device-location access and app telemetry can identify/location-track users with either a VPN or NXTL. A VPN changes network routing and does not automatically disable those mechanisms. Neither changes what identity the user deliberately shares.
- Do not claim invisibility to NXTL/mobile operators, no logs, anonymous browsing, end-to-end encryption to websites, guaranteed bypass or a shared/dedicated IP allocation without independent evidence for that precise claim.

Example positioning to refine in the actual NXTL design:
“Skip public Wi-Fi. Connect with NXTL mobile data.”
“Your connection uses our London internet exit. This can limit what a website learns about your travel location from your IP address alone.”
“Shield checks links and helps control supported tracking/location permissions. NXTL provides the optional mobile connection.”

Observe a consented connection only to the extent technically possible. London-looking IP, browser connection-type hints, successful reachability and self-reported setup do not prove NXTL is active. Use verified native/authorised account signals if available, otherwise show “connection not verified.” Never display “VPN connected” from the eSIM route.

No embedded B2B API key, no unauthenticated access to balances/ICCID/profiles, no automatic purchase/installation/network switch, and no change to NXTL production authentication. Keep user/session secrets out of Shield. Changes on the user's device use explicit supported OS flows.

### 12. Location Privacy, tracking controls and map exceptions

Build a real “Location Privacy” section. Separate three things: website Location API permission, native-app location permission, and approximate location inferred from IP. Blocking one does not automatically block the others.

Default to minimum access: Shield itself does not require GPS just to provide protection/setup. No surprise geolocation prompt, location history or background tracking.

Browser extension:
- On browsers that genuinely support it, use the browser's permission/content-settings API to block location requests by default, with an explicit user control.
- Let users add/remove specific trusted website exceptions, including their chosen map/navigation sites. Offer user-approved “ask” exceptions where supported instead of silently granting access. Use exact verified origins; do not broadly exempt every domain named like a map.
- Explain that extension scope covers the supported browser, not every installed native app. Test setting precedence, current user settings, incognito handling, other-extension conflicts and rollback.
- Do not rely on a JavaScript geolocation wrapper/spoof to claim enforced blocking.

Android consumer devices:
- Use supported native settings intents and a useful step-by-step per-app permission review, with “Never,” “While using,” approximate/precise and background guidance where the OS supports these choices.
- A normal app cannot silently revoke all other apps' location permissions. Do not request rooting, ADB, accessibility click automation or device-owner enrolment as a normal consumer setup.
- Only implement direct bulk permission control in a clearly separate already-managed enterprise environment where the authorised device/profile owner APIs actually permit it. Do not enrol users into management to create a cosmetic one-button result.
- A global location-off switch can also disable navigation; it is not a per-app exception solution.

iPhone/iPad:
- Provide accurate current steps through Settings > Privacy & Security > Location Services and per-app choices.
- Use only supported public settings links; where no direct system-section link exists, show instructions rather than using private URL schemes.
- An ordinary app/PWA cannot change all other apps' permissions. Never show an applied global switch that merely stores a preference.

Exceptions:
- Users select the map/navigation apps/sites they actually trust; offer recognised providers as optional suggestions, not an automatic exemption for every maps app.
- Prefer “While using” and precise access only where needed. Explain background navigation/trip recording when users choose those functions.
- Native exceptions must be verified per installed app identity if accessible. A user's selected plan/checklist is not proof that OS permissions changed.
- Include ability to restore prior Shield-managed browser settings. Preserve unrelated settings.
- Do not say all location is hidden: emergency/system services, IP location, user-entered addresses and other signals may still apply. Document device/OS scope without alarming users or claiming every VPN solves it.
- Related camera/microphone/cookie controls may use the same permission-centre pattern only where genuinely supported and verified; do not silently expand permissions.

### 13. Widest verified device support, switches and easy installation

Deliver one responsive app usable on current supported Android phones/tablets, iPhone/iPad, Windows, macOS and Linux. Test the current stable browsers available for each family: Chrome/Chromium, Safari/WebKit, Firefox, Edge and Samsung Internet where accessible. Add other browsers/OS variants only to the degree verified.

Desktop delivery is part of scope, not a future marketing checkbox. Reuse the PWA for desktop and add extension/native integrations for supported device-level features. Include TV/router setup only where an actual appropriate client/integration exists; those devices may use different interfaces. Do not promise universal support for every historic phone, browser, smart TV, embedded device or OS.

Publish a support matrix with OS/browser/minimum version, install method, available manual tools, extension/native requirements, direct controls versus guided setup, offline behavior and evidence from actual tests. Capability-detect APIs and degrade gracefully. Browser emulation is not physical-device verification.

On/off controls:
- Every continuous protection function exposes an obvious accessible control, labelled with its true scope: this browser, configured DNS profile, native VPN or local scanner. Manual tools use Run/Cancel/Clear rather than a meaningless “always on” switch.
- Group master controls by actual component, with individual category switches, per-site/per-app exceptions and a temporary pause timer where feasible. Show what the master control changes before applying it.
- Actual state comes from the engine/permission/configuration where observable. Distinguish enabled, active, paused, needs setup, unavailable and unknown. Saving a preference alone does not establish protection.
- If a website cannot apply a device change, show “Set up” / “Open settings” / guided steps, not a fake active toggle. Help verify the change where possible.
- Turning off protection must reverse Shield-owned rules/configuration cleanly without erasing user rules. Explain remaining protection if another component still applies. Test browser/native restart, timer expiry, permission denial, engine failure and configuration drift.
- Avoid preselected GPS grants, automatic eSIM purchases/network changes or silent relaxation of OS permissions. Maps exceptions remain explicit user choices.
- Support keyboard/screen-reader switch semantics, touch-sized controls and clear loading/failure feedback.

Installation:
- Keep a prominent “Install NXTL Shield” / “Add to Home Screen” entry point reachable on mobile and desktop. Include onboarding and a persistent menu item; do not depend on a banner that disappears permanently.
- Use a real install prompt where the current browser supports it and the installation event is available. Trigger that prompt through a deliberate user action.
- Otherwise provide exact current platform/browser steps for Add to Home Screen, Install App or equivalent. Verify Safari/iOS/iPadOS/macOS and other browsers' current behavior instead of assuming a universal programmatic API.
- Detect installed/standalone mode where supported, handle dismissed prompts, unavailable install events and in-app browsers. Offer “Open in supported browser” instructions when appropriate.
- Provide a valid manifest, stable app identity/scope/start URL, correct icon variants and service worker/offline behavior. Test the app launch, deep links, updates, orientation, safe areas, file picker/sharing and removal instructions.
- Explain that installing a PWA does not grant native location, antivirus or system-wide filtering powers. Extension/native/DNS setup is separate, with its own accurate installation and removal flow.
- If installability cannot be confirmed for a platform, keep the web tools usable and give honest supported-browser instructions. Do not claim “one-tap installation on all devices.”

### 14. Testing that proves behavior

Create and run appropriate checks; fix failures and rerun affected tests. Publish evidence and distinguish mocked tests from real integrations.

Cover:
- URL parsing, Unicode/IDN and credential/subdomain tricks; safe handling of malformed/huge inputs.
- SSRF denial including redirects, mixed IP forms, IPv6 and rebinding scenarios in controlled fixtures.
- List matching, exceptions, precedence, stale/offline sources, corrupted updates and rollback.
- Tracking cleanup with normal, signed, authentication and payment URL fixtures.
- Password generation behavior, no secret egress and correct prefix-only breach requests.
- ClamAV using the harmless EICAR test file, a clean fixture, stale/missing signatures, timeout, encrypted archive and bounded archive-limit fixtures. Never fetch live malware.
- File cleanup, privacy/redaction and resource/rate-limit behavior.
- Real extension blocking of a controlled test request/domain, allowlist, pause and false-positive recovery. A unit test of a matcher alone does not verify browser blocking.
- Real DNS configuration against controlled harmless test domains; browser DNS override and cached responses. Do not mistake calling a resolver over HTTPS for proof the device uses it.
- Real VPN integration, if deployed: egress observation, dual-stack behavior, DNS routing, reconnect, split routing and kill-switch failure, measured using controlled network conditions/packet observation.
- PWA manifest/installability, actual supported install prompts and manual-instruction fallbacks, standalone launch, updates/uninstall, offline behavior, accessibility and responsive browser E2E tests using Chromium, Firefox and WebKit where available.
- Location blocking on a controlled test site: blocked default, user-approved map-origin exception, restored settings, unsupported permissions, browser conflicts and honest native/mobile manual-only state. Map instructions must preserve navigation when the user wants it.
- Every on/off/pause control against the actual engine: verify affected requests/settings change, persistence/reversal works, and engine failures never leave a false active indicator.
- NXTL integration: canonical current links, currency/unit/time from feeds, exact compatibility uncertainty, no purchase gate, optional paid-service disclosure, no fake connection detection and consistent VPN/eSIM privacy comparison. Do not make a live purchase for tests.
- API/MCP contracts, input validation and an actual available client call.
- CI, dependency/license/secret scanning, reproducible clean build and fresh Docker deployment.

Use browser emulation to test layout, and real Android/iPhone hardware if available for native/DNS/VPN claims. Mark unavailable hardware tests “not run”; WebKit desktop testing is not a physical iPhone pass.

Do not probe unrelated systems, install profiles on users' devices, alter production DNS or use real customer messages/files for tests. Use synthetic data and owned environments.

No claim of antivirus efficacy from EICAR alone: it validates a scan path, not broad detection performance. No independent audit or “fully secure” claim without supporting evidence.

### 15. Delivery and publication

Inspect existing GitHub access and choose the verified NXTL owner. Prefer a dedicated nxtl-shield repository; inspect before creating/reusing it and preserve existing work. Use a branch/PR if contributing to an existing project. Honour repository instructions.

Deliver complete source, reproducible builds, lockfiles, dependency/licence manifest, source registry, .env.example without secrets, Docker/Compose deployment where needed, CI, README, architecture/privacy/security docs, vulnerability reporting instructions, capability matrix, test evidence, screenshots from synthetic-data UI, release notes and exact deployment commands. Screenshots are evidence only, not substitutes for running tools.

Publish the authorised project to NXTL's GitHub and deploy the web demo to the verified available Hugging Face namespace or another already-authorised no-new-cost host. You have my authorisation to publish this dedicated project through existing account access. Do not modify the NXTL production website or purchase domains/servers. Verify the Hugging Face account/organisation instead of guessing a namespace.

Hugging Face is for the web/checking demo and MCP surface. Its documented networking restrictions and lifecycle mean it is not a substitute for public WireGuard gateways, an always-on production DNS resolver or guaranteed background monitoring. Use static hosting for local-only tools if appropriate; optional scanner/MCP services need a real compatible deployment and current compute entitlement. Never describe a sleeping, missing or disabled backend as active protection.

Use server-side secrets or CI secret stores. Keep private native signing keys and user VPN private keys out of public artifacts. If platform signing/store access or a verified hosting endpoint is missing, finish everything else, preserve release-ready artifacts and report the precise remaining step.

After publication, open the real public URLs and repeat relevant smoke tests. Verify static assets, mobile layout, backend availability, source status, one actual supported check, and MCP if deployed. A successful build is not proof of a working deployment.

Do not declare the suite finished while claimed features are placeholders. Deliver verified components and a precise coverage report, continuing independent implementation until the authorised achievable work is complete. If the full roadmap requires further milestones, identify what actually shipped and what still lacks implementation or access.

Final report must include live URLs, repository and commit, tests actually run and failures fixed, per-surface capability status, operating-cost owner, unsupported/unverified features, third-party data dependencies and remaining exact blockers. No fabricated successful tests, “all NordVPN features for free” headline, or “full protection” status.

## Research sources and verified constraints

Official Nord sources:
- Feature overview: https://nordvpn.com/features/
- Support feature inventory: https://support.nordvpn.com/hc/en-us/articles/19559429814545-What-features-does-NordVPN-have
- Antivirus behavior, quarantine and device differences: https://support.nordvpn.com/hc/en-us/articles/19508765521425-What-is-NordVPN-s-Next-gen-antivirus
- Advanced antivirus tools: https://nordvpn.com/next-gen-antivirus/
- Call/message protection: https://nordvpn.com/features/call-and-message-protection/
- Identifier monitoring: https://nordvpn.com/features/dark-web-monitor/
- Bundle boundaries: https://nordvpn.com/blog/nordvpn-bundle-explained/
- Meshnet: https://nordvpn.com/meshnet/
- Manual scam checker: https://nordvpn.com/scam-checker/
- Platform release notes: https://nordvpn.com/blog/nordvpn-windows-release-notes/ and https://nordvpn.com/blog/nordvpn-mac-release-notes/

Components, data and platforms:
- WireGuard: https://www.wireguard.com/quickstart/
- NetBird: https://docs.netbird.io/
- AdGuard Home: https://github.com/AdguardTeam/AdGuardHome
- AdGuard DNS filter: https://github.com/AdguardTeam/AdGuardSDNSFilter
- HaGeZi blocklists: https://github.com/hagezi/dns-blocklists
- uBlock Origin: https://github.com/gorhill/uBlock
- uBO Lite: https://github.com/uBlockOrigin/uBOL-home
- ClamAV: https://docs.clamav.net/ and https://www.clamav.net/
- Pwned Passwords / email API distinction: https://haveibeenpwned.com/API/v3
- OpenPhish current terms: https://openphish.com/terms.html
- URLhaus current API conditions: https://urlhaus.abuse.ch/api/
- Apple sandboxing: https://support.apple.com/en-nz/guide/security/sec15bfe098e/web
- Android VPN architecture and one-active-service limit: https://developer.android.com/develop/connectivity/vpn
- Apple Network Extension requirements: https://developer.apple.com/documentation/networkextension/packet-tunnel-provider
- Chrome request blocking: https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
- HF Spaces networking/lifecycle: https://huggingface.co/docs/hub/spaces-overview
- HF Docker Spaces: https://huggingface.co/docs/hub/spaces-sdks-docker
- HF MCP: https://huggingface.co/docs/hub/spaces-mcp-servers

NXTL integration and location/privacy sources:
- NXTL current product/source map: https://nxtlsim.com/ai-info/
- NXTL London exit, limits and current routing: https://nxtlsim.com/global-routing/
- NXTL privacy policy: https://nxtlsim.com/privacy-policy/
- Android managed permission authority: https://developer.android.com/reference/android/app/admin/DevicePolicyManager#setPermissionGrantState(android.content.ComponentName,java.lang.String,java.lang.String,int)
- Android user location permissions: https://developer.android.com/develop/sensors-and-location/location/permissions/runtime
- Apple per-app location and precise access: https://support.apple.com/en-ie/102647
- Browser location content settings: https://developer.chrome.com/docs/extensions/reference/api/contentSettings

Terms, feature availability, project maintenance and provider pricing can change. Grok must recheck the exact selected source/version before deployment.

