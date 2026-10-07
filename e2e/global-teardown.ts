import fs from "node:fs";
import { apiAs } from "./support/api";
import { ADMIN } from "./support/env";
import { FIXTURES_FILE, fixtures } from "./support/fixtures";

// Removes this run's products (one with an order is archived instead, which
// takes it out of the store).
export default async function globalTeardown() {
  if (!fs.existsSync(FIXTURES_FILE)) return;
  const { inStock, outOfStock } = fixtures();
  const api = await apiAs(ADMIN);
  for (const id of [inStock.id, outOfStock.id]) await api.delete(`/products/${id}`).catch(() => {});
  await api.dispose();
  fs.rmSync(FIXTURES_FILE);
}
