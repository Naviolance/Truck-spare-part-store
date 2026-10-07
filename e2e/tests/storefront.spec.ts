import { test, expect } from "../support/test";
import { fixtures } from "../support/fixtures";

test.describe("storefront", () => {
  test("/ sends a French browser to /fr, with the store's JSON-LD", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/fr$/);
    const types = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent ?? "{}")["@type"]));
    expect(types).toEqual(expect.arrayContaining(["AutoPartsStore", "FAQPage"]));
  });

  test("searching a cross-reference without its dashes finds the part", async ({ page }) => {
    const { inStock } = fixtures();
    await page.goto("/fr/products");
    await page.fill("#site-search", inStock.crossReference.replace(/-/g, "").toLowerCase());
    await page.press("#site-search", "Enter");
    await expect(page.locator(`a[href="/fr/products/${inStock.slug}"]`).first()).toBeVisible();
  });

  test("an out-of-stock part stays visible and takes a guest request", async ({ page }) => {
    const { outOfStock } = fixtures();
    const res = await page.goto(`/fr/products/${outOfStock.slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByText("Cette pièce est en rupture de stock")).toBeVisible();
    await page.getByLabel("Votre nom *").fill("Paul Mbarga");
    await page.getByLabel("Numéro de téléphone / WhatsApp *").fill("+237 654 32 11 00");
    await page.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(page.getByText("Demande reçue — merci !")).toBeVisible();
  });

  test("product page: Product JSON-LD in XAF, WhatsApp link, language switch keeps the page", async ({ page }) => {
    const { inStock } = fixtures();
    await page.goto(`/fr/products/${inStock.slug}`);
    const ld = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent ?? "{}")));
    const product = ld.find((d) => d["@type"] === "Product");
    expect(product.offers.priceCurrency).toBe("XAF");
    expect(product.offers.availability).toMatch(/InStock$/);
    const wa = await page.getByRole("link", { name: "Demander sur WhatsApp" }).getAttribute("href");
    expect(wa).toMatch(/^https:\/\/wa\.me\//);
    await page.getByRole("button", { name: "EN" }).click();
    await expect(page).toHaveURL(new RegExp(`/en/products/${inStock.slug}$`));
    await expect(page.getByRole("heading", { name: "Does it fit my truck?" })).toBeVisible();
  });
});
