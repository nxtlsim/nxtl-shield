import { expect, test } from "@playwright/test";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EXT = join(process.cwd(), "apps/extension/dist-chromium");
const HOST = "blocked.nxtl-shield-test.invalid";

test("chromium extension blocks, allowlists, pauses, cleans, and restores location", async ({ browserName }) => {
  test.setTimeout(180_000);
  test.skip(browserName !== "chromium" || !process.env.DISPLAY, "Needs a display and Chromium so the real extension can load.");
  const server = createServer((req, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/geo") {
      res.end(`<!doctype html><p id="geo">wait</p><script>
        navigator.geolocation.getCurrentPosition(
          (pos) => { document.querySelector('#geo').textContent = 'allowed ' + pos.coords.latitude; },
          (err) => { document.querySelector('#geo').textContent = 'denied ' + err.code; },
          { timeout: 4000 }
        );
      </script>`);
      return;
    }
    res.end(`<!doctype html><p id="body">ORIGIN ${url.search}</p>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  const port = address.port;
  const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "nxtl-ext-")), {
    headless: false,
    geolocation: { latitude: 51.5, longitude: -0.12 },
    permissions: ["geolocation"],
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--load-extension=${EXT}`,
      `--disable-extensions-except=${EXT}`,
      "--disable-features=DisableLoadExtensionCommandLineSwitch",
      "--no-proxy-server",
      `--host-resolver-rules=MAP ${HOST} 127.0.0.1, MAP 007itshop.com 127.0.0.1`,
      "--use-fake-ui-for-media-stream",
    ],
  });

  async function workerOrWait() {
    let [current] = context.serviceWorkers();
    if (!current) current = await context.waitForEvent("serviceworker");
    return current;
  }

  try {
    let worker = (context.serviceWorkers()[0]);
    if (!worker) worker = await context.waitForEvent("serviceworker");
    // worker may restart after DNR updates; use workerOrWait() before later evaluates
    const cdp = await context.newCDPSession(await context.newPage());
    // Threats and trackers are enabled by default on clean install
    const initialRulesets = await worker.evaluate(async () => chrome.declarativeNetRequest.getEnabledRulesets());
    expect(initialRulesets).toContain("threats");
    expect(initialRulesets).toContain("trackers");

    // Toggling trackers off removes it from enabled rulesets; toggling on restores it
    await worker.evaluate(async () => (globalThis as unknown as { nxtlTest: { setToggle: (k: string, e: boolean) => Promise<unknown> } }).nxtlTest.setToggle("trackers", false));
    let rulesetsAfterToggle = await worker.evaluate(async () => chrome.declarativeNetRequest.getEnabledRulesets());
    expect(rulesetsAfterToggle).not.toContain("trackers");
    await worker.evaluate(async () => (globalThis as unknown as { nxtlTest: { setToggle: (k: string, e: boolean) => Promise<unknown> } }).nxtlTest.setToggle("trackers", true));
    rulesetsAfterToggle = await worker.evaluate(async () => chrome.declarativeNetRequest.getEnabledRulesets());
    expect(rulesetsAfterToggle).toContain("trackers");

    const page = await context.newPage();
    await page.goto(`http://${HOST}:${port}/`);
    await expect(page.locator("h1")).toContainText(/test rule/i, { timeout: 10000 });

    await worker.evaluate(async (host) => (globalThis as unknown as { nxtlTest: { allow: (h: string) => Promise<unknown> } }).nxtlTest.allow(host), HOST);
    await page.goto(`http://${HOST}:${port}/again`);
    await expect(page.locator("#body")).toContainText("ORIGIN");
    await worker.evaluate(async (host) => (globalThis as unknown as { nxtlTest: { disallow: (h: string) => Promise<unknown> } }).nxtlTest.disallow(host), HOST);

    const HOST2 = "007itshop.com";
    await worker.evaluate(async (h) => (globalThis as unknown as { nxtlTest: { pauseFor: (ms: number, host?: string) => Promise<unknown> } }).nxtlTest.pauseFor(1500, h), HOST);
    await page.goto(`http://${HOST}:${port}/paused`);
    await expect(page.locator("#body")).toContainText("ORIGIN");

    const page2 = await context.newPage();
    await page2.goto(`http://${HOST2}:${port}/blocked-check`);
    await expect(page2.locator("h1")).toContainText(/test rule|This site is blocked/i);
    await page2.close();

    await page.waitForTimeout(1800);
    await worker.evaluate(async (h) => (globalThis as unknown as { nxtlTest: { status: (host?: string) => Promise<unknown> } }).nxtlTest.status(h), HOST);
    await page.goto(`http://${HOST}:${port}/after`);
    await expect(page.locator("h1")).toContainText(/test rule/i);

    const clean = await context.newPage();
    worker = await workerOrWait();
    await worker.evaluate(async () => (globalThis as unknown as { nxtlTest: { enableBlocking: () => Promise<unknown> } }).nxtlTest.enableBlocking());
    await worker.evaluate(async () =>
      (globalThis as unknown as { nxtlTest: { setToggle: (k: string, e: boolean) => Promise<unknown> } }).nxtlTest.setToggle("cleaning", true),
    );
    await clean.goto(`http://127.0.0.1:${port}/landing?utm_source=newsletter&keep=1`);
    await expect(clean).toHaveURL(/keep=1/);
    expect(clean.url()).not.toContain("utm_source");
    await clean.goto(`http://127.0.0.1:${port}/signed?utm_source=newsletter&signature=abc&keep=1`);
    expect(clean.url()).toContain("signature=abc");
    expect(clean.url()).toContain("utm_source");

    worker = await workerOrWait();
    const geoOrigin = `http://127.0.0.1:${port}`;
    // Playwright can grant geolocation for automation; assert the extension's content-settings engine instead.
    await worker.evaluate(async () => (globalThis as unknown as { nxtlTest: { locationBlock: () => Promise<unknown> } }).nxtlTest.locationBlock());
    let settings = await worker.evaluate(async (origin) => {
      const api =
        chrome.contentSettings.geolocation ??
        (chrome.contentSettings as unknown as { location: typeof chrome.contentSettings.geolocation }).location;
      return {
        example: (await api.get({ primaryUrl: "https://example.com/" })).setting,
        local: (await api.get({ primaryUrl: origin + "/geo" })).setting,
      };
    }, geoOrigin);
    expect(settings.example).toBe("block");
    expect(settings.local).toBe("block");
    await worker.evaluate(async (origin) => {
      return (globalThis as unknown as { nxtlTest: { locationException: (u: string, s: "allow") => Promise<unknown> } }).nxtlTest.locationException(origin, "allow");
    }, `${geoOrigin}/geo`);
    settings = await worker.evaluate(async (origin) => {
      const api =
        chrome.contentSettings.geolocation ??
        (chrome.contentSettings as unknown as { location: typeof chrome.contentSettings.geolocation }).location;
      return {
        example: (await api.get({ primaryUrl: "https://example.com/" })).setting,
        local: (await api.get({ primaryUrl: origin + "/geo" })).setting,
      };
    }, geoOrigin);
    expect(settings.local).toBe("allow");
    expect(settings.example).toBe("block");
    const maps = await worker.evaluate(async () => {
      const api =
        chrome.contentSettings.geolocation ??
        (chrome.contentSettings as unknown as { location: typeof chrome.contentSettings.geolocation }).location;
      const result = await (globalThis as unknown as { nxtlTest: { locationException: (u: string, s: "ask") => Promise<{ originPattern?: string }> } }).nxtlTest.locationException(
        "https://www.google.com/maps/place/London",
        "ask",
      );
      const blocked = await api.get({ primaryUrl: "https://maps.google.com/" });
      const allowed = await api.get({ primaryUrl: "https://www.google.com/maps" });
      return { pattern: result.originPattern, mapsGoogle: blocked.setting, www: allowed.setting };
    });
    expect(maps.pattern).toBe("https://www.google.com/*");
    expect(maps.www).toBe("ask");
    expect(maps.mapsGoogle).toBe("block");
    await worker.evaluate(async () => (globalThis as unknown as { nxtlTest: { locationRestore: () => Promise<unknown> } }).nxtlTest.locationRestore());
    const restored = await worker.evaluate(async () => {
      const api =
        chrome.contentSettings.geolocation ??
        (chrome.contentSettings as unknown as { location: typeof chrome.contentSettings.geolocation }).location;
      return (await api.get({ primaryUrl: "https://example.com/" })).setting;
    });
    expect(restored).not.toBe("block");

  } finally {
    await context.close();
    server.close();
  }
});

