# Privacy

Shield is built to keep checks on your device. The short customer policy is also at `apps/web/public/privacy.html`, published at https://nxtlsim.github.io/nxtl-shield/privacy.html.

- Link, message, QR, file, cleaner, and Private messages & files processing stays in the browser.
- The Shield browser extension keeps its settings in the browser and does not collect personal data. Threat, ad, and tracker lists ship with the extension.
- Passwords, messages, and files are not written to local storage, the address bar, or the service-worker cache.
- Saved reports store a short redacted summary of checks you ran. You can export or delete them.
- The service worker caches the app and the list snapshots. It does not cache submissions.
- A private link sends only the locked text, never the key or password. The locked text is deleted when the message is opened, or when the time limit ends.
- The optional leaked-password check sends only a short, incomplete fingerprint of the password to a public leak database. The password itself is not sent.
- Public IP lookup, if you start it, contacts a public address lookup. That request is separate from checks and from Private messages & files.
- Coverage rates are read from the public NXTL eSIM pricing feed without your NXTL session cookies.
- DNS profiles send queries to the resolver you choose, not to NXTL. Each resolver’s privacy policy is linked on the setup page.
- There is no Shield account, and Shield does not use analytics.

NXTL’s own privacy policy for the eSIM service is at https://nxtlsim.com/privacy-policy/. Shield does not change that service.
