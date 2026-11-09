# Android companion

This document describes a possible later app. Version 0.1 does not include an APK.

## Why a native app

Android allows one active local-filtering tunnel per user or profile. A companion tunnel would replace any other tunnel app. The page cannot do that.

Call screening needs the call-screening role. Broad file checks need storage access that a browser does not have, and even then other apps’ private directories stay out of reach.

## Shape

- A small native module for filtering, call screening, and file checks.
- The same status vocabulary as the page: on, off, needs setup, unsupported.
- No second copy of the link checker. The app would call the shared core or the read-only API.
- The user would install it separately. The web app would show “not installed” until the app reports back.

## Not in this design

- Device-owner or root access
- A tunnel with a selectable exit
- A replacement for the NXTL eSIM app
