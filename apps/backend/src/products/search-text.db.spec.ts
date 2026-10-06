import { randomUUID } from "crypto";
import { ProductCondition, ProductStatus } from "@truckparts/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { ProductsService } from "./products.service";

// Real Postgres (pnpm test:db). products."searchText" is maintained by
// database triggers (migration *_product_search_text); these tests prove
// every path that feeds it keeps it in sync, and that search uses it.
const describeDb = process.env.DB_TESTS ? describe : describe.skip;

describeDb("product search text (real database)", () => {
  const prisma = new PrismaService();
  const products = new ProductsService(prisma);
  const tag = randomUUID().slice(0, 6).toLowerCase();
  let productId: string;
  let brandId: string;
  let categoryId: string;
  let vehicleId: string;

  // @ignore keeps searchText out of Prisma Client, so read it raw.
  const searchText = async () =>
    (await prisma.$queryRaw<{ searchText: string }[]>`SELECT "searchText" FROM products WHERE id = ${productId}`)[0].searchText;
  const found = async (search: string) => (await products.findAll({ search })).items.map((p) => p.id);

  beforeAll(async () => {
    await prisma.$connect();
    brandId = (await prisma.brand.create({ data: { name: `Bosch${tag}`, slug: `bosch-${tag}` } })).id;
    categoryId = (await prisma.category.create({ data: { name: `Cooling${tag}`, slug: `cooling-${tag}` } })).id;
    vehicleId = (await prisma.vehicle.create({ data: { manufacturer: `Renault${tag}`, model: `Magnum${tag}`, yearStart: 2005 } })).id;
    productId = (
      await prisma.product.create({
        data: {
          name: `Pompe à eau ${tag}`,
          slug: `pompe-${tag}`,
          description: "Water pump",
          price: 30000,
          quantity: 2,
          condition: ProductCondition.NEW,
          status: ProductStatus.PUBLISHED,
          partNumber: `WP-77 ${tag}`,
          crossReference: [`R.500-${tag}`],
          categoryId,
          brandId,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    await prisma.brand.deleteMany({ where: { id: brandId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it("is built on insert: lower-case, accent-free, part numbers as typed and without punctuation", async () => {
    const text = await searchText();
    expect(text).toContain(`pompe a eau ${tag}`);
    expect(text).toContain(`bosch${tag}`);
    expect(text).toContain(`cooling${tag}`);
    expect(text).toContain(`wp-77 ${tag}`);
    expect(text).toContain(`wp77${tag}`);
    expect(text).toContain(`r500${tag}`);
  });

  it("follows the product's trucks as they are added and removed", async () => {
    await prisma.productCompatibility.create({ data: { productId, vehicleId } });
    expect(await searchText()).toContain(`renault${tag} magnum${tag}`);
    await prisma.productCompatibility.deleteMany({ where: { productId } });
    expect(await searchText()).not.toContain(`magnum${tag}`);
    await prisma.productCompatibility.create({ data: { productId, vehicleId } });
  });

  it("follows renames of the brand, category (incl. French name) and truck", async () => {
    await prisma.brand.update({ where: { id: brandId }, data: { name: `Mahle${tag}` } });
    await prisma.category.update({ where: { id: categoryId }, data: { nameFr: `Refroidissement${tag}` } });
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { model: `Premium${tag}` } });
    const text = await searchText();
    expect(text).toContain(`mahle${tag}`);
    expect(text).not.toContain(`bosch${tag}`);
    expect(text).toContain(`refroidissement${tag}`);
    expect(text).toContain(`premium${tag}`);
  });

  it("follows edits to the product itself", async () => {
    await prisma.product.update({ where: { id: productId }, data: { descriptionFr: `Pompe d'origine ${tag}` } });
    expect(await searchText()).toContain(`pompe d'origine ${tag}`);
  });

  it("search finds it accent-insensitively, by part number in any punctuation, and by cross reference", async () => {
    expect(await found(`pompe a eau ${tag}`)).toEqual([productId]);
    expect(await found(`POMPE À EAU ${tag}`)).toEqual([productId]);
    expect(await found(`wp77${tag}`)).toEqual([productId]);
    expect(await found(`r500${tag}`)).toEqual([productId]);
    expect(await found(`Premium${tag} refroidissement${tag}`)).toEqual([productId]);
  });
});
