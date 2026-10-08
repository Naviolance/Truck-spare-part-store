import path from "node:path";
import { test, expect, noHorizontalScroll } from "../support/test";
import { apiAs, loginAs } from "../support/api";
import { ADMIN } from "../support/env";
import { fixtures } from "../support/fixtures";

const PHOTO = path.join(__dirname, "..", "fixtures", "part.png");

test.beforeEach(async ({ context }) => {
  await loginAs(context, ADMIN);
});

test("dashboard opens on the four \"to do today\" cards", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "À faire aujourd’hui" })).toBeVisible();
  await expect(page.locator("main section h2").filter({ hasText: /Commandes à traiter|Demandes de pièces|rupture|sans photo/ })).toHaveCount(4);
});

test("orders tab comes from the URL and the Catalogue menu navigates", async ({ page }) => {
  await page.goto("/admin/orders?group=done");
  await expect(page.getByRole("tab", { name: /Terminées/, selected: true })).toBeVisible();
  await page.getByText("Catalogue").click();
  await page.getByRole("link", { name: "Marques" }).click();
  await expect(page).toHaveURL(/\/admin\/brands$/);
});

test("product form: errors on save, then create a draft and edit it", async ({ page }) => {
  const name = `E2E Formulaire ${Date.now()}`;
  await page.goto("/admin/products/create");
  await expect(page.getByRole("heading", { name: "Nouveau produit" })).toBeVisible();
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.getByText("Corrigez les champs en rouge.")).toBeVisible();
  await expect(page.getByText("Ajoutez au moins une photo.")).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles([PHOTO, PHOTO]);
  await page.getByLabel("Nom").fill(name);
  await page.getByLabel("Catégorie").selectOption({ index: 1 });
  await page.getByText("Occasion", { exact: true }).click();
  await page.getByLabel("Remarques sur l'état").fill("Légères rayures, testée");
  await page.getByLabel("Prix (FCFA)").fill("45000");
  await page.getByLabel("Stock").fill("3");
  await page.getByRole("button", { name: "+ Ajouter un camion" }).click();
  await page.locator("label", { has: page.locator('input[type="checkbox"]') }).first().locator("input").check();
  await page.getByRole("button", { name: "Terminé" }).click();
  await page.getByLabel("Description", { exact: true }).fill("Une description assez longue pour passer.");
  await expect(page.getByText("Modifications non enregistrées")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer en brouillon" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);

  const api = await apiAs(ADMIN);
  const list = await api.get(`/products/admin/all?search=${encodeURIComponent(name)}`);
  const created = list.items.find((p: { name: string }) => p.name === name);
  expect(created).toMatchObject({ status: "DRAFT", quantity: 3 });
  const full = await api.get(`/products/admin/${created.id}`);
  expect(full.images).toHaveLength(2);
  expect(full.compatibility).toHaveLength(1);

  await page.goto(`/admin/products/${created.id}/edit`);
  const save = page.getByRole("button", { name: "Enregistrer les modifications" });
  await expect(save).toBeDisabled();
  await page.getByLabel("Prix (FCFA)").fill("47000");
  await save.click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  const edited = await api.get(`/products/admin/${created.id}`);
  expect(Number(edited.price)).toBe(47000);
  expect(edited.status).toBe("DRAFT");
  await api.delete(`/products/${created.id}`);
  await api.dispose();
});

test("\"Sans photo\" lists products still waiting for a photo", async ({ page }) => {
  // The run's fixture products are created without photos.
  const { inStock } = fixtures();
  await page.goto("/admin");
  await page.locator("main section", { hasText: "sans photo" }).getByRole("link").click();
  await expect(page).toHaveURL(/\/admin\/products\?photos=none/);
  await expect(page.getByRole("button", { name: /Sans photo/, pressed: true })).toBeVisible();
  await page.getByPlaceholder("Rechercher par nom ou référence").fill(inStock.name);
  await expect(page.getByRole("button", { name: new RegExp(inStock.name) })).toBeVisible();
});

test("users: create an account, make it admin, delete it", async ({ page }) => {
  const email = `e2e-staff-${Date.now()}@example.com`;
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "+ Nouvel utilisateur" }).click();
  await page.getByLabel("Prénom").fill("Staff");
  await page.getByLabel("Nom", { exact: true }).fill("E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Mot de passe temporaire").fill("camion rouge douala");
  await page.getByRole("button", { name: "Créer le compte" }).click();
  await expect(page.getByText(`Compte créé pour ${email}.`)).toBeVisible();

  const row = page.locator("li", { hasText: email });
  await row.getByLabel("Rôle").selectOption("ADMIN");
  await expect(row.locator("span", { hasText: /^Admin$/ })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText("Compte de Staff E2E supprimé.")).toBeVisible();
  await expect(row).toHaveCount(0);
});

test("coupons: create, switch off, delete", async ({ page }) => {
  const code = `E2E${Date.now().toString(36).toUpperCase()}`;
  await page.goto("/admin/coupons");
  await page.getByLabel("Code").fill(code);
  await page.getByLabel("Valeur").fill("10");
  await page.getByRole("button", { name: /Créer/ }).click();
  const row = page.locator("li", { hasText: code });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Actif" }).click();
  await expect(row.getByRole("button", { name: "Inactif" })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Supprimer" }).click();
  await expect(row).toHaveCount(0);
});

test("requests open on the status from the URL", async ({ page }) => {
  await page.goto("/admin/requests?status=OPEN");
  await expect(page.getByRole("tab", { name: "Ouverte", selected: true })).toBeVisible();
  await page.getByRole("tab", { name: "Tous les statuts" }).click();
  await expect(page).not.toHaveURL(/status=/);
});

test("the admin pages fit a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of ["/admin", "/admin/orders", "/admin/products", "/admin/products/create", "/admin/requests", "/admin/coupons", "/admin/vehicles", "/admin/users"]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    expect(await noHorizontalScroll(page), url).toBe(true);
  }
});
