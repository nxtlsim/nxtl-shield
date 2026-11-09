# NordVPN feature inventory, current state as of 2026-11-09

## Sources

- nordvpn.com pages returned **HTTP 403 to curl** (bot protection), so they were read with WebFetch on 2026-11-09. There are no raw HTML copies; quotes below come from the WebFetch text.
- support.nordvpn.com pages were saved to raw/nord/support-*.txt.

| Key | URL |
|---|---|
| F | https://nordvpn.com/features/ |
| S1 | https://support.nordvpn.com/hc/en-us/articles/19559429814545-What-features-does-NordVPN-have |
| S2 | https://support.nordvpn.com/hc/en-us/articles/19508765521425-What-is-NordVPN-s-Next-gen-antivirus |
| NG | https://nordvpn.com/next-gen-antivirus/ |
| DW | https://nordvpn.com/features/dark-web-monitor/ |
| CM | https://nordvpn.com/features/call-and-message-protection/ |
| B | https://nordvpn.com/blog/nordvpn-bundle-explained/ (dated September 25, 2026) |
| M | https://nordvpn.com/meshnet/ |
| SC | https://nordvpn.com/scam-checker/ |
| RW | https://nordvpn.com/blog/nordvpn-windows-release-notes/ (latest is 8.15, Nov 9 2026) |
| RM | https://nordvpn.com/blog/nordvpn-mac-release-notes/ (latest is 10.14, Oct 27 2026) |

## Current features by family

**VPN core**
- Encryption, Kill Switch, split tunnelling, Double VPN, Onion Over VPN, obfuscated servers, Dedicated IP, SmartPlay, Private DNS, DNS leak test, MFA (F).
- "Secure up to 10 devices" and "225+ locations" (F).
- Protocols: NordLynx (WireGuard-based), NordWhisper, OpenVPN, IKEv2/IPsec (S1).
- Post-quantum encryption toggle (RW 7.31; RM 8.35/8.36).
- On macOS the App Store version dropped IKEv2 (RM 8.5.0).
- Obfuscated servers now run on NordWhisper instead of OpenVPN (RW 8.7, Jul 2026; RM 10.6).
- All regular servers now support P2P (RW 8.2; RM 10.1).
- Dedicated server with port forwarding (F; RW 8.6; RM 10.5).
- The "Advanced kill switch" was renamed "VPN bypass prevention" (RM 10.13, App Store).
- Browser proxy extensions for Chrome, Edge and Firefox (F, S1).

**Next-gen antivirus (NGAV)** (S2, NG)
- Three parts:
  - Anti-malware: download scan, double-extension detection, app vulnerability check (Windows), quarantine or auto-delete.
  - Advanced browsing protection: malicious site blocking, scam and fraud alerts, hijacked-session alerts, search result safety indicator, email protection, crypto wallet checker.
  - Ad and tracker blocker: also includes the URL cleaner and the cookie banner hider.
- Works without a VPN connection.
- Partly powered by nexos.ai.
- Engine is proprietary: "we do not use any third-party software development kits" (NG FAQ).
- Quarantined files auto-delete after 30 days (S2).
- NGAV was formerly "Threat Protection Pro" and, before that, "Scam, phishing, and malware protection" (NG, S2).
- Added on Windows in 8.3 (May 21, 2026, RW) and on macOS direct download in 10.3 (Jun 9, 2026, RM).

**Real-time protection** (S2)
- DNS-based blocking of ads, trackers and unsafe domains.
- Requires a VPN connection, except on mobile.
- No file scanning.
- Available on macOS, Windows, Android, iOS, Linux, Android TV/Fire Stick and the Chrome, Firefox and Edge extensions.

**Dark Web Monitor** (DW, B)
- DWM (Basic plan): up to 5 email addresses.
- DWM Pro: up to 8 emails, 1 phone number (selected countries only), 2 credit cards and 2 national ID/SSN.
- There is also a free one-time email check.
- Transaction monitoring for US bank accounts only (RW 8.8; RM 10.9).

**Call and message protection** (CM)
- Warns about scam calls using a number reputation check and can auto-block them (optional).
- Message protection uses on-device pattern analysis of SMS from unknown senders.
- Android setup: make NordVPN the default Caller ID and spam app.
- Runs without a VPN.

