# Chrome Web Store listing — NXTL Shield 0.6.0

Paste-ready text for the Chrome Web Store Developer Dashboard.

Build the store zip (no manifest `key` field) with:

```bash
node apps/extension/build.mjs --store
```

Then zip `apps/extension/dist-chromium/` with `manifest.json` at the root. Version is 0.6.0. The first upload receives a new item ID. After that ID is assigned, add `chrome-extension://<id>` to the message relay allowlist (see the relay repo `src/cors.ts`).

The default `npm run build -w @nxtl/extension` keeps the `key` so unpacked loads stay on the stable development ID. Do not upload that build to the store.

---

## Name

NXTL Shield

## Summary (132 characters or less)

Free tools to check a link or message, block ads and trackers, and send a note that opens only once.

## Detailed description

NXTL Shield is a free, open-source Chrome extension from NXTL eSIM.

It can:

• Block ads and trackers while you browse
• Warn you if an address looks like a lookalike of a site you know, such as nxtlsim.com
• Warn you before you open a known harmful site, using lists that come with the extension
• Clean common tracking from links
• Hide some cookie banners (it does not choose consent for you)
• Block websites from using your location, or let them ask again
• Check a link or a message, including a lottery text, right in the popup
• Create a private note that is locked on your device and opens only once
• Pause protection on the current site for five minutes, without turning it off everywhere

You do not need an account. The extension keeps its settings in your browser. It does not collect personal data, and it does not use analytics.

The Shield website has more free tools, including Safe DNS setup for your device. You do not need those tools, or an NXTL eSIM, to use this extension.

Is it free?
Yes. The extension and the website tools are free. NXTL eSIM travel data is a separate paid service and does not unlock Shield.

Does it collect my browsing data?
No. Settings stay in your browser. Lists of known harmful sites, ads, and trackers come with the extension.

Need help?
https://github.com/nxtlsim/nxtl-shield/issues

Website: https://nxtlsim.github.io/nxtl-shield/
Source: https://github.com/nxtlsim/nxtl-shield
NXTL eSIM: https://nxtlsim.com

## Category

Privacy & Security

## Language

English

## Homepage URL

https://nxtlsim.github.io/nxtl-shield/

## Support URL

https://github.com/nxtlsim/nxtl-shield/issues

## Privacy policy URL

https://nxtlsim.github.io/nxtl-shield/privacy.html

(Also available in the app at https://nxtlsim.github.io/nxtl-shield/#/privacy)

---

## Single purpose statement

This extension helps you browse more privately and safely: it blocks ads and trackers, warns you about lookalike and known harmful sites, can clean tracking from links, can hide cookie banners, can block location access, and lets you check a link or send a note that opens only once.

---

## Permission justifications

declarativeNetRequest
Used to block ads, trackers, and known harmful sites from the lists that come with the extension, and to clean tracking from links. Also used to pause protection on the current site, and to allow a site once if you continue past a warning.

storage
Used to remember your on and off settings, paused sites, and exceptions in this browser. This data stays on your device.

alarms
Used to turn protection back on when a short pause on the current site ends.

tabs
Used to know the site in the current tab so “Pause on this site” and the warning page can work, and to open Shield or a link you asked to check.

webRequest
Used only to remember the address that was about to open, so the warning page can show it. It does not block requests.

webNavigation
Used to notice when you go to a new page so the extension can warn you about a lookalike address, and to clear a one-time allow after you continue.

contextMenus
Used to add “Check this link with Shield” when you right-click a link.

contentSettings
Used to block websites from using your location, or to let them ask again, when you choose that in the popup.

Host permission for all sites
Needed so ad, tracker, and harmful-site blocking, link cleaning, lookalike warnings, and cookie-banner hiding can work on the sites you visit, not only a short list of domains.

---

## Remote code

No. I am not using remote code.

All code ships in the package. Lists of sites come with the extension. When you create a private note, the extension sends only locked text to the message server; it does not load or run code from that server.

---

## Data usage / privacy practices

Collects user data: No

Leave every data-type checkbox unchecked:

- Personally identifiable information: No
- Health information: No
- Financial and payment information: No
- Authentication information: No
- Personal communications: No
- Location: No
- Web history: No
- User activity: No
- Website content: No

Account required: No

Certifications — check all three:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

Notes for the form, if asked to explain:

The extension does not collect personal data. Settings stay in the browser. When you choose to send a private note, only scrambled text is stored until the note is opened or the time you chose runs out. We cannot read the note. Optional checks on the Shield website (a password leak check, a public IP lookup, or eSIM plan prices) run only when you use those website tools and are described in the privacy policy. They are not part of this extension’s data collection.

---

## Visibility and distribution

Recommended: Public listing, unlisted until you are ready to promote it, or public if you want it searchable on submit. Confirm with the account owner before choosing Publish.

Default language: English (United States) is fine.

Pricing: Free.
