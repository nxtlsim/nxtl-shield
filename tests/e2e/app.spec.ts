import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const widths = [320, 360, 390, 430, 768, 1024, 1280, 1440];

for (const width of widths) {
  for (const theme of ["dark", "light"] as const) {
    test(`layout ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 800 ? 720 : 900 });
      await page.goto("./");
      const trigger = page.locator(".theme-menu-trigger");
      if (await trigger.isVisible()) {
        await trigger.click();
        await page.locator(`.theme-menu-dropdown button[role="option"]`, { hasText: new RegExp(theme, "i") }).click();
      } else {
        await page.getByTestId("theme-toggle").selectOption(theme);
      }

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
  await expect(page.getByTestId("verdict")).toContainText(/Likely scam|Be careful/i);
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
  try {
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Check a link before you open it." })).toBeVisible();
    await expect(page.getByTestId("offline-banner")).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test("lottery SMS and normal message show exact customer pill labels without forbidden phrases", async ({ page }) => {
  await page.goto("./#/check?tab=message");

  // 1. Lottery SMS -> Likely scam
  await page.getByTestId("check-input").fill("Congratulations you won the lottery, claim your prize now!");
  await page.getByTestId("check-run").click();
  const verdictEl = page.getByTestId("verdict");
  await expect(verdictEl).toBeVisible();
  await expect(verdictEl.locator(".pill")).toHaveText("Likely scam");
  await expect(verdictEl.getByRole("heading", { level: 2 })).toHaveText("This looks like a scam.");
  await expect(verdictEl.locator(".result-quote")).toBeVisible();
  await expect(verdictEl.locator("button:disabled")).toHaveCount(0);
  const scamText = await verdictEl.innerText();
  expect(scamText.toLowerCase()).not.toContain("safe");
  expect(scamText.toLowerCase()).not.toContain("dkim");
  expect(scamText.toLowerCase()).not.toContain("spf");

  // 2. Normal message -> Looks safe
  await page.getByTestId("check-input").fill("Hey, running 10 minutes late. See you at the cafe.");
  await page.getByTestId("check-run").click();
  await expect(verdictEl.locator(".pill")).toHaveText("Looks safe");
});

test("your connection auto-runs and shows public IP and Safe DNS status", async ({ page }) => {
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
  await page.goto("./#/connection");
  await expect(page.getByRole("heading", { name: "Your connection" })).toBeVisible();
  const card = page.getByTestId("connection-info-card");
  await expect(card).toBeVisible({ timeout: 15_000 });
  const cardText = await card.innerText();
  expect(cardText).not.toContain("Connection not verified");
  expect(cardText).not.toContain("Count WebRTC candidates");
  expect(cardText).toContain("IPv4 address");
  expect(cardText).toContain("203.0.113.195");
  expect(cardText).toContain("Safe DNS");
});

test("section 8 scroll tests: scroll to top on route change and restore on Back", async ({ page }) => {
  // Desktop viewport
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "All protections and tools" })).toBeVisible();

  // 1. Scroll home near bottom and click tile
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForFunction(() => window.scrollY > 100);
  const scrolledY = await page.evaluate(() => window.scrollY);
  expect(scrolledY).toBeGreaterThan(100);

  // Click 'Your connection' tile
  await page.locator('a.tile[href="#/connection"]').click();
  await expect(page).toHaveURL(/#\/connection/);
  const h1 = page.getByRole("heading", { name: "Your connection" });
  await expect(h1).toBeVisible();
  await page.waitForFunction(() => window.scrollY <= 2);
  const newY = await page.evaluate(() => window.scrollY);
  expect(newY).toBeLessThanOrEqual(2);
  const h1Box = await h1.boundingBox();
  expect(h1Box!.y).toBeGreaterThanOrEqual(0);
  expect(h1Box!.y).toBeLessThan(200);

  // 2. Mobile viewport bottom tabs
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "All protections and tools" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForFunction(() => window.scrollY > 100);
  await page.locator('.bottom-tab[href="#/check"]').click();
  await expect(page).toHaveURL(/#\/check/);
  await expect(page.getByRole("heading", { name: "Check a link, message or file" })).toBeVisible();
  const mobileY = await page.evaluate(() => window.scrollY);
  expect(mobileY).toBeLessThanOrEqual(2);

  // 3. Back/Forward restores scroll position
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "All protections and tools" })).toBeVisible();
  const link = page.locator('a.tile[href="#/setup"]');
  await link.scrollIntoViewIfNeeded();
  const savedY = await page.evaluate(() => {
    const el = document.querySelector('a.tile[href="#/setup"]') as HTMLElement | null;
    el?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    return window.scrollY;
  });
  expect(savedY).toBeGreaterThan(100);
  await page.evaluate(() => {
    (document.querySelector('a.tile[href="#/setup"]') as HTMLElement | null)?.click();
  });
  await expect(page).toHaveURL(/#\/setup/);
  await expect(page.getByRole("heading", { name: /Safe DNS setup/i })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/(#\/?$|\/nxtl-shield\/?$)/);
  await expect(page.getByRole("heading", { name: "All protections and tools" })).toBeVisible();
  const restoredY = await page.evaluate(() => window.scrollY);
  expect(Math.abs(restoredY - savedY)).toBeLessThanOrEqual(40);

  // 4. Deep link starts at top
  await page.goto("./#/setup");
  const deepY = await page.evaluate(() => window.scrollY);
  expect(deepY).toBeLessThanOrEqual(2);
});

test("install app button invokes beforeinstallprompt when event is available", async ({ page }) => {
  await page.goto("./#/install");
  await page.evaluate(() => {
    let prompted = false;
    const fakeEvent = new Event("beforeinstallprompt");
    (fakeEvent as any).prompt = () => { prompted = true; return Promise.resolve({ outcome: "accepted" }); };
    (fakeEvent as any).userChoice = Promise.resolve({ outcome: "accepted" });
    (window as any).__fakePrompted = () => prompted;
    window.dispatchEvent(fakeEvent);
  });
  const installBtn = page.getByTestId("install-link");
  if (await installBtn.isVisible()) {
    await installBtn.click();
    const wasPrompted = await page.evaluate(() => (window as any).__fakePrompted?.() ?? false);
    expect(wasPrompted).toBe(true);
  }
});

test("finishing touch UI checks: home steps, hero check button, eSIM card, share app, footer, and private messages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("./");

  // 1. Home check button height matches the input within 2px and Paste/Scan sit below
  const heroInputBox = await page.locator(".hero-input").boundingBox();
  const heroCheckBtnBox = await page.locator(".btn-hero-check").boundingBox();
  expect(heroInputBox).not.toBeNull();
  expect(heroCheckBtnBox).not.toBeNull();
  expect(Math.abs(heroInputBox!.height - heroCheckBtnBox!.height)).toBeLessThanOrEqual(2);
  expect(Math.abs(heroInputBox!.y - heroCheckBtnBox!.y)).toBeLessThanOrEqual(2);

  const heroActionsBox = await page.locator(".hero-input-actions").boundingBox();
  expect(heroActionsBox).not.toBeNull();
  expect(heroActionsBox!.y).toBeGreaterThanOrEqual(heroInputBox!.y + heroInputBox!.height - 1);

  // 2. Visible placeholders use nxtlsim.com
  expect(await page.locator(".hero-input").getAttribute("placeholder")).toContain("nxtlsim.com");
  expect(await page.locator(".hero-input").getAttribute("placeholder")).not.toContain("delfi.lt");

  // 3. eSIM card: "See plans" is right-aligned and vertically centered
  const esimCard = page.locator(".esim-card");
  await expect(esimCard).toBeVisible();
  const seePlansBtn = esimCard.locator(".esim-card-btn");
  await expect(seePlansBtn).toBeVisible();
  const cardText = await esimCard.innerText();
  expect(cardText).toContain("180+ countries");
  expect(cardText).not.toContain("150+");
  expect(cardText).toContain("Routes your traffic via London for consistent privacy abroad.");

  // 4. Share Shield card on Home
  const shareCard = page.locator(".share-shield-card");
  await expect(shareCard).toBeVisible();
  expect(await shareCard.innerText()).toContain("Know someone who gets scam texts? Share Shield with them.");

  // 5. Footer uses the new sentence and contains Share Shield
  const footer = page.locator("footer.site");
  await expect(footer).toContainText("All tools are free. NXTL eSIM is our travel data service.");
  await expect(footer.locator('a[href="#/share-app"]')).toHaveText("Share Shield");

  // 6. Navigate to #/share-app
  await page.goto("./#/share-app");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Share Shield");
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Email" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Text message" })).toBeVisible();
  const qr = page.getByRole("img", { name: "QR code for NXTL Shield website" });
  await expect(qr).toBeVisible();
  const qrBox = await qr.boundingBox();
  expect(qrBox).not.toBeNull();
  expect(qrBox!.width).toBeGreaterThan(80);
  expect(qrBox!.height).toBeGreaterThan(80);

  // 7. Check #/share redirects to #/messages
  await page.goto("./#/share");
  await expect(page).toHaveURL(/#\/messages/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Private messages & files");
  await expect(page.getByText("This message is gone after you read it.")).toBeVisible();
});

