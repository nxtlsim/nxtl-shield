#!/usr/bin/env python3
"""Build DNR rules from the committed host snapshots. No network."""
from __future__ import annotations

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "packages" / "core" / "data"
OUT = pathlib.Path(__file__).resolve().parent.parent / "apps" / "extension" / "generated"
OUT.mkdir(parents=True, exist_ok=True)

CHROME_ID = "aihdikogmaekjmanjhdmeanhhfhiblmm"
TEST_HOST = "blocked.nxtl-shield-test.invalid"
CAP = 20000
OTHER = [
    "script",
    "xmlhttprequest",
    "sub_frame",
    "image",
    "media",
    "font",
    "stylesheet",
    "ping",
    "websocket",
    "other",
    "object",
]
PARAMS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "utm_name",
    "utm_cid",
    "utm_reader",
    "utm_referrer",
    "fbclid",
    "gclid",
    "gclsrc",
    "dclid",
    "gbraid",
    "wbraid",
    "msclkid",
    "twclid",
    "ttclid",
    "igshid",
    "igsh",
    "mc_cid",
    "mc_eid",
    "_hsenc",
    "_hsmi",
    "mkt_tok",
    "vero_id",
    "vero_conv",
    "oly_anon_id",
    "oly_enc_id",
    "_ga",
    "_gl",
    "yclid",
    "rb_clickid",
    "irclickid",
    "li_fat_id",
]


def redirect(rule_id: int, host: str, priority: int = 10, regex: str | None = None) -> dict:
    if regex:
        escaped_host = host.replace(".", r"\.")
        return {
            "id": rule_id,
            "priority": priority,
            "action": {"type": "redirect", "redirect": {"regexSubstitution": regex}},
            "condition": {
                "regexFilter": f"^https?://{escaped_host}(?::\\d+)?(?:[/?#]|$)",
                "resourceTypes": ["main_frame"],
            },
        }
    return {
        "id": rule_id,
        "priority": priority,
        "action": {"type": "redirect", "redirect": {"extensionPath": "/warning.html"}},
        "condition": {"urlFilter": f"||{host}^", "resourceTypes": ["main_frame"]},
    }


def block(rule_id: int, host: str, priority: int = 10) -> dict:
    return {
        "id": rule_id,
        "priority": priority,
        "action": {"type": "block"},
        "condition": {"urlFilter": f"||{host}^", "resourceTypes": OTHER},
    }


def load_badware() -> list[tuple[str, str]]:
    rows = []
    for line in (DATA / "badware-hosts.txt").read_text().splitlines():
        host, _, tag = line.partition("\t")
        if host:
            rows.append((host, tag or "all"))
    return rows


def main() -> None:
    threats: list[dict] = []
    next_id = 1
    # Chromium gets one regex redirect so the warning page receives the test URL.
    chrome_test = redirect(
        next_id,
        TEST_HOST,
        15,
        f"chrome-extension://{CHROME_ID}/warning.html#\\0",
    )
    firefox_test = redirect(next_id, TEST_HOST, 15)
    next_id += 1
    threats.append(block(next_id, TEST_HOST, 15))
    next_id += 1
    included = {"badware_doc": 0, "badware_all": 0, "tif": 0}

    def room(needed: int) -> bool:
        return len(threats) + needed <= CAP

    for host, tag in load_badware():
        if tag == "doc":
            if not room(1):
                break
            threats.append(redirect(next_id, host))
            next_id += 1
            included["badware_doc"] += 1
        else:
            if not room(2):
                break
            threats.append(redirect(next_id, host))
            next_id += 1
            threats.append(block(next_id, host))
            next_id += 1
            included["badware_all"] += 1

    if len(threats) < CAP:
        for host in (DATA / "tif-hosts.txt").read_text().splitlines():
            if not host or not room(2):
                break
            threats.append(redirect(next_id, host))
            next_id += 1
            threats.append(block(next_id, host))
            next_id += 1
            included["tif"] += 1

    chrome_rules = [chrome_test, *threats[1:]]
    firefox_rules = [firefox_test, *threats[1:]]
    # threats[0] is the block rule for the test host; index 0 in `threats` is the block because
    # chrome_test was not inserted into threats. Rebuild explicitly.
    # The list `threats` starts with the test block, then badware. chrome_test replaces nothing.
    # firefox_rules above wrongly used threats[1:]. Fix:
    chrome_rules = [chrome_test, *threats]
    firefox_rules = [firefox_test, *threats]
    if len(chrome_rules) > CAP:
        raise SystemExit(f"threat rules {len(chrome_rules)} exceed {CAP}")

    trackers = []
    tid = 1
    for host in (DATA / "tracker-hosts.txt").read_text().splitlines():
        if not host:
            continue
        trackers.append(block(tid, host, 8))
        tid += 1

    # Chrome DNR RE2 rejects complex/long alternations; keep one simple allow rule per token.
    signed_tokens = [
        "x-amz-signature",
        "x-amz-credential",
        "x-amz-security-token",
        "x-amz-algorithm",
        "payment_intent_client_secret",
        "payment_intent",
        "access_token",
        "id_token",
        "refresh_token",
        "signature",
        "token",
        "sig",
    ]
    cleaning = [
        {
            "id": index,
            "priority": 100,
            "action": {"type": "allow"},
            "condition": {
                "regexFilter": rf"[?&]{token}=",
                "resourceTypes": ["main_frame", "sub_frame", "xmlhttprequest"],
            },
        }
        for index, token in enumerate(signed_tokens, start=1)
    ]
    cleaning.append(
        {
            "id": len(signed_tokens) + 1,
            "priority": 2,
            "action": {"type": "redirect", "redirect": {"transform": {"queryTransform": {"removeParams": PARAMS}}}},
            "condition": {"resourceTypes": ["main_frame", "sub_frame", "xmlhttprequest"]},
        }
    )

    (OUT / "threats.chromium.json").write_text(json.dumps(chrome_rules, separators=(",", ":")))
    (OUT / "threats.firefox.json").write_text(json.dumps(firefox_rules, separators=(",", ":")))
    (OUT / "trackers.json").write_text(json.dumps(trackers, separators=(",", ":")))
    (OUT / "cleaning.json").write_text(json.dumps(cleaning, indent=2))
    meta = {
        "threatRules": len(chrome_rules),
        "trackerRules": len(trackers),
        "cap": CAP,
        "testHost": TEST_HOST,
        "included": included,
        "note": "Threat rules are the full qualifying badware host list plus a code-point prefix of HaGeZi TIF mini until 20000 rules. The manual checker uses the full TIF snapshot. Tracker rules are not malware verdicts.",
    }
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta))


if __name__ == "__main__":
    main()
