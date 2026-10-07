import { test as base, expect, type Page } from "@playwright/test";

// Every page starts with the cookie notice already dismissed, so it never
// covers the buttons a test clicks.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem("cookie-notice-dismissed", "1");
      } catch {}
    });
    await use(context);
  },
});
export { expect };

// Marks the current document; `sameDocument()` is true until a full page
// load replaces it (what "the page reloaded" means).
export async function markDocument(page: Page) {
  await page.evaluate(() => ((window as unknown as { __e2eMark: number }).__e2eMark = 1));
}
export const sameDocument = (page: Page) => page.evaluate(() => (window as unknown as { __e2eMark?: number }).__e2eMark === 1);

export const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
