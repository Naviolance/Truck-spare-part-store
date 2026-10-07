import { test, expect, markDocument, sameDocument } from "../support/test";
import { fixtures } from "../support/fixtures";

// Filters, sort and pages only change the URL's query: the page must update
// in place (no full reload, no whole-page skeleton).
test.describe("catalog updates in place", () => {
  test("sort, brand filter and removing the pill on /products", async ({ page }) => {
    await page.goto("/fr/products");
    await markDocument(page);

    await page.locator("#catalog-sort").selectOption("price_asc");
    await expect(page).toHaveURL(/sort=price_asc/);

    await page.locator('aside input[name="brandId"]').nth(1).check();
    await expect(page).toHaveURL(/brandId=/);
    const pill = page.getByRole("list", { name: "Filtres actifs" }).getByRole("link").first();
    await expect(pill).toBeVisible();
    await pill.click();
    await expect(page).not.toHaveURL(/brandId=/);

    expect(await sameDocument(page)).toBe(true);
  });

  test("Find My Part shows the parts below the picked truck", async ({ page }) => {
    const { inStock } = fixtures();
    await page.goto("/fr/find-my-part");
    await markDocument(page);
    await page.locator('section[aria-labelledby="fmp-makes"] a', { hasText: inStock.manufacturer }).click();
    await expect(page).toHaveURL(new RegExp(`manufacturer=${encodeURIComponent(inStock.manufacturer).replace(/%20/g, "(\\+|%20)")}`));
    await expect(page.getByRole("heading", { name: `Pièces pour ${inStock.manufacturer}` })).toBeVisible();
    await expect(page.locator(`a[href="/fr/products/${inStock.slug}"]`).first()).toBeVisible();
    expect(await sameDocument(page)).toBe(true);
  });
});
