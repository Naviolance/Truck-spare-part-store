import fs from "node:fs";
import path from "node:path";

// Products global-setup creates for this run (the seed's catalog is random,
// so tests never rely on a seeded product).
export type Fixtures = {
  runId: string;
  inStock: { id: string; slug: string; name: string; crossReference: string; manufacturer: string };
  outOfStock: { id: string; slug: string; name: string };
};

export const FIXTURES_FILE = path.join(__dirname, "..", ".fixtures.json");
export const fixtures = (): Fixtures => JSON.parse(fs.readFileSync(FIXTURES_FILE, "utf8"));