test("manifests have isolated background keys for Chromium and Firefox", () => {
  const ch = JSON.parse(readFileSync(join(process.cwd(), "apps/extension/dist-chromium/manifest.json"), "utf8"));
  const ff = JSON.parse(readFileSync(join(process.cwd(), "apps/extension/dist-firefox/manifest.json"), "utf8"));
  expect(ch.background.service_worker).toBe("background.js");
  expect(ch.background.scripts).toBeUndefined();
  expect(ff.background.scripts).toEqual(["background.js"]);
  expect(ff.background.service_worker).toBeUndefined();
  expect(ff.browser_specific_settings.gecko.id).toBe("shield@nxtlsim.com");
  expect(ff.browser_specific_settings.gecko.strict_min_version).toBe("115.0");
});

test("tracker rules include major ad networks with block action", () => {
  const trackers = JSON.parse(readFileSync(join(process.cwd(), "apps/extension/dist-chromium/rules/trackers.json"), "utf8"));
  const dc = trackers.find((r: any) => r.condition?.urlFilter === "||doubleclick.net^");
  const gs = trackers.find((r: any) => r.condition?.urlFilter === "||googlesyndication.com^");
  expect(dc?.action?.type).toBe("block");
  expect(gs?.action?.type).toBe("block");
});

test("popup displays Safe DNS status, tools, and on-device check verdicts", async ({ browserName }) => {
  test.skip(browserName !== "chromium" || !process.env.DISPLAY, "Needs a display and Chromium.");
  const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "nxtl-popup-")), {
    headless: false,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--load-extension=${EXT}`,
      `--disable-extensions-except=${EXT}`,
      "--disable-features=DisableLoadExtensionCommandLineSwitch",
      "--no-proxy-server",
    ],
  });

  try {
    const popup = await context.newPage();
    await popup.goto("chrome-extension://aihdikogmaekjmanjhdmeanhhfhiblmm/popup.html");
    await expect(popup.locator(".brand-lockup")).toContainText("Shield");
    await expect(popup.locator(".brand-lockup")).not.toContainText("NXTL");

    // Safe DNS status is shown
    await expect(popup.locator("#dns-text")).toBeVisible();
    await expect(popup.locator("#dns-text")).not.toHaveText("Checking...", { timeout: 10000 });
    const dnsText = await popup.locator("#dns-text").textContent();
    expect(["Off", "Could not check", "On"]).toContain(dnsText?.trim());

    // Check lottery-style text
    await popup.locator("#quick-check-input").fill("Congratulations! You won the lottery! Claim your cash prize immediately.");
    await popup.locator("#quick-check-btn").click();
    await expect(popup.locator("#quick-check-result")).toBeVisible();
    await expect(popup.locator("#check-badge-text")).toContainText("Likely scam");

    // Check safe URL
    await popup.locator("#quick-check-input").fill("https://nxtlsim.com");
    await popup.locator("#quick-check-btn").click();
    await expect(popup.locator("#check-badge-text")).toContainText("Looks safe");

    // Tool links present
    const checkLink = popup.locator('.tools-menu a[href="https://nxtlsim.github.io/nxtl-shield/#/check"]');
    const msgLink = popup.locator('.tools-menu a[href="https://nxtlsim.github.io/nxtl-shield/#/messages"]');
    const dnsLink = popup.locator('.tools-menu a[href="https://nxtlsim.github.io/nxtl-shield/#/setup"]');
    await expect(checkLink).toBeVisible();
    await expect(msgLink).toBeVisible();
    await expect(dnsLink).toBeVisible();
  } finally {
    await context.close();
  }
});
