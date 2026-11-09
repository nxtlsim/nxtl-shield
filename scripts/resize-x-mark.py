#!/usr/bin/env python3
"""Resize the official NXTL X mark. No redraw and no recolour."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "nxtl-shield-assets" / "nxtl-x-mark-navy.png"
WEB = ROOT / "apps" / "web" / "public"
EXT = ROOT / "apps" / "extension" / "icons"

def resize(size: int, dest: Path) -> None:
    image = Image.open(SRC).convert("RGB")
    image = image.resize((size, size), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, format="PNG", optimize=True)

def main() -> None:
    outputs = {
        WEB / "icons" / "favicon.png": 32,
        WEB / "icons" / "icon-32.png": 32,
        WEB / "icons" / "icon-180.png": 180,
        WEB / "icons" / "icon-192.png": 192,
        WEB / "icons" / "icon-512.png": 512,
        WEB / "icons" / "icon-maskable-512.png": 512,
        WEB / "og" / "nxtl-shield-og.png": 1200,
        WEB / "og" / "hf-thumbnail.png": 1200,
        EXT / "icon-16.png": 16,
        EXT / "icon-32.png": 32,
        EXT / "icon-48.png": 48,
        EXT / "icon-128.png": 128,
    }
    for dest, size in outputs.items():
        resize(size, dest)
        print(f"{size} {dest.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
