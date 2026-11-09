# Brand assets

Recorded 2026-11-09. Header wordmarks and the app icon are official files. They are not redrawn, inverted, or recoloured.

## Header lockups

Used only in the page header, swapped by theme. Dark theme uses the white wordmark. Light theme uses the navy wordmark.

| File | Use | Notes |
|---|---|---|
| `apps/web/public/brand/nxtl-esim-lockup-dark.png` | Dark theme | Copy of `nxtl-esim-lockup-597.png`. White wordmark, coral chevron. 597×78. |
| `apps/web/public/brand/nxtl-esim-lockup-light.png` | Light theme | Copy of `nxtl-esim-lockup-light-1D212E.png`. Navy `#1D212E` wordmark. 597×78. |

Source note: `docs/facts/brand.md` (verified 2026-11-09 against nxtlsim.com). CSS does not use `filter: invert()`.

The site’s dark tokens stay in the UI. The light theme is derived and checked for contrast; it is not an official NXTL palette.

## App icon: NXTL X mark

Official square mark: coral and white X on navy. Owner file `uploads/nxtl-x-mark-navy.png`, stored as `nxtl-shield-assets/nxtl-x-mark-navy.png`.

| Measured | Value |
|---|---|
| Pixel size | 1254×1254 RGB (the owner note said 1024; the file is 1254) |
| Sampled background | `#0D1527` (pixel 2,2). The owner described it as about `#0E1424`. The file was not recoloured to match that description. |
| Mark bounds | x 229–994, y 328–903 |
| Margins (left, right, top, bottom) | 18.3%, 20.7%, 26.2%, 27.9% |

Maskable icons keep the important artwork inside the centre 80% (a 10% margin on each side). The tightest margin is 18.3%, so the mark already sits inside that zone. `icon-maskable-512.png` is the same resize as `icon-512.png`, with no extra padding and no crop.

Resize script: `scripts/resize-x-mark.py`. Pillow Lanczos only. Outputs:

| Size | Path | Use |
|---|---|---|
| 32 | `apps/web/public/icons/favicon.png` | Favicon |
| 32 | `apps/web/public/icons/icon-32.png` | Small icon |
| 180 | `apps/web/public/icons/icon-180.png` | Apple touch icon |
| 192 | `apps/web/public/icons/icon-192.png` | PWA manifest, purpose `any` |
| 512 | `apps/web/public/icons/icon-512.png` | PWA manifest, purpose `any` |
| 512 | `apps/web/public/icons/icon-maskable-512.png` | PWA manifest, purpose `maskable` |
| 16, 32, 48, 128 | `apps/extension/icons/icon-*.png` | Extension manifest |
| 1200 | `apps/web/public/og/nxtl-shield-og.png` | Open Graph and Twitter image |
| 1200 | `apps/web/public/og/hf-thumbnail.png` | Hugging Face Space thumbnail. Upload this file as the Space’s social image, or copy it to the Space root as `thumbnail.png`. |

The installed PWA `background_color` is `#0D1527` so the splash matches the icon navy. The page theme colour stays the site token `#0A0C12`.

### 16px legibility

The 16×16 extension icon, viewed scaled with nearest-neighbour, still reads as the coral-and-white X on navy. Edges are stair-stepped, which is the downsample, not a new drawing. 32×32 and 128×128 keep the split between the coral and white halves.

The earlier hand-drawn `favicon.svg` was removed so the only icon mark shipped is this file.
