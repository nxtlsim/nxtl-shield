# Rules for every change

1. Customer text is short everyday sentences. Calm tone. No jargon, no scare words, no hype, no legal hedging in the headline.
2. Each screen answers three things: what it is, why it matters (with a real-life example), and what to tap now.
3. Every action is a real working button or link. Never leave people with only plain-text instructions they must hunt for in Settings.
4. No internal or technical notes in the UI: no API names, endpoints, timestamps, field names, library names (zxcvbn, SHA-1, Web Crypto, Argon2, AES-256-OCB, HaGeZi, DKIM, SPF, TIF), no "list may be outdated", no "can't be trusted", no "UNVERIFIED", no "this is not proof".
5. Never fake a control or a status. Only show "On" / "Active" when you really detected it. If you cannot know, say "Not checked yet" or "Set this on your device" and give the button to do it.
6. Never call it a VPN or say "not a VPN". Never say "antivirus". Never claim you scan installed apps.
7. Never mention other consumer brands in names, descriptions, or UI copy.
8. Square buttons, consistent 48px height (40px compact in the header), comfortable spacing (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64). Header is the X-mark icon plus the word "Shield".
9. No in-app analytics or tracking. Do not touch the NXTL eSIM production app.
10. Every feature you show must work end to end. If a platform cannot do a true one-click change, say so in one short line and give the best real path (download, copy, or open-settings button).
11. After any route change, the new page starts at the top (see section 8). Back and Forward restore the previous scroll position.
12. Respect `prefers-reduced-motion`: no decorative animation, instant page scroll, no layout shift.
13. Push only to the agreed branch and summarise. Do not invent scope that this prompt did not ask for (no VPN/private-connection feature, no Chrome Web Store upload, no paid APIs that need a secret in the client).
14. Use sentence case for headings, buttons, badges, labels, and table headers. Keep the Shield wordmark and proper names as they are (NXTL, Windows, Android, iPhone, Firefox, Chrome). Do not use CSS `text-transform: capitalize` on badges or titles — it turns "Likely scam" into "Likely Scam".
15. Status badges sit inline with the row label, with a short word and a colored dot or status icon. Action buttons sit alone on the right, vertically centered. A badge must not look like a button (no grey pill that could be mistaken for a control).
16. In any card grid that includes a CTA, cards are equal height and the CTAs share one baseline: flex column, CTA pinned with `margin-top: auto`.
17. Disclosure rows (`details`/`summary`) are clearly clickable: full-width row, a chevron that rotates when open, hover and focus styles, a visible border or background, and a 48px tap target. Titles are short and plain.
18. No other-brand test pages in the main setup flow. Built-in checks stay inside Shield. If an external double-check is truly useful, keep it as a quiet secondary link, not in the primary button row.
19. Customer-facing NXTL coverage wording must match the live NXTL site. Use "180+ countries" (confirmed 10 Nov 2026 on https://nxtlsim.com/ and https://nxtlsim.com/esim-coverage/; the destinations directory also states 182). Never write 150+.
20. Empty file pickers show only the drop zone. A Remove control, file name, or preview chip appears only after a file is chosen. After Remove, return to the empty drop zone and clear the input value so the same file can be chosen again.
21. Keep NXTL eSIM's London routing claim as the owner wrote it ("Routes your traffic via London for consistent privacy abroad"). It is accurate. Do not remove or soften it. Only fix coverage numbers (180+ countries).
22. UI examples and placeholders use nxtlsim.com (for example `e.g. nxtlsim.com`). Do not use delfi.lt or other third-party sites as the example domain in the interface. Tests may still use delfi.lt.
