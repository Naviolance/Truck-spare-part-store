import { test, expect, noHorizontalScroll } from "../support/test";
import { fixtures } from "../support/fixtures";

test("home, product, catalog and Find My Part fit a phone screen", async ({ page }) => {
  const { inStock } = fixtures();
  for (const url of ["/fr", `/fr/products/${inStock.slug}`, "/fr/products", `/fr/find-my-part?manufacturer=${encodeURIComponent(inStock.manufacturer)}`, "/fr/cart"]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    expect(await noHorizontalScroll(page), url).toBe(true);
  }
  await expect(page.getByRole("link", { name: "Discutez avec nous sur WhatsApp" })).toBeVisible();
});
