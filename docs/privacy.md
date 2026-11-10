# Privacy

Shield is built to keep checks on your device.

- Link, message, QR, file, cleaner, and Private messages & files processing stays in the browser.
- Passwords, messages, and files are not written to local storage, the address bar, or the service-worker cache.
- Saved reports store a short redacted summary of checks you ran. You can export or delete them.
- The service worker caches the app and the list snapshots. It does not cache submissions.
- A private link sends only the locked text, never the key or password. The locked text is deleted when the message is opened, or when the time limit ends.
- The optional leaked-password check sends only a short, incomplete fingerprint of the password to a public leak database. The password itself is not sent.
- Public IP lookup, if you start it, contacts `https://api.ipify.org`. That request is separate from checks and from Private messages & files.
- Coverage rates are read from `https://nxtlsim.com/wp-json/nxtl-app/v1/pricing/countries` without your NXTL session cookies.
- DNS profiles send queries to the resolver you choose, not to NXTL. Each resolver’s privacy policy is linked on the setup page.
- There is no Shield account.

NXTL’s own privacy policy for the eSIM service is at https://nxtlsim.com/privacy-policy/. Shield does not change that service.
