# Security

## What Shield does

Checks and Private messages & files run locally. The API repeats the same checks and does not fetch the address you submit.

Private messages & files uses OpenPGP.js 6.3.2 with SEIPDv2, AES-256-OCB, and Argon2. The password is not attached to the encrypted result. Tell the other person the password through a different channel.

## Limits

- A list miss is not a verdict that a site is safe.
- The file tool is not a malware scan.
- GnuPG 2.4 cannot open messages Shield writes.
- Installing the page does not filter other apps.
- The extension’s location control exists in Chromium, not Firefox.

## Reporting a vulnerability

Open a private security advisory on https://github.com/nxtlsim/nxtl-shield or write through https://nxtlsim.com/contact-us/. Please do not file a public issue for an unfixed vulnerability.
