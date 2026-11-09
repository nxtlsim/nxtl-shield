# Chrome Web Store listing (draft, not submitted)

This listing is ready to paste into the Chrome Web Store Developer Dashboard. Publishing needs a one-time Chrome Web Store developer registration, which has to be completed by the account owner.

## Name
NXTL Shield

## Short description (132 characters max)
Free protection by NXTL eSIM: warn on known phishing sites, block trackers, clean tracking links, and hide cookie banners.

## Detailed description
NXTL Shield is a free, open-source Chrome extension from NXTL eSIM. It helps you stay safer while you browse.

What it can do
• Warn you before you open a known phishing or malware site, using lists that ship with the extension
• Optionally block tracker domains
• Clean common tracking parameters from links, while leaving signed, login, and payment links alone
• Hide some cookie banners (it does not change your consent choice for you)
• Block website location access, with exceptions you choose
• Work alongside the free NXTL Shield web app for link checks, encrypted file sharing, and Safe DNS setup
• No account required

Who it is for
• People who want a quick extra check before opening a link, including when travelling or on public Wi-Fi
• Anyone who wants fewer trackers and cleaner links in the browser
• Users who prefer free, open-source tools they can inspect

Privacy
The extension runs in your browser. There is no NXTL account, and NXTL does not collect your browsing history through this add-on. Threat and tracker lists ship with the package. Optional web tools such as a leaked-password check, a public IP lookup, or NXTL eSIM plan prices are separate browser features on the Shield site. You do not need them to use this extension.

FAQ
Is it free?
Yes. The extension and the web tools are free. NXTL eSIM mobile data is an optional paid product and does not unlock Shield.

Does it collect my browsing data?
No. Settings stay in the browser. Lists are included in the add-on package.

Do I need an NXTL eSIM?
No.

Where do I get help?
https://github.com/nxtlsim/nxtl-shield/issues

Links
Web app: https://nxtlsim.github.io/nxtl-shield/
Source: https://github.com/nxtlsim/nxtl-shield
NXTL eSIM: https://nxtlsim.com

## Category
Privacy & Security

## Language
English

## Single-purpose statement
This extension protects your browsing: it warns on known harmful sites, can block trackers, can clean tracking parameters from links, can hide cookie banners, and can control website location access.

## Permission justifications

- declarativeNetRequest: Used to block known harmful and tracker domains in the lists that ship with the extension, when you turn those protections on.
- storage: Used to remember your on/off settings and site exceptions in this browser.
- alarms: Used to automatically resume protection after you pause it for a short time.
- scripting: Used to hide cookie banners when that option is on, and to let the NXTL Shield web app detect that the extension is installed.
- tabs: Used to know the current site so Pause on this site and the warning page can work.
- webRequest: Used to apply link cleaning and protection as pages load, when those options are on.
- webNavigation: Used to notice when you move to a new page so link cleaning and warnings can run at the right time.
- contentSettings: Used to block or allow website location access, including exceptions you choose.
- host permissions for all sites: Needed so protection can cover the sites you visit, not only a short list of domains.

## Privacy practices (answers)

- Collects user data: No
- Collects personally identifiable information: No
- Collects browsing history: No
- Collects website content or activity: No
- Account required: No
- Remote code: No
- Data used for sale, credit, or unrelated advertising: No
- Data shared with third parties: No, not for this extension. Optional checks you run in the web app are described on the Shield site and are not part of this extension.

## Support URL
https://github.com/nxtlsim/nxtl-shield/issues

## Homepage
https://nxtlsim.github.io/nxtl-shield/
