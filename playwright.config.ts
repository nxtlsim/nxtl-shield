import { defineConfig, devices } from "@playwright/test";

const skipWebkit = process.env.PLAYWRIGHT_SKIP_WEBKIT === "1";

const projects = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ...(skipWebkit ? [] : [{ name: "webkit", use: { ...devices["Desktop Safari"] } }]),
];

export default defineConfig({
  testDir: "tests",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4173/nxtl-shield/" },
  webServer: {
    command: "npm run build -w @nxtl/web && npm run preview -w @nxtl/web -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/nxtl-shield/",
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
  projects,
});
