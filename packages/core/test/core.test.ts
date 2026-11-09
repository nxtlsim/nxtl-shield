import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  CAPABILITIES,
  applySnapshotUpdate,
  blockingDecision,
  buildHibpRequest,
  buildMobileconfig,
  checkText,
  checkUrl,
  cleanUrl,
  explainNxtlRouting,
  explainRates,
  generatePassword,
  generatePassphrase,
  hibpLookup,
  inspectFile,
  inspectHostLiteral,
  interpretDnsCheckPaste,
  interpretHibpBody,
  nordCapabilities,
  originException,
  passwordStrength,
  setupBundle,
  SNAPSHOT_MANIFEST,
  parseBadware,
  parsePlain,
  sha256Hex,
} from "../src/index";
import type { Reputation } from "../src/url/check";

const emptyRep = (): Reputation => ({
  badware: new Map(),
  tif: new Set(),
  trackers: new Set(),
  available: true,
  stale: false,
  version: "test",
  retrieved: "2026-11-09",
});

describe("URL literals and tricks", () => {
  it("flags alternate IP encodings without fetching", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const samples = [
      "http://2130706433/",
      "http://0x7f000001/",
      "http://0177.0.0.1/",
      "http://127.1/",
      "http://0x7f.0x0.0x0.0x1/",
      "http://[::1]/",
      "http://169.254.169.254/latest/meta-data/",
    ];
    for (const sample of samples) {
      const result = checkUrl(sample, emptyRep());
      expect(result.evidence.some((item) => item.id === "ip-literal")).toBe(true);
      expect(result.verdict).toBe("suspicious_indicators");
      expect(result.transmission).toBe("local");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    const meta = checkUrl("http://169.254.169.254/", emptyRep());
    expect(meta.evidence.some((item) => item.detail.includes("169.254.169.254"))).toBe(true);
    vi.unstubAllGlobals();
  });

  it("parses decimal and octal forms", () => {
    expect(inspectHostLiteral("2130706433", "127.0.0.1")?.canonical).toBe("127.0.0.1");
    expect(inspectHostLiteral("0177.0.0.1", "127.0.0.1")?.alternateEncoding).toBe(true);
  });

  it("redacts credentials and flags them", () => {
    const result = checkUrl("https://user:s3cr3t-token@totally-unknown.example/path", emptyRep());
    expect(result.verdict).toBe("suspicious_indicators");
    expect(result.inputRedacted).not.toContain("s3cr3t-token");
    expect(result.evidence.some((item) => item.id === "userinfo")).toBe(true);
  });

  it("flags mixed-script and brand-in-subdomain hosts", () => {
    const mixed = checkUrl("https://paypa\u043b.com/", emptyRep());
    expect(mixed.evidence.some((item) => item.id === "mixed-script" || item.id === "misleading-host")).toBe(true);
    expect(mixed.verdict).toBe("suspicious_indicators");
    const brand = checkUrl("https://paypal.com.evil.example/login", emptyRep());
    expect(brand.evidence.some((item) => item.id === "misleading-host")).toBe(true);
    const real = checkUrl("https://www.paypal.com/login", emptyRep());
    expect(real.evidence.some((item) => item.id === "misleading-host")).toBe(false);
  });

  it("mentions punycode for international names without calling them malicious", () => {
    const result = checkUrl("https://münchen.example/", emptyRep());
    expect(result.evidence.some((item) => item.id === "idn" || item.id === "punycode")).toBe(true);
    expect(result.verdict).not.toBe("known_malicious_match");
  });

  it("rejects huge and malformed input", () => {
    expect(checkUrl(`https://example.com/${"a".repeat(9000)}`, emptyRep()).verdict).toBe("unsupported");
    expect(checkUrl("http://", emptyRep()).verdict).toBe("unsupported");
    expect(checkUrl("::::", emptyRep()).verdict).toBe("unsupported");
    expect(checkUrl("javascript:alert(1)", emptyRep()).verdict).toBe("suspicious_indicators");
  });

  it("matches fixture lists and does not call a miss safe", () => {
    const rep = emptyRep();
    rep.tif.add("evil.example");
    rep.badware.set("risky.example", "doc");
    const hit = checkUrl("https://a.evil.example/login", rep);
    expect(hit.verdict).toBe("known_malicious_match");
    expect(hit.listMatch?.matchedHost).toBe("evil.example");
    expect(hit.summary.toLowerCase()).not.toContain("safe");
    const doc = checkUrl("https://risky.example/", emptyRep());
    const rep2 = emptyRep();
    rep2.badware.set("risky.example", "doc");
    expect(checkUrl("https://risky.example/", rep2).listMatch?.tag).toBe("doc");
    const miss = checkUrl("https://totally-unknown.example/", rep);
    expect(miss.verdict).toBe("no_known_match");
    expect(miss.summary.toLowerCase()).not.toContain("safe");
    expect(doc.verdict).toBe("no_known_match");
  });

  it("keeps allowlist precedence in the blocking decision", () => {
    expect(blockingDecision({ listed: true, allowlisted: true, paused: false })).toEqual({
      decision: "allow",
      reason: "allowlisted",
    });
    expect(blockingDecision({ listed: true, allowlisted: true, paused: true }).reason).toBe("paused");
    expect(blockingDecision({ listed: true, allowlisted: false, paused: false }).decision).toBe("block");
    const rep = emptyRep();
    rep.tif.add("evil.example");
    const shown = checkUrl("https://evil.example/", rep, { allowlist: ["evil.example"] });
    expect(shown.verdict).toBe("known_malicious_match");
    expect(shown.blockingRecommendation).toBe("allow_allowlist");
  });

  it("rolls back a corrupt snapshot and loads the committed one", () => {
    const good = { badwareText: "evil.example\tall\n".repeat(100), tifText: "a.example\n".repeat(1000), trackerText: "t.example\n" };
    const bad = applySnapshotUpdate(good, { ...good, tifText: "not a host\n" });
    expect(bad.rolledBack).toBe(true);
    expect(bad.snapshot).toBe(good);
    const empty = applySnapshotUpdate(good, { badwareText: "", tifText: "", trackerText: "" });
    expect(empty.rolledBack).toBe(true);
    const text = readFileSync(new URL("../data/badware-hosts.txt", import.meta.url), "utf8");
    const parsed = parseBadware(text);
    expect(parsed.size).toBe(SNAPSHOT_MANIFEST.sources[0]?.hosts);
    const tif = parsePlain(readFileSync(new URL("../data/tif-hosts.txt", import.meta.url), "utf8"));
    expect(tif.size).toBeGreaterThan(100_000);
    expect(tif.has("blocked.nxtl-shield-test.invalid")).toBe(false);
  });
});

