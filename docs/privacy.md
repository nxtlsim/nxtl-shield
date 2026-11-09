# Privacy

Shield is built to keep checks on your device.

- Link, message, QR, file, cleaner, and Secure Share processing stays in the browser.
- Passwords, messages, and files are not written to local storage, the address bar, or the service-worker cache.
- Saved reports store a short redacted summary of checks you ran. You can export or delete them.
- The service worker caches the app and the list snapshots. It does not cache submissions.
- The optional breached-password check sends the first five characters of a SHA-1 hash to `api.pwnedpasswords.com` with `Add-Padding: true`. The password is not sent.
- Public IP lookup, if you start it, contacts `https://api.ipify.org`. That request is separate from checks and from Secure Share.
- Coverage rates are read from `https://nxtlsim.com/wp-json/nxtl-app/v1/pricing/countries` without your NXTL session cookies.
- DNS profiles send queries to the resolver you choose, not to NXTL. Each resolver’s privacy policy is linked on the setup page.
- There is no Shield account.

NXTL’s own privacy policy for the eSIM service is at https://nxtlsim.com/privacy-policy/. Shield does not change that service.
