import { test, expect } from "../support/test";
import { apiAs, loginAs } from "../support/api";
import { ADMIN } from "../support/env";
import { fixtures } from "../support/fixtures";

// One customer journey, then the admin side of the same order.
test.describe.configure({ mode: "serial" });

let orderNumber = "";

test("a new customer registers from the cart and places a cash order", async ({ page }) => {
  const { inStock } = fixtures();
  const api = await apiAs(ADMIN);
  const before = (await api.get(`/products/admin/${inStock.id}`)).quantity;

  await page.goto("/fr/checkout");
  await expect(page).toHaveURL(/\/fr\/login\?next=%2Fcart/);
  await page.getByRole("link", { name: "Créer un compte" }).first().click();
  await page.getByLabel("Prénom").fill("Awa");
  await page.getByLabel("Nom", { exact: true }).fill("Ngono");
  const email = `e2e-${Date.now()}@example.com`;
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("camion rouge douala");
  await page.getByLabel(/Je souhaite recevoir les arrivages/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/fr\/cart$/);

  await page.goto(`/fr/products/${inStock.slug}`);
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.getByRole("button", { name: "Ajouté ✓" })).toBeVisible();
  await page.goto("/fr/cart");
  await page.getByLabel("Numéro de téléphone / WhatsApp").fill("+237 677 00 11 22");
  await page.getByLabel("Ville", { exact: true }).fill("Douala");
  await page.getByRole("button", { name: /Commander — payer/ }).first().click();
  await expect(page).toHaveURL(/\/fr\/orders\/[0-9a-f-]+$/);
  await expect(page.getByText("Commande reçue")).toBeVisible();

  const orders = await api.get("/orders/admin/all?group=todo");
  const order = orders.items.find((o: { items: { productId: string }[] }) => o.items.some((i) => i.productId === inStock.id));
  orderNumber = order.orderNumber;
  expect((await api.get(`/products/admin/${inStock.id}`)).quantity).toBe(before - 1);
  // The sign-up consent box was ticked: they're in the offers list.
  const optedIn = await api.get(`/users/admin/all?optIn=yes&search=${encodeURIComponent(email)}`);
  expect(optedIn.items).toHaveLength(1);
  await api.dispose();
});

test("the admin marks the cash order paid; it moves to \"En cours\"", async ({ page, context }) => {
  test.skip(!orderNumber, "needs the order from the previous test");
  await loginAs(context, ADMIN);
  await page.goto("/admin/orders?group=todo");
  const card = page.locator("li", { hasText: orderNumber }).first();
  await expect(card).toBeVisible();
  // A cash order waiting for pickup offers only "mark paid", no other status.
  await expect(card.locator("select")).toHaveCount(0);
  page.once("dialog", (d) => d.accept());
  await card.getByRole("button", { name: "Marquer payée (espèces)" }).click();
  await expect(page.locator("li", { hasText: orderNumber })).toHaveCount(0);

  await page.getByRole("tab", { name: /En cours/ }).click();
  const paid = page.locator("li", { hasText: orderNumber }).first();
  await expect(paid.getByRole("button", { name: "Passer à : En préparation" })).toBeVisible();
  const options = await paid.locator("select option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
  expect(options).not.toContain("PAYMENT_PENDING");
  expect(options).toContain("DELIVERED");
});
