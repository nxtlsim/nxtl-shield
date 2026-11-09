import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const widths = [320, 360, 390, 430, 768, 1024, 1280, 1440];

for (const width of widths) {
  for (const theme of ["dark", "light"] as const) {
    test(`layout ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 800 ? 720 : 900 });
      await page.goto("./");
      await page.getByTestId("theme-toggle").selectOption(theme);

      await expect(page.getByRole("heading", { name: "Check a link before you open it." })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Protection status" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "All protections and tools" })).toBeVisible();

      // Zero horizontal scrollbar on root
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
      expect(fits).toBe(true);

      // Bounding box overflow check: No in-flow element should exceed the viewport
      const overflows = await page.evaluate((vpWidth) => {
        const elements = Array.from(document.querySelectorAll("body *"));
        const bad: string[] = [];
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const style = window.getComputedStyle(el);
            if (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              style.position !== "fixed" &&
              style.position !== "absolute"
            ) {
              if (rect.right > vpWidth + 1.5) {
                bad.push(`${el.tagName}.${el.className} [right: ${Math.round(rect.right)}px > ${vpWidth}px]`);
              }
            }
          }
        }
        return bad.slice(0, 5);
      }, width);
      expect(overflows).toEqual([]);

      // Accessibility audit on 320 and 1280
      if (width === 320 || width === 1280) {
        const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
        const serious = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
        expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
      }
    });
  }
}

test("smart input normalizes domains, full URLs, and text with links", async ({ page }) => {
  await page.goto("./");

  // 1. Bare domain
  await page.getByTestId("check-input").fill("delfi.lt");
  await page.getByTestId("check-run").click();
  await expect(page.getByTestId("verdict")).toBeVisible();

  // 2. www subdomain
  await page.getByTestId("check-input").fill("www.delfi.lt");
  await page.getByTestId("check-run").click();
  await expect(page.getByTestId("verdict")).toBeVisible();

  // 3. Full URL with protocol
  await page.getByTestId("check-input").fill("https://delfi.lt/news");
  await page.getByTestId("check-run").click();
  await expect(page.getByTestId("verdict")).toBeVisible();

  // 4. Sentence containing a link
  await page.getByTestId("check-input").fill("Hey check this out at delfi.lt please");
  await page.getByTestId("check-run").click();
  await expect(page.getByTestId("verdict")).toBeVisible();
});

test("checks a link and redacts credentials", async ({ page }) => {
  await page.goto("./#/check?tab=link");
  await page.getByTestId("check-input").fill("https://user:s3cr3t-token@totally-unknown.example/path");
  await page.getByTestId("check-run").click();
  await expect(page.getByTestId("verdict")).toContainText(/suspicious indicators/i);
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
