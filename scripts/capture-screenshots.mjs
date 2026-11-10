import { chromium } from "playwright";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const OUT_DIR = join(process.cwd(), "docs/screenshots");
if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

const BASE_URL = "http://127.0.0.1:4173/nxtl-shield/";
const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "1280", width: 1280, height: 900 },
];
const THEMES = ["dark", "light"];

async function main() {
  const browser = await chromium.launch();

  async function takeShot(vp, theme, hash, filename, action) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      serviceWorkers: "block",
    });
    await context.setOffline(false);
    const page = await context.newPage();
    await page.route(/ipwho\.is/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ip: "203.0.113.195",
          type: "IPv4",
          country: "United Kingdom",
          country_code: "GB",
          city: "London",
          flag: { emoji: "🇬🇧" },
          connection: { org: "NXTL Network", asn: 12345 },
        }),
      })
    );
    const url = hash ? `${BASE_URL}#/${hash}` : BASE_URL;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate((th) => {
      localStorage.setItem("nxtl-shield-theme", th);
      const dark = th === "dark" || (th !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      document.documentElement.setAttribute("data-theme-choice", th);
    }, theme);
    if (action) {
      await action(page);
    } else {
      await page.waitForSelector("main > div");
    }
    await page.evaluate(() => {
      const banner = document.querySelector('[data-testid="offline-banner"]');
      if (banner) banner.hidden = true;
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, filename), fullPage: false });
    await context.close();
  }

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      console.log(`Capturing ${vp.name}px in ${theme} mode...`);

      // 1. Home
      await takeShot(vp, theme, "", `home-${vp.name}-${theme}.png`, async (page) => {
        await page.waitForSelector(".tiles-grid");
      });

      // 2. Check result — lottery SMS, Likely scam (the customer-facing verdict)
      await takeShot(vp, theme, "check?tab=message", `check-result-${vp.name}-${theme}.png`, async (page) => {
        await page.waitForSelector('[data-testid="check-input"]');
        await page.getByTestId("check-input").fill("Congratulations you won the lottery, claim your prize now!");
        await page.getByTestId("check-run").click();
        await page.waitForSelector('[data-testid="verdict"]');
        await page.getByTestId("verdict").scrollIntoViewIfNeeded();
      });

      // 3. Private messages & files
      await takeShot(vp, theme, "messages", `share-${vp.name}-${theme}.png`, async (page) => {
        await page.waitForSelector('[data-testid="share-input"]');
        await page.getByTestId("share-input").fill("Confidential API keys and private backup codes");
        await page.getByTestId("share-password").fill("SuperSecretSharedPass123!");
        await page.evaluate(() => {
          if (document.activeElement) document.activeElement.blur();
          const form = document.querySelector('[data-testid="share-input"]')?.closest(".card");
          const headerH = document.querySelector("header")?.getBoundingClientRect().height || 64;
          if (form) {
            const y = form.getBoundingClientRect().top + window.scrollY - headerH - 8;
            window.scrollTo(0, Math.max(0, y));
          }
        });
      });

      // 4. Phone Protect
      await takeShot(vp, theme, "phone-protection", `phone-protect-${vp.name}-${theme}.png`, async (page) => {
        await page.waitForSelector("h1:has-text('Protect your phone')");
      });

      // 5. Ad Blocker
      await takeShot(vp, theme, "ad-blocker", `ad-blocker-${vp.name}-${theme}.png`, async (page) => {
        await page.waitForSelector("h1:has-text('Ad & tracker blocker')");
      });

      // 6. Browser Extension page
      await takeShot(vp, theme, "extension", `extension-page-${vp.name}-${theme}.png`, async (page) => {
        await page.waitForSelector("h1:has-text('Browser extension')");
      });

      // 7. Your connection
      await takeShot(vp, theme, "connection", `connection-${vp.name}-${theme}.png`, async (page) => {
        await page.waitForSelector("h1:has-text('Your connection')");
        const card = page.locator('[data-testid="connection-info-card"]');
        await card.waitFor({ timeout: 20000 });
        await page.evaluate(() => {
          const card = document.querySelector('[data-testid="connection-info-card"]');
          const headerH = document.querySelector("header")?.getBoundingClientRect().height || 64;
          if (card) {
            const y = card.getBoundingClientRect().top + window.scrollY - headerH - 12;
            window.scrollTo(0, Math.max(0, y));
          }
        });
      });

      // 8. Safe DNS Setup
      await takeShot(vp, theme, "setup", `setup-${vp.name}-${theme}.png`, async (page) => {
        await page.waitForSelector("h1:has-text('Safe DNS')");
        const tabName = vp.name === "390" ? "iPhone & iPad" : "Windows";
        await page.getByRole("tab", { name: tabName }).click();
        const cta = vp.name === "390"
          ? page.getByRole("link", { name: /profile|mobileconfig|Download/i }).first()
          : page.getByRole("link", { name: "Download Windows setup (.cmd)" });
        await cta.waitFor();
        await page.evaluate(() => {
          const tabs = document.querySelector(".tab-btn")?.closest('[role="tablist"]') || document.querySelector(".tab-btn");
          const headerH = document.querySelector("header")?.getBoundingClientRect().height || 64;
          if (tabs) {
            const y = tabs.getBoundingClientRect().top + window.scrollY - headerH - 16;
            window.scrollTo(0, Math.max(0, y));
          }
        });
      });
    }
  }

  // 7. Extension Popup
  for (const theme of THEMES) {
    const page = await browser.newPage({ viewport: { width: 360, height: 500 } });
    const popupPath = pathToFileURL(join(process.cwd(), "apps/extension/dist-chromium/popup.html")).href;
    await page.goto(popupPath);
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
    }, theme);
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, `extension-popup-${theme}.png`) });
    await page.close();
  }

  await browser.close();
  console.log("All screenshots captured successfully in docs/screenshots!");
}

main().catch((err) => {
  console.error("Failed to capture screenshots:", err);
  process.exit(1);
});
