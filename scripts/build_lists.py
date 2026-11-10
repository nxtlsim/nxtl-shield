#!/usr/bin/env python3
"""Build committed list snapshots from the 2026-11-09 upstream downloads.

Re-run only after refreshing /tmp/lists (or NXTL_LIST_DIR). The outputs are
the reproducible inputs for the app and extension; the app build itself does
not download lists.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path(os.environ.get("NXTL_LIST_DIR", "/tmp/lists"))
OUT = ROOT / "packages" / "core" / "data"

HOST = re.compile(
    r"^\|\|([a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+)\^(?:\$(.*))?$",
    re.I,
)
TRACK_TOKENS = re.compile(
    r"track|pixel|analyt|doubleclick|metric|telemetry|beacon|adservice|adserver|pagead|"
    r"googlesyndication|googleadservices|googletagmanager|google-analytics|scorecard|"
    r"hotjar|mixpanel|segment\.|matomo|piwik|criteo|taboola|outbrain|quantserve|"
    r"chartbeat|newrelic|sentry-cdn|optimizely|adsystem|adnxs|pubmatic|facebook\.net|"
    r"advert|ads?\.|ads-",
    re.I,
)

# Always-include registrable or exact hosts from EasyList / EasyPrivacy.
MAJOR_TRACKER_HOSTS = [
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "googletagmanager.com",
    "google-analytics.com",
    "adservice.google.com",
    "facebook.net",
    "connect.facebook.net",
    "scorecardresearch.com",
    "adnxs.com",
    "amazon-adsystem.com",
    "hotjar.com",
    "pubmatic.com",
    "criteo.com",
    "criteo.net",
    "taboola.com",
    "outbrain.com",
    "ads-twitter.com",
    "ads.linkedin.com",
    "ads.yahoo.com",
    "advertising.com",
    "adsafeprotected.com",
    "casalemedia.com",
    "openx.net",
    "rubiconproject.com",
    "2mdn.net",
    "googletagservices.com",
    "gstatic.com",  # too broad? skip
]

# gstatic.com is used for many first-party fonts and scripts — do not block the whole host.
MAJOR_TRACKER_HOSTS = [h for h in MAJOR_TRACKER_HOSTS if h != "gstatic.com"]

UPSTREAM = {
    "badware.txt": "https://ublockorigin.github.io/uAssets/filters/badware.txt",
    "tif.mini.txt": "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/tif.mini.txt",
    "easyprivacy.txt": "https://easylist.to/easylist/easyprivacy.txt",
    "easylist.txt": "https://easylist.to/easylist/easylist.txt",
}

TRACKER_HOST_CAP = 12000


def sha256(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def header_value(path: pathlib.Path, key: str) -> str | None:
    prefix = key.lower()
    for line in path.read_text(errors="replace").splitlines()[:40]:
        if line.lower().startswith(prefix):
            return line.split(":", 1)[1].strip()
    return None


def badware_tag(opt: str | None) -> str | None:
    if opt is None:
        return "all"
    base = opt.split(",")[0].strip().lower()
    rest = [p.strip().lower() for p in opt.split(",")[1:]]
    # Skip rules scoped to another domain, an IP, or a resource subset we do not reproduce.
    if any(r.startswith(("domain=", "to=", "ipaddress=", "denyallow=")) or r in {"3p", "xhr", "script", "frame", "popup"} for r in rest):
        return None
    if base == "doc" and all(r.startswith("reason=") or r == "" for r in rest):
        return "doc"
    if base == "all" and all(r.startswith("reason=") or r == "" for r in rest):
        return "all"
    if base == "none":
        return None
    return None


def write_lines(path: pathlib.Path, lines: list[str]) -> None:
    path.write_text("".join(f"{ln}\n" for ln in lines), encoding="utf-8")


def fetch_upstream() -> None:
    import urllib.request

    SRC.mkdir(parents=True, exist_ok=True)
    for name, url in UPSTREAM.items():
        dest = SRC / name
        if os.environ.get("NXTL_LIST_FETCH", "1") == "0":
            continue
        if dest.exists() and dest.stat().st_size > 0 and os.environ.get("NXTL_LIST_FETCH") != "force":
            continue
        print(f"fetch {name}")
        req = urllib.request.Request(url, headers={"User-Agent": "nxtl-shield-lists/0.6"})
        with urllib.request.urlopen(req, timeout=60) as response:
            dest.write_bytes(response.read())


def collect_hosts(path: pathlib.Path) -> list[str]:
    hosts: list[str] = []
    if not path.exists():
        return hosts
    for line in path.read_text(errors="replace").splitlines():
        raw = line.split("#", 1)[0].strip()
        m = HOST.match(raw)
        if not m:
            continue
        opt = m.group(2)
        if opt:
            parts = [p.strip().lower() for p in opt.split(",")]
            if any(p.startswith(("domain=", "to=", "ipaddress=", "denyallow=", "sitekey=")) for p in parts):
                continue
        hosts.append(m.group(1).lower().rstrip("."))
    return hosts


def prefer_tracker_hosts(hosts: list[str]) -> list[str]:
    seen: set[str] = set()
    ranked: list[tuple[int, int, str]] = []
    major = {h.lower() for h in MAJOR_TRACKER_HOSTS}
    for host in hosts:
        if host in seen:
            continue
        seen.add(host)
        score = 0
        if host in major:
            score += 100
        if TRACK_TOKENS.search(host):
            score += 40
        # Prefer shorter, more general hosts.
        score -= host.count(".") * 2
        ranked.append((-score, host.count("."), host))
    ranked.sort()
    # Keep majors even if the cap is tight.
    chosen: list[str] = []
    for _, __, host in ranked:
        if len(chosen) >= TRACKER_HOST_CAP and host not in major:
            continue
        chosen.append(host)
    # Guarantee majors are present.
    for host in MAJOR_TRACKER_HOSTS:
        if host not in chosen:
            chosen.insert(0, host)
    return chosen[:TRACKER_HOST_CAP]


def main() -> None:
    if os.environ.get("NXTL_LIST_FETCH", "1") != "0":
        fetch_upstream()
    badware_src = SRC / "badware.txt"
    tif_src = SRC / "tif.mini.txt"
    privacy_src = SRC / "easyprivacy.txt"
    easylist_src = SRC / "easylist.txt"
    bad: dict[str, str] = {}
    skipped = 0
    for line in badware_src.read_text(errors="replace").splitlines():
        line = line.strip()
        m = HOST.match(line)
        if not m:
            continue
        host, opt = m.group(1).lower().rstrip("."), m.group(2)
        tag = badware_tag(opt)
        if tag is None:
            skipped += 1
            continue
        # Prefer the broader tag if the host is listed twice.
        prev = bad.get(host)
        if prev == "all":
            continue
        bad[host] = tag
    bad_lines = [f"{h}\t{bad[h]}" for h in sorted(bad)]

    tif: list[str] = []
    seen: set[str] = set()
    for line in tif_src.read_text(errors="replace").splitlines():
        m = HOST.match(line.strip())
        if not m or m.group(2):
            continue
        host = m.group(1).lower().rstrip(".")
        if host in seen:
            continue
        seen.add(host)
        tif.append(host)
    tif.sort()

    raw_trackers = collect_hosts(privacy_src) + collect_hosts(easylist_src)
    trackers = prefer_tracker_hosts(raw_trackers)

    write_lines(OUT / "badware-hosts.txt", bad_lines)
    write_lines(OUT / "tif-hosts.txt", tif)
    write_lines(OUT / "tracker-hosts.txt", trackers)

    manifest = {
        "version": "2026-11-10.1",
        "generatedFrom": "upstream files retrieved 2026-11-10; see docs/sources.md",
        "selection": {
            "badware": "Host anchors from uBlock uAssets badware.txt. Included when the rule has no options, or only doc/all plus an optional reason. Rules with domain=, to=, ipaddress=, or resource-type limits are omitted so Shield does not widen them. Tag doc = upstream $doc (document only). Tag all = whole-host anchor.",
            "tif": "Every plain ||host^ anchor in HaGeZi TIF mini (no options, no path). The manual checker uses this full list. The extension uses a size-capped prefix; see apps/extension build.",
            "trackers": "Host anchors from EasyList and EasyPrivacy that map cleanly to ||host^ declarativeNetRequest rules, plus a short list of major ad and tracker networks. Capped to stay within extension rule limits. Not used as a malware verdict.",
            "omittedBadwareRules": skipped,
        },
        "sources": [
            {
                "id": "uassets-badware",
                "title": "uBlock filters – Badware risks",
                "url": "https://ublockorigin.github.io/uAssets/filters/badware.txt",
                "licence": "GPL-3.0",
                "licenceUrl": "https://github.com/uBlockOrigin/uAssets/blob/master/LICENSE",
                "retrieved": "2026-11-09",
                "upstreamModified": header_value(badware_src, "! Last modified"),
                "expiryHint": header_value(badware_src, "! Expires") or "5 days",
                "hosts": len(bad_lines),
            },
            {
                "id": "hagezi-tif-mini",
                "title": "HaGeZi Threat Intelligence Feeds mini",
                "url": "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/tif.mini.txt",
                "licence": "GPL-3.0",
                "licenceUrl": "https://github.com/hagezi/dns-blocklists/blob/main/LICENSE",
                "retrieved": "2026-11-09",
                "upstreamModified": None,
                "expiryHint": "8 hours",
                "hosts": len(tif),
                "inputsNote": "HaGeZi FAQ says aggregated inputs carry their own terms. Per-input terms were UNVERIFIED on 2026-11-09.",
            },
            {
                "id": "easyprivacy-hosts",
                "title": "EasyPrivacy host anchors",
                "url": "https://easylist.to/easylist/easyprivacy.txt",
                "licence": "GPL-3.0-or-later AND CC-BY-SA-3.0",
                "licenceUrl": "https://easylist.to/pages/licence.html",
                "attribution": "The EasyList authors (https://easylist.to/)",
                "retrieved": "2026-11-10",
                "expiryHint": "4 days",
                "hosts": len(collect_hosts(privacy_src)),
            },
            {
                "id": "easylist-hosts",
                "title": "EasyList host anchors",
                "url": "https://easylist.to/easylist/easylist.txt",
                "licence": "GPL-3.0-or-later AND CC-BY-SA-3.0",
                "licenceUrl": "https://easylist.to/pages/licence.html",
                "attribution": "The EasyList authors (https://easylist.to/)",
                "retrieved": "2026-11-10",
                "expiryHint": "4 days",
                "hosts": len(collect_hosts(easylist_src)),
            },
        ],
        "sha256": {
            "badware-hosts.txt": sha256(OUT / "badware-hosts.txt"),
            "tif-hosts.txt": sha256(OUT / "tif-hosts.txt"),
            "tracker-hosts.txt": sha256(OUT / "tracker-hosts.txt"),
        },
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"badware": len(bad_lines), "tif": len(tif), "trackers": len(trackers), "skippedBadware": skipped}, indent=2))


if __name__ == "__main__":
    main()
