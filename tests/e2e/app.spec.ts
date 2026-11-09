import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const widths = [320, 360, 390, 430, 1280];

for (const width of widths) {
  for (const theme of ["dark", "light"] as const) {
    test(`layout ${width} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 800 ? 720 : 900 });
      await page.goto("./");
      await page.getByTestId("theme-toggle").selectOption(theme);
      await expect(page.getByRole("heading", { name: "What you can check now" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "What's configured" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "What needs setup" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Data freshness" })).toBeVisible();
      await expect(page.getByTestId("snapshot-version")).toContainText("2026-11-09.1");
      await expect(page.getByTestId("extension-status")).toContainText("not detected");
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
      expect(fits).toBe(true);
      if (width === 320 || width === 1280) {
        const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
        const serious = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
        expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
      }
    });
  }
}

test("checks a link and redacts credentials", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Check a link, message or file" }).click();
  await page.getByTestId("check-input").fill("https://user:s3cr3t-token@totally-unknown.example/path");
  await page.getByTestId("check-run").click();
  await expect(page.getByTestId("verdict")).toContainText("suspicious indicators");
  await expect(page.getByTestId("verdict")).not.toContainText("s3cr3t-token");
});

test("manifest is installable metadata", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:4173/nxtl-shield/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/nxtl-shield/");
  expect(manifest.scope).toBe("/nxtl-shield/");
  expect(manifest.icons.length).toBeGreaterThan(0);
});

test("offline shell after one visit", async ({ page, context }) => {
  await page.goto("./");
  await page.waitForFunction(() => navigator.serviceWorker?.controller);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Check a link before you open it." })).toBeVisible();
  await expect(page.getByTestId("offline-banner")).toBeVisible();
});
