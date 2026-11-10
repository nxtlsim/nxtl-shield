import { expect, test, chromium, firefox, webkit } from "@playwright/test";

test("encrypts locally and does not store or send the secret", async ({ page }) => {
  const seen: string[] = [];
  page.on("request", (request) => seen.push(`${request.url()} ${request.postData() ?? ""}`));
  await page.goto("./#/share");
  await page.getByTestId("share-input").fill("synthetic plaintext message");
  await page.getByTestId("share-password").fill("synthetic-password");
  await page.getByTestId("share-run").click();
  await expect(page.getByTestId("share-status")).toContainText("Encrypted on this device", { timeout: 30_000 });
  const armored = await page.getByTestId("share-output").inputValue();
  expect(armored).toContain("BEGIN PGP MESSAGE");
  expect(page.url()).not.toContain("synthetic-password");
  expect(page.url()).not.toContain("synthetic plaintext");
  const stored = await page.evaluate(() => ({
    local: JSON.stringify(localStorage),
    href: location.href,
  }));
  expect(stored.local).not.toContain("synthetic-password");
  expect(stored.local).not.toContain("synthetic plaintext");
  expect(stored.href).not.toContain("synthetic-password");
  const joined = seen.join("\n");
  expect(joined).not.toContain("synthetic-password");
  expect(joined).not.toContain("synthetic plaintext");
  await page.getByTestId("share-input").fill(armored);
  await page.getByRole("button", { name: "Decrypt" }).click();
  await page.getByTestId("share-run").click();
  await expect(page.getByTestId("share-status")).toContainText("Decrypted on this device");
  await expect(page.getByTestId("share-output")).toHaveValue("synthetic plaintext message");
});

test("copy and share report failure without a success message", async ({ page }) => {
  await page.goto("./#/share");
  await page.getByTestId("share-input").fill("hello");
  await page.getByTestId("share-password").fill("synthetic-password");
  await page.getByTestId("share-run").click();
  await expect(page.getByTestId("share-status")).toContainText("Encrypted on this device", { timeout: 30_000 });
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) }, configurable: true });
    Object.defineProperty(navigator, "share", {
      value: () => Promise.reject(Object.assign(new Error("cancel"), { name: "AbortError" })),
      configurable: true,
    });
  });
  await page.getByTestId("share-copy").click();
  await expect(page.getByTestId("share-status")).toContainText("clipboard refused");
  await expect(page.getByTestId("share-status")).not.toContainText("Copied");
  await page.getByTestId("share-share").click();
  await expect(page.getByTestId("share-status")).not.toContainText("finished");
});

test("ciphertext from Chromium decrypts in Firefox and WebKit", async ({ browserName }) => {
  test.skip(browserName !== "chromium", "This test opens the other browsers itself.");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4173/nxtl-shield/#/share");
  await page.getByTestId("share-input").fill("cross-browser secret text");
  await page.getByTestId("share-password").fill("cross-browser-password");
  await page.getByTestId("share-run").click();
  await expect(page.getByTestId("share-status")).toContainText("Encrypted on this device", { timeout: 30_000 });
  const armored = await page.getByTestId("share-output").inputValue();
  await browser.close();

  for (const engine of [firefox, webkit]) {
    let other;
    try {
      other = await engine.launch();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (engine === webkit && /missing dependencies|Host system is missing/i.test(message)) {
        test.info().annotations.push({ type: "note", description: "WebKit skipped: host libraries missing" });
        continue;
      }
      throw error;
    }
    const tab = await other.newPage();
    await tab.goto("http://127.0.0.1:4173/nxtl-shield/#/share");
    await tab.getByRole("button", { name: "Decrypt" }).click();
    await tab.getByTestId("share-input").fill(armored);
    await tab.getByTestId("share-password").fill("cross-browser-password");
    await tab.getByTestId("share-run").click();
    await expect(tab.getByTestId("share-status")).toContainText("Decrypted on this device", { timeout: 30_000 });
    await expect(tab.getByTestId("share-output")).toHaveValue("cross-browser secret text");
    await other.close();
  }
});

test("file dropzone layout, hidden file input, and clean password hint", async ({ page }) => {
  await page.goto("./#/share");

  // 1. input[type=file] is not visible / is sr-only
  const fileInput = page.locator('input[type="file"]');
  const box = await fileInput.boundingBox();
  expect(box === null || box.width <= 1 || box.height <= 1).toBe(true);

  // 2. Page text must not contain native file chooser text
  const bodyText = await page.innerText("body");
  expect(bodyText).not.toContain("Choose File");
  expect(bodyText).not.toContain("No file chosen");

  // 3. Drop zone title and hint have vertical gap >= 6px and do not overlap
  const titleBox = await page.locator(".file-drop-title").boundingBox();
  const hintBox = await page.locator(".file-drop-hint").boundingBox();
  expect(titleBox).not.toBeNull();
  expect(hintBox).not.toBeNull();
  const gap = hintBox!.y - (titleBox!.y + titleBox!.height);
  expect(gap).toBeGreaterThanOrEqual(6);

  // 4. Password hint does not mention other consumer brands (Signal, WhatsApp)
  const fullHtml = await page.content();
  expect(fullHtml).not.toContain("Signal");
  expect(fullHtml).not.toContain("WhatsApp");
});

test("private read-once link creates, opens once, clears key from URL, and second open shows expired", async ({ page, context }) => {
  await page.goto("./#/messages");

  // Fill in confidential message
  const input = page.getByTestId("share-input");
  await input.fill("Top secret meeting at dawn");

  // Create private link
  const createBtn = page.getByRole("button", { name: "Create a private link" });
  await createBtn.click();

  // Wait for link ready
  await expect(page.getByRole("heading", { name: "Private link ready" })).toBeVisible({ timeout: 15_000 });
  const linkInput = page.locator(".card input.mono");
  const linkUrl = await linkInput.inputValue();
  expect(linkUrl).toContain("#/messages/open/");
  expect(linkUrl).toContain("&k=");

  // Open the link in a second page
  const recipientPage = await context.newPage();
  await recipientPage.goto(linkUrl);

  await expect(recipientPage.getByRole("heading", { name: "You have a private message" })).toBeVisible();
  const tapBtn = recipientPage.getByRole("button", { name: "Tap to open" });
  await expect(tapBtn).toBeVisible();

  // Tap to open
  await tapBtn.click();

  // Verify message is shown
  await expect(recipientPage.getByRole("heading", { name: "Private message" })).toBeVisible({ timeout: 15_000 });
  await expect(recipientPage.locator("textarea.mono")).toHaveValue("Top secret meeting at dawn");
  await expect(recipientPage.locator(".lede")).toHaveText("This message is gone after you read it.");

  // Address bar cleared of key/salt via replaceState
  expect(recipientPage.url()).not.toContain("&k=");
  expect(recipientPage.url()).toMatch(/#\/messages$/);

  // Opening the same original link URL in a third tab returns already opened or expired
  const thirdPage = await context.newPage();
  await thirdPage.goto(linkUrl);
  await expect(thirdPage.getByText("This message was already opened or has expired.")).toBeVisible({ timeout: 15_000 });

  await recipientPage.close();
  await thirdPage.close();
});

