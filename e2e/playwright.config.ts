import { defineConfig, devices } from "@playwright/test";

// Browser tests of the running stack: Postgres + backend (:4000) + the
// production frontend build (:3000). Start them first (see README "Browser
// tests"); CI does the same in the "E2E" job.
//
// One worker, on purpose: the tests share one database and some of them
// change it (stock, orders, coupons), so running them in parallel would make
// results depend on timing.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // A Chromium already on the machine (e.g. a cloud dev box) instead of
    // Playwright's download: PW_CHROMIUM_PATH=/path/to/chrome.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", testIgnore: /mobile\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
    { name: "mobile", testMatch: /mobile\.spec\.ts/, use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
});