describe("cleaner", () => {
  it("strips tracking params and keeps ordinary ones", () => {
    const result = cleanUrl("https://example.com/story?utm_source=nl&utm_medium=email&id=42");
    expect(result.changed).toBe(true);
    expect(result.removed).toEqual(expect.arrayContaining(["utm_source", "utm_medium"]));
    expect(result.cleaned).toContain("id=42");
    expect(result.cleaned).not.toContain("utm_source");
  });

  it("preserves signed, oauth, and payment URLs exactly", () => {
    const signed =
      "https://bucket.s3.amazonaws.com/a?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=abc&X-Amz-Signature=deadbeef&utm_source=nl";
    expect(cleanUrl(signed).cleaned).toBe(signed);
    expect(cleanUrl(signed).preserved).toBe(true);
    const oauth = "https://example.com/oauth/callback?code=abc&state=xyz&utm_source=nl";
    expect(cleanUrl(oauth).cleaned).toBe(oauth);
    const pay = "https://checkout.stripe.com/c/pay/cs_test_a?utm_source=nl";
    expect(cleanUrl(pay).cleaned).toBe(pay);
    const intent = "https://shop.example/pay?payment_intent=pi_123&utm_source=nl";
    expect(cleanUrl(intent).cleaned).toBe(intent);
  });

  it("applies a scoped ClearURLs rule on Amazon and still preserves signatures", () => {
    const result = cleanUrl("https://www.amazon.com/dp/B00TEST?pd_rd_w=abc&keep=1");
    expect(result.removed).toContain("pd_rd_w");
    expect(result.cleaned).toContain("keep=1");
    const signed = "https://www.amazon.com/dp/B00TEST?pd_rd_w=abc&signature=abc";
    expect(cleanUrl(signed).preserved).toBe(true);
  });
});