**Meshnet** (M)
- Free and described as "open source".
- Up to 10 own devices plus 50 external devices.
- File sharing, LAN, remote access and traffic routing.
- It was planned for retirement, then kept: "Meshnet is here to stay" (RW 7.50, Oct 16 2025; RM 9.6).

**Scam checker** (SC)
- Free web tool: link checker, file checker and text checker (English only).
- Includes NordBot, an experimental AI chatbot.
- No account needed.

**Bundles** (B)
- Basic: VPN, Dark Web Monitor, basic scam/phishing protection.
- Complete adds NGAV, DWM Pro, NordPass, ad/tracker blocker, unlimited email protection, call and message protection, and NordLocker (1 TB).
- Prime adds Coveron: credit monitoring and insurance, US-only and excluding New York.
- Region-only plans:
  - Ultra adds Incogni (Canada, most of the EU including Lithuania).
  - Ultimate Max adds scam-loss and ID theft recovery up to £5,000, plus a dedicated IP (UK, FR, IT, SE, NL, DE).
  - Complete Max (elsewhere).

## Conflicts (recorded as found, not resolved)

1. **Where NGAV is available**
   - B footnote: NGAV is "available on Windows and macOS".
   - S2: Windows 10/11 64-bit and macOS 12+ sideloaded only (not the Mac App Store); Android, iOS, Linux and extensions get only Real-time protection.
   - NG FAQ says NGAV runs "as long as the NordVPN app is running". It does not limit by OS.
   - B's table gives NGAV to Complete and Prime with no OS caveat.
2. **Call protection on iOS**
   - DW pricing cards: "Scam call protection … Android only, iOS coming soon".
   - S1: "warns Android users".
   - CM: "Set up call and message protection on your NordVPN app for Android and iOS devices".
   - Current iOS status is **UNVERIFIED**.
3. **Naming**
   - The NG page and support FAQ call it "Scam, phishing, and malware protection" in the app.
   - S2 says the old name is being replaced by "Next-gen antivirus".
   - The Mac App Store notes (RM 10.3) use "scam and phishing protection, previously Threat Protection" for the DNS-level feature.
   - Treat these as three distinct tiers: Threat Protection (DNS) → Threat Protection Pro → NGAV.
4. **Basic plan protection**
   - B says Basic includes "basic scam and phishing protection" that blocks ads and malicious domains "when you're connected to the VPN".
   - B's table marks the "Ad and tracker blocker" ❌ for Basic.
   - This is consistent only if "ad blocking" in Basic means DNS-level, which is ambiguous.
5. **Device limit**
   - Meshnet: 10 own devices plus 50 external (M).
   - VPN: up to 10 devices (F).
   - These are different limits, not a conflict, but don't conflate them.
6. **Location count**
   - "225+ locations" (F) vs "225 locations" (DW). The difference is minor.

## Retired or renamed

- IKEv2 removed from the macOS App Store app (RM 8.5.0).
- Presets removed (RM 9.0).
- "Quick Connect" renamed "Secure my connection" (RW 7.49).
- Threat Protection Pro renamed into NGAV (2026).
- Meshnet's announced retirement was reversed (Oct 2025).

## Paid add-ons or region-limited

- Dedicated IP and dedicated server (paid extras: F).
- Coveron (US only).
- Incogni (Ultra plan, region-limited).
- Transaction monitoring (US banks).
- DWM Pro phone monitoring (selected countries).

## Implications for NXTL Shield parity (reference: the brief's 57-row map)

- Must be stated as **no equivalent**: proprietary NGAV engine, nexos.ai detection, NordWhisper, post-quantum VPN, Coveron/insurance, card/ID dark-web data, hijacked-session database, number reputation database.
- **Partial or manual equivalents are possible**: scam checker (URL/text/file), DNS-level blocking, URL cleaner, cookie banner hiding, password tools, DNS leak/IP observation.
- **Meshnet**: needs the self-hosted NetBird/Headscale route. There is no free hosted alternative.
- **Call protection**: needs a native Android CallScreeningService plus a licensed number list (unavailable). Message protection needs native SMS filtering.
