# NXTL brand tokens for Shield (verified 2026-11-09)

Sources:
- https://nxtlsim.com/wp-content/themes/nxtl/assets/css/homepage.css (`.nxtl-shell` custom properties)
- nxtl-mockup-fonts.css
- nxtl-app-legal.css

Raw copies are in raw/site-css/.

## Colours (site = dark-only)
- No `prefers-color-scheme` rules were found on the site. The LIGHT theme below is DERIVED, not an official NXTL palette, so label it that way in the docs.

| Token | Value | Use |
|---|---|---|
| --c0 | #0A0C12 | page bg (dark) |
| --c1 | #111319 | section bg |
| --c2 | #161922 | card |
| --c3 | #1D212E | raised / input |
| --ce | #141720 | elevated |
| --b1 / --b2 | rgba(255,255,255,.08) / .12 | hairlines |
| --ba / --ba-strong | rgba(255,61,90,.35) / .65 | accent borders |
| --t1 / --t2 / --t3 | #FFFFFF / #949AA5 / #636B78 | text |
| --nx-red | #FF3D5A | primary accent, focus ring |
| --nx-mag | #D80044 | gradient end |
| gradient | linear-gradient(135deg,#FF3D5A,#D80044) | CTA |
| glow | 0 6px 24px rgba(216,0,68,.28) | CTA shadow |
| --green | #2ECA7F | positive status |
| --sand | #D8C5B2 | neutral highlight |
| legal css | bg #0f1116, surface #171a21, accent #ff4f6a, link #ff8a9a | secondary reference |

- Other tokens:
  - Radii: 6 / 8 / 12 / 16 px, plus 9999px (pill).
  - Layout: --wrap 1180px, --hdr 64px.
  - Easing: cubic-bezier(0.16,1,0.3,1).
  - Focus: `outline: 3px solid #FF3D5A`.
- Proposed LIGHT theme (DERIVED, not official):
  - Backgrounds: bg #FFFFFF / #F4F5F7.
  - Text: #0A0C12 / #1D212E. Muted text #636B78 (contrast not yet measured: UNVERIFIED until the builder checks WCAG).
  - Accent: #D80044 for text and links on white. #FF3D5A on white is likely below 4.5:1 for small text, so check it.
- The existing NXTL tool repos use their own green tokens (--bg #0b0f19, --card #141a2a, --ac #3ddc97), NOT the site tokens. Shield should follow the site tokens.

## Fonts (self-hosted WOFF2 in the theme)
- Headings: "Plus Jakarta Sans" 500–800 (--ff).
- Body: Inter 400–700 (--fb).
- Mono: "JetBrains Mono" 500–700 (--fm).
- All three are SIL OFL fonts (licence not re-fetched this run: UNVERIFIED). Self-host them and do not hotlink nxtlsim.com.

## Logos (/workspace/nxtl-shield-assets/)
- All three lockups are 597×78 RGBA, already transparent (about 47% of pixels have alpha 0), with identical geometry and a coral chevron.
  - `nxtl-esim-lockup-597.png`: white wordmark, byte-identical to https://nxtlsim.com/wp-content/themes/nxtl/assets/img/brand/nxtl-esim-lockup-597.png. **Use for the DARK theme.**
  - `nxtl-esim-lockup-light-1D212E.png`: #1D212E navy text ("1D212E" is the text colour, not the background). **Use for the LIGHT theme (preferred).**
  - `nxtl-esim-lockup-light-1.png`: #0A0C12 near-black text. Alternative for the light theme.
- `titanium-nxtl-logo-coral-esim.png` (2170×725, taupe text, coral pill) is not recommended for UI, because its taupe text has weak contrast on both themes.
- Hi-res white lockup on the site: /wp-content/themes/nxtl/assets/img/brand/nxtl-esim-lockup.png (1914×250). 398 and 245 webp variants also exist.
- Site icons: /wp-content/uploads/2026/10/nxtl-site-icon-32|180|192 (coral/white chevron on navy #101828, opaque), and nxtl-organization-logo.png (800×800 on #0D1527).
  - These can be used as the basis for PWA icons. Maskable safe-zone fit: UNVERIFIED.
- No trimming or cleaning was needed, so `clean/` was not created.
- Previews:
  - previews/originals-on-bgs.png shows each lockup on #FFFFFF, #F4F5F7, #1D212E and #0A0C12.
  - previews/site-icons.png
- Implementation tip: swap the logo with `<picture>` plus a `[data-theme]` selector. Do not apply CSS `filter: invert()`, because it would turn the coral chevron cyan.
