// Finds product photos that no longer load (e.g. lost when storage was
// replaced), so they can be re-uploaded.
//
//   pnpm photos:check                    list them (changes nothing)
//   pnpm photos:check --remove --yes     also delete those photo rows, so the
//                                        products show the "no photo" box
//                                        instead of a broken image
//
// Run it with DATABASE_URL pointing at the database to check (production:
// set it in the shell, never commit it). Each photo's URL is requested
// exactly as a visitor's browser would.
import { PrismaClient } from "../generated/client";

const CONCURRENCY = 8;

type Result = { id: string; url: string; status: number | "error"; product: { name: string; id: string; status: string } };

async function check(url: string): Promise<number | "error"> {
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (res.status === 405) res = await fetch(url, { redirect: "follow" });
    return res.status;
  } catch {
    return "error";
  }
}

async function main() {
  const remove = process.argv.includes("--remove");
  const confirmed = process.argv.includes("--yes");
  const prisma = new PrismaClient();
  try {
    const images = await prisma.productImage.findMany({
      select: { id: true, url: true, product: { select: { id: true, name: true, status: true } } },
      orderBy: [{ productId: "asc" }, { position: "asc" }],
    });
    console.log(`Checking ${images.length} photos…`);

    const results: Result[] = [];
    for (let i = 0; i < images.length; i += CONCURRENCY) {
      const batch = images.slice(i, i + CONCURRENCY);
      results.push(...(await Promise.all(batch.map(async (img) => ({ ...img, status: await check(img.url) })))));
    }

    const missing = results.filter((r) => r.status === 404);
    const unreachable = results.filter((r) => r.status !== 404 && r.status !== 200);
    const byProduct = new Map<string, Result[]>();
    for (const r of missing) byProduct.set(r.product.id, [...(byProduct.get(r.product.id) ?? []), r]);

    console.log(`\n${results.length - missing.length - unreachable.length} OK, ${missing.length} missing (404), ${unreachable.length} other errors.\n`);
    for (const list of byProduct.values()) {
      const p = list[0].product;
      console.log(`- ${p.name} [${p.status}] — ${list.length} missing photo(s) — /admin/products/${p.id}/edit`);
    }
    for (const r of unreachable) console.log(`  ! ${r.status} ${r.url} (${r.product.name}) — not counted as missing; check storage/backend`);

    if (!remove || missing.length === 0) {
      if (missing.length) console.log(`\nRe-upload them from the admin, or run again with --remove --yes to delete these ${missing.length} photo rows.`);
      return;
    }
    if (!confirmed) {
      console.log(`\nDry run: add --yes to delete these ${missing.length} photo rows.`);
      return;
    }
    const { count } = await prisma.productImage.deleteMany({ where: { id: { in: missing.map((r) => r.id) } } });
    console.log(`\nDeleted ${count} photo rows. Product pages refresh within a few minutes (cache).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
