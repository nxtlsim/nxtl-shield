import { describe, expect, it } from "vitest";
import { checkText, checkUrl, findLookalike, isOfficialHost } from "../src/index";
import type { Reputation } from "../src/url/check";

const rep = (): Reputation => ({
  badware: new Map(),
  tif: new Set(),
  trackers: new Set(),
  available: true,
  stale: false,
  version: "test",
  retrieved: "2026-11-24",
});

const OWN = [
  "nxtlsim.com",
  "www.nxtlsim.com",
  "nxtlsim.github.io",
  "NXTLSIM.GITHUB.IO.",
  "nxtlsim.github.io:443",
  "nxtl-esim-nxtl-shield.static.hf.space",
  "nxtl-esim-trip-data-budget.hf.space",
  "nxtl-shield-relay.dagys-mantas.workers.dev",
];

const FAKES: Array<[string, string]> = [
  ["nxtlsim-esim.com", "nxtlsim.com"],
  ["nxt1sim.com", "nxtlsim.com"],
  ["nxtls1m.com", "nxtlsim.com"],
  ["nxxlsim.com", "nxtlsim.com"],
  ["nxtlsim.net", "nxtlsim.com"],
  ["nxtlsim.com.evil.io", "nxtlsim.com"],
  ["login.nxtlsim.com.evil.io", "nxtlsim.com"],
  ["nxtlsim.github.io.evil.com", "nxtlsim.com"],
  ["nxtlsim-fake.github.io", "nxtlsim.com"],
  ["nxtl-sim.com", "nxtlsim.com"],
  ["g00gle.com", "google.com"],
  ["paypal-login.com", "paypal.com"],
  ["paypal.com.secure-check.net", "paypal.com"],
];

describe("official hosts", () => {
  it("matches our own hosts by exact name or real subdomain", () => {
    for (const host of OWN) expect(isOfficialHost(host), host).toBe(true);
  });

  it("never matches by substring or prefix", () => {
    for (const host of [
      "nxtlsim.com.evil.io",
      "evilnxtlsim.com",
      "nxtlsim.github.io.evil.com",
      "nxtlsim-fake.github.io",
      "fakenxtlsim.github.io",
      "github.io",
      "nxtl-esim-nxtl-shield.static.hf.space.evil.com",
      "x-nxtl-shield-relay.dagys-mantas.workers.dev",
    ]) {
      expect(isOfficialHost(host), host).toBe(false);
    }
  });
});

describe("findLookalike", () => {
  it("does not flag our own hosts", () => {
    for (const host of OWN) expect(findLookalike(host), host).toBeNull();
  });

  it("does not flag ordinary or genuine sites", () => {
    for (const host of [
      "expo.dev",
      "github.com",
      "huggingface.co",
      "google.com",
      "google.de",
      "maps.google.co.jp",
      "amazon.co.uk",
      "apple.stackexchange.com",
      "accounts.google.com",
      "example.com",
      "localhost",
      "127.0.0.1",
    ]) {
      expect(findLookalike(host), host).toBeNull();
    }
  });

  it("still catches real fakes", () => {
    for (const [host, genuine] of FAKES) expect(findLookalike(host), host).toBe(genuine);
  });
});

describe("checkUrl with official hosts and lookalikes", () => {
  const exampleCheck =
    "https://nxtlsim.github.io/nxtl-shield/#/check?url=https%3A%2F%2Fexpo.dev%2Faccounts%2Fmant4s%2Fprojects%2Fnxtl-mobile%2Fbuilds%2Ff9c34750-86b9-451a-bf5f-ce40dd721257";

  it("treats our own pages as safe", () => {
    for (const url of [
      exampleCheck,
      "https://nxtlsim.com/",
      "https://nxtl-esim-nxtl-shield.static.hf.space/#/check",
      "https://expo.dev/accounts/mant4s/projects/nxtl-mobile/builds/f9c34750-86b9-451a-bf5f-ce40dd721257",
    ]) {
      const result = checkUrl(url, rep());
      expect(result.evidence.find((e) => e.id === "misleading-host"), url).toBeUndefined();
      expect(result.level, url).toBe("safe");
    }
  });

  it("does not flag a link only because the query mentions a lookalike", () => {
    for (const url of [
      "https://example.com/?next=nxtlsim-esim.com",
      "https://example.com/search?q=nxt1sim.com&ref=paypal-login.com",
      "https://expo.dev/?u=https%3A%2F%2Fnxtlsim.com.evil.io%2F",
    ]) {
      const result = checkUrl(url, rep());
      expect(result.evidence.find((e) => e.id === "misleading-host"), url).toBeUndefined();
      expect(result.level, url).toBe("safe");
    }
  });

  it("flags fake hosts as a likely scam", () => {
    for (const [host] of FAKES) {
      const result = checkUrl(`https://${host}/login`, rep());
      expect(result.evidence.some((e) => e.id === "misleading-host"), host).toBe(true);
      expect(result.level, host).toBe("scam");
    }
  });

  it("keeps flagging a lottery SMS with a fake link", () => {
    const result = checkText("Congratulations! You won the lottery. Claim your prize now at https://nxt1sim.com/claim", rep());
    expect(result.verdict).toBe("suspicious_indicators");
  });
});