describe("passwords", () => {
  it("uses Web Crypto and the requested classes", () => {
    const source = readFileSync(new URL("../src/password/password.ts", import.meta.url), "utf8");
    expect(source).not.toContain("Math.random");
    const seen = new Set<string>();
    for (let i = 0; i < 30; i += 1) {
      const generated = generatePassword({ length: 20, symbols: true, avoidAmbiguous: true });
      expect(generated.password).toHaveLength(20);
      expect(generated.password).toMatch(/[a-z]/);
      expect(generated.password).toMatch(/[A-Z]/);
      expect(generated.password).toMatch(/[2-9]/);
      expect(generated.password).toMatch(/[!@#$%^&*()\-=+[\]{}:,.?]/);
      expect(generated.password).not.toMatch(/[0OIl1]/);
      seen.add(generated.password);
    }
    expect(seen.size).toBe(30);
    const phrase = generatePassphrase(6);
    expect(phrase.passphrase.split("-")).toHaveLength(6);
    expect(phrase.bits).toBeGreaterThan(60);
    expect(phrase.note).toContain("not a cryptocurrency");
    expect(passwordStrength("password").score).toBeLessThanOrEqual(1);
  });

  it("builds a prefix-only HIBP request and can read a padded body", async () => {
    const request = await buildHibpRequest("correct horse battery staple");
    expect(request.url).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[0-9A-F]{5}$/);
    expect(request.suffix).toHaveLength(35);
    expect(request.url).not.toContain(request.suffix);
    expect(request.url.toLowerCase()).not.toContain("horse");
    expect(request.headers["Add-Padding"]).toBe("true");
    const body = `${request.suffix}:12\n${"A".repeat(35)}:0\n`;
    expect(interpretHibpBody(body, request.suffix).count).toBe(12);
    const calls: string[] = [];
    const result = await hibpLookup("correct horse battery staple", (async (url, init) => {
      calls.push(String(url));
      expect(init?.headers).toMatchObject({ "Add-Padding": "true" });
      expect(String(url)).not.toContain("horse");
      return new Response(`${request.suffix}:3\n`, { status: 200 });
    }) as typeof fetch);
    expect(calls).toHaveLength(1);
    expect(result.status).toBe("match");
    expect(result.suffixSent).toBe(false);
  });

  it("reaches the live range API with a prefix only", async () => {
    const seen: string[] = [];
    const result = await hibpLookup("password", async (url, init) => {
      seen.push(String(url));
      const response = await fetch(url, init);
      return response;
    });
    expect(seen[0]).toMatch(/\/range\/[0-9A-F]{5}$/);
    expect(seen[0]?.split("/range/")[1]).toMatch(/^[0-9A-F]{5}$/);
    expect(seen[0]?.split("/range/")[1]?.toLowerCase()).not.toContain("password");
    expect(result.status).toBe("match");
    expect(result.count).toBeGreaterThan(0);
    expect(result.paddedLines ?? 0).toBeGreaterThan(100);
  });
});

describe("text, files, dns, origin, eSIM", () => {
  it("explains scam signals without calling pasted text authentic", () => {
    const result = checkText(
      "Your account is suspended. Send the one-time code: https://bit.ly/abc",
      emptyRep(),
    );
    expect(result.verdict).toBe("suspicious_indicators");
    expect(result.evidence.some((item) => item.id === "authenticity")).toBe(true);
    expect(result.summary.toLowerCase()).not.toContain("safe");
  });

  it("flags double extensions and says it is not a scan", async () => {
    const result = await inspectFile("invoice.pdf.exe", new Uint8Array([0x4d, 0x5a, 0, 0]));
    expect(result.notAMalwareScan).toBe(true);
    expect(result.verdict).toBe("suspicious_indicators");
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    const plain = await inspectFile("notes.txt", new TextEncoder().encode("hello"));
    expect(plain.verdict).toBe("no_known_match");
    expect(plain.summary.toLowerCase()).toContain("not a malware scan");
  });

  it("builds a plist Apple can parse and keeps setup wording", () => {
    const profile = buildMobileconfig("quad9", "11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222");
    expect(profile.plist).toContain("com.apple.dnsSettings.managed");
    expect(profile.plist).toContain("https://dns.quad9.net/dns-query");
    expect(profile.plist).toContain("deprecated");
    const dir = mkdtempSync(join(tmpdir(), "nxtl-plist-"));
    const file = join(dir, profile.filename);
    writeFileSync(file, profile.plist);
    const parsed = execFileSync("python3", ["-c", "import plistlib,sys; plistlib.load(open(sys.argv[1],'rb'))", file], { encoding: "utf8" });
    expect(parsed).toBe("");
    const steps = setupBundle("adguard-default");
    expect(steps.android.steps.join("\n")).toContain("Private DNS provider hostname");
    expect(steps.android.steps.join("\n")).toContain("dns.adguard-dns.com");
    expect(steps.android.caveats.join("\n")).toContain("UNVERIFIED");
    expect(steps.windows.steps.join("\n")).toContain("UNVERIFIED");
    expect(steps.windows.steps.join("\n")).toContain("Get-DnsClientDohServerAddress");
    expect(steps.chrome.steps.join("\n")).toContain("Use secure DNS");
    expect(steps.firefox.steps.join("\n")).toContain("UNVERIFIED");
    expect(interpretDnsCheckPaste("quad9", "No, you are NOT using quad9").verdict).toBe("not_verified");
    expect(interpretDnsCheckPaste("quad9", "Yes, you are using quad9").verdict).toBe("verified");
    expect(interpretDnsCheckPaste("adguard-default", "all good").verdict).toBe("inconclusive");
  });

  it("handles Google Maps as the www.google.com origin", () => {
    const maps = originException("https://www.google.com/maps/place/London");
    expect(maps.ok).toBe(true);
    expect(maps.origin).toBe("https://www.google.com");
    expect(maps.pattern).toBe("https://www.google.com/*");
    expect(maps.pattern).not.toContain("*.google.com");
    expect(maps.notes.join(" ")).toContain("does not cover maps.google.com");
    const other = originException("https://maps.google.com/");
    expect(other.origin).toBe("https://maps.google.com");
    expect(other.origin).not.toBe(maps.origin);
  });

  it("explains routing without claiming a VPN connection, and rates need a payload", () => {
    const routing = explainNxtlRouting();
    expect(routing.summary).toContain("London");
    expect(routing.summary.toLowerCase()).not.toContain("vpn connected");
    expect(routing.points.join(" ").toLowerCase()).not.toContain("encrypts your traffic");
    expect(routing.points.join(" ")).not.toContain("no-logs");
    const missing = explainRates("Lithuania", null, null, "offline");
    expect(missing.status).toBe("unavailable");
    expect(missing.minEurPerGb).toBeNull();
    const found = explainRates(
      "lithuania",
      { countries: [{ country: "Lithuania", min_eur: 1.2, max_eur: 1.4, min_display: "€1.20", max_display: "€1.40", networks: 3 }], ledger_currency: "EUR", total: 1 },
      "2026-11-09T00:00:00.000Z",
    );
    expect(found.status).toBe("ok");
    expect(found.currency).toBe("EUR");
    expect(found.unit).toBe("per_gb");
    expect(found.minEurPerGb).toBe(1.2);
  });

  it("publishes 57 Nord rows and distinct statuses", () => {
    expect(nordCapabilities()).toHaveLength(57);
    const ids = nordCapabilities().map((item) => item.id);
    expect(new Set(ids).size).toBe(57);
    for (const item of CAPABILITIES) {
      expect(item.summary.toLowerCase()).not.toContain("full nordvpn parity");
      expect(item.userStatus).toMatch(/works_automatically|needs_setup|needs_native|unsupported|not_built/);
    }
  });
});

describe("sha256 helper", () => {
  it("hashes known bytes", async () => {
    expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
