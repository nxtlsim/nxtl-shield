import { expect, test } from "@playwright/test";

test("file picker shows Remove only after a file or image is chosen", async ({ page }) => {
  // 1. Open #/check?tab=file. Assert no button named Remove is visible. Assert the drop zone is visible.
  await page.goto("./#/check?tab=file");
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
  await expect(page.locator(".file-drop")).toBeVisible();

  // Test clicking Inspect file without a file shows banner
  await page.getByTestId("check-run").click();
  await expect(page.getByText("Choose a file first.")).toBeVisible();

  // 2. Select a small fixture file. Assert the file name is visible and Remove is visible. Assert the drop zone is hidden or replaced by the chip.
  const fileInput = page.getByTestId("check-input");
  await fileInput.setInputFiles({
    name: "test-document.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Hello world safe content"),
  });
  await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
  await expect(page.locator(".file-selected-chip")).toContainText("test-document.txt");
  await expect(page.locator(".file-drop")).toHaveCount(0);

  // 3. Click Remove. Assert Remove and the file name are gone, the drop zone is back, and selecting the same file again shows the chip (input value was cleared).
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
  await expect(page.locator(".file-selected-chip")).toHaveCount(0);
  await expect(page.locator(".file-drop")).toBeVisible();

  // Select the same file again
  await fileInput.setInputFiles({
    name: "test-document.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Hello world safe content"),
  });
  await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
  await expect(page.locator(".file-selected-chip")).toContainText("test-document.txt");

  // 4. Repeat for #/check?tab=qr with a small image fixture.
  await page.goto("./#/check?tab=qr");
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
  await expect(page.locator(".file-drop")).toBeVisible();

  // Test clicking Read QR image without a file shows banner
  await page.getByTestId("check-run").click();
  await expect(page.getByText("Choose a QR picture first.")).toBeVisible();

  const qrInput = page.getByTestId("check-input");
  await qrInput.setInputFiles({
    name: "sample-qr.png",
    mimeType: "image/png",
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG header
  });
  await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
  await expect(page.locator(".file-selected-chip")).toContainText("sample-qr.png");
  await expect(page.locator(".file-drop")).toHaveCount(0);

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
  await expect(page.locator(".file-drop")).toBeVisible();

  // 5. Open the messages page. Empty state has no Remove. After attaching a file, Remove is visible; after Remove, empty state returns and the same file can be attached again.
  await page.goto("./#/messages");
  await expect(page.getByRole("button", { name: /Remove file/i })).toHaveCount(0);
  const msgFileInput = page.locator('input[type="file"]');
  await msgFileInput.setInputFiles({
    name: "confidential.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 sample content"),
  });
  await expect(page.getByRole("button", { name: /Remove file/i })).toBeVisible();
  await expect(page.locator(".file-drop-title")).toHaveText("confidential.pdf");

  await page.getByRole("button", { name: /Remove file/i }).click();
  await expect(page.getByRole("button", { name: /Remove file/i })).toHaveCount(0);
  await expect(page.locator(".file-drop-title")).toHaveText("Choose a file or drop it here");

  // Can attach the same file again
  await msgFileInput.setInputFiles({
    name: "confidential.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 sample content"),
  });
  await expect(page.getByRole("button", { name: /Remove file/i })).toBeVisible();
  await expect(page.locator(".file-drop-title")).toHaveText("confidential.pdf");

  // 6. #/check?tab=link and #/check?tab=message never show a file Remove button.
  await page.goto("./#/check?tab=link");
  await expect(page.getByRole("button", { name: /Remove/i })).toHaveCount(0);
  await page.goto("./#/check?tab=message");
  await expect(page.getByRole("button", { name: /Remove/i })).toHaveCount(0);
});
