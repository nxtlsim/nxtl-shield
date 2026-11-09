import { expect, test } from "@playwright/test";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
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
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      `--host-resolver-rules=MAP ${HOST} 127.0.0.1`,
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
    await cdp.send("Emulation.setGeolocationOverride", { latitude: 51.5, longitude: -0.12, accuracy: 10 });
    await worker.evaluate(async () => (globalThis as unknown as { nxtlTest: { enableBlocking: () => Promise<unknown> } }).nxtlTest.enableBlocking());

    const page = await context.newPage();
    await page.goto(`http://${HOST}:${port}/`);
    await expect(page.locator("h1")).toContainText(/test rule/i, { timeout: 10000 });

    await worker.evaluate(async (host) => (globalThis as unknown as { nxtlTest: { allow: (h: string) => Promise<unknown> } }).nxtlTest.allow(host), HOST);
    await page.goto(`http://${HOST}:${port}/again`);
    await expect(page.locator("#body")).toContainText("ORIGIN");
    await worker.evaluate(async (host) => (globalThis as unknown as { nxtlTest: { disallow: (h: string) => Promise<unknown> } }).nxtlTest.disallow(host), HOST);

    await worker.evaluate(async () => (globalThis as unknown as { nxtlTest: { pauseFor: (ms: number) => Promise<unknown> } }).nxtlTest.pauseFor(1500));
    await page.goto(`http://${HOST}:${port}/paused`);
    await expect(page.locator("#body")).toContainText("ORIGIN");
    await page.waitForTimeout(1800);
    await worker.evaluate(async () => (globalThis as unknown as { nxtlTest: { status: () => Promise<unknown> } }).nxtlTest.status());
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
