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
    });
    const page = await context.newPage();
    const url = hash ? `${BASE_URL}#/${hash}` : BASE_URL;
    await page.goto(url);
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
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, filename) });
    await context.close();
  }

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      console.log(`Capturing ${vp.name}px in ${theme} mode...`);

      // 1. Home
      await takeShot(vp, theme, "", `home-${vp.name}-${theme}.png`, async (page) => {
        await page.waitForSelector(".tiles-grid");
      });

      // 2. Check result
      await takeShot(vp, theme, "check", `check-result-${vp.name}-${theme}.png`, async (page) => {
        await page.waitForSelector('[data-testid="check-input"]');
        await page.getByTestId("check-input").fill("https://verify-fake-login.example.com/login");
        await page.getByTestId("check-run").click();
        await page.waitForSelector('[data-testid="verdict"]');
      });

      // 3. Secure Share
      await takeShot(vp, theme, "share", `share-${vp.name}-${theme}.png`, async (page) => {
        await page.waitForSelector('[data-testid="share-input"]');
        await page.getByTestId("share-input").fill("Confidential API keys and private backup codes");
        await page.getByTestId("share-password").fill("SuperSecretSharedPass123!");
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
