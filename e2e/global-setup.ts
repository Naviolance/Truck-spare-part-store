import fs from "node:fs";
import { apiAs } from "./support/api";
import { ADMIN } from "./support/env";
import { FIXTURES_FILE, type Fixtures } from "./support/fixtures";

// Creates this run's products through the admin API: one in stock (with a
// cross-reference and a compatible truck), one out of stock.
export default async function globalSetup() {
  const api = await apiAs(ADMIN);
  const runId = Date.now().toString(36);
  const [category] = await api.get("/categories");
  const vehicles: { id: string; manufacturer: string }[] = await api.get("/vehicles/admin/all");
  if (!category || vehicles.length === 0) throw new Error("Seed the database first: pnpm prisma:seed");
  const vehicle = vehicles[0];
  const crossReference = `E2E-${runId}-X`.toUpperCase();

  const create = (name: string, quantity: number, extra: object = {}) =>
    api.post("/products", {
      name,
      description: "Pièce créée par les tests de navigateur (e2e).",
      price: 12500,
      quantity,
      condition: "NEW",
      categoryId: category.id,
      status: "PUBLISHED",
      ...extra,
    });

  const inStock = await create(`E2E Plaquette ${runId}`, 5, { crossReference: [crossReference], vehicleIds: [vehicle.id] });
  const outOfStock = await create(`E2E Rupture ${runId}`, 0);
  await api.dispose();

  const data: Fixtures = {
    runId,
    inStock: { id: inStock.id, slug: inStock.slug, name: inStock.name, crossReference, manufacturer: vehicle.manufacturer },
    outOfStock: { id: outOfStock.id, slug: outOfStock.slug, name: outOfStock.name },
  };
  fs.writeFileSync(FIXTURES_FILE, JSON.stringify(data, null, 2));
}
