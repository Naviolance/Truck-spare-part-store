import { randomUUID } from "crypto";
import { ProductStatus } from "@truckparts/prisma";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ProductImportService } from "./product-import.service";

// Real Postgres (pnpm test:db). Every name is tagged so the test only ever
// touches and deletes its own rows.
const describeDb = process.env.DB_TESTS ? describe : describe.skip;

describeDb("product import (real database)", () => {
  const prisma = new PrismaService();
  const service = new ProductImportService(prisma);
  const tag = randomUUID().slice(0, 6).toUpperCase();
  const brand = `Brand${tag}`;
  const category = `Cat${tag}`;
  const make = `Make${tag}`;

  const file = (...rows: string[]) =>
    Buffer.from(["name;category;brand;partNumber;crossReference;condition;price;quantity;vehicles;description", ...rows].join("\n"));

  const productsOf = () =>
    prisma.product.findMany({ where: { brand: { name: brand } }, include: { compatibility: { include: { vehicle: true } } }, orderBy: { name: "asc" } });

  beforeAll(() => prisma.$connect());

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { brand: { name: brand } } });
    await prisma.vehicle.deleteMany({ where: { manufacturer: make } });
    await prisma.brand.deleteMany({ where: { name: brand } });
    await prisma.category.deleteMany({ where: { name: { in: [category, `Other${tag}`] } } });
    await prisma.$disconnect();
  });

  const firstImport = file(
    `Pad ${tag};${category};${brand};AB-123 ${tag};X1|X2;neuf;45 000;10;${make} / M1 / 2012-2020;Front pads`,
    `Filter ${tag};${category};${brand};FF-9 ${tag};;occasion;8500;3;;`,
  );

  it("preview plans creates and new categories/brands/trucks — and writes nothing", async () => {
    const plan = await service.preview(firstImport);
    expect(plan.errors).toEqual([]);
    expect(plan.summary).toEqual({ create: 2, update: 0, errors: 0 });
    expect(plan.newCategories).toEqual([category]);
    expect(plan.newBrands).toEqual([brand]);
    expect(plan.newVehicles).toEqual([`${make} M1 (2012–2020)`]);
    expect(await prisma.brand.count({ where: { name: brand } })).toBe(0);
    expect(await productsOf()).toHaveLength(0);
  });

  it("commit creates everything, with trucks and cross references", async () => {
    await service.commit(firstImport);
    const products = await productsOf();
    expect(products.map((p) => p.name)).toEqual([`Filter ${tag}`, `Pad ${tag}`]);
    const pad = products[1];
    expect(pad).toMatchObject({ price: expect.anything(), quantity: 10, crossReference: ["X1", "X2"], status: ProductStatus.PUBLISHED });
    expect(Number(pad.price)).toBe(45000);
    expect(pad.compatibility.map((c) => c.vehicle.model)).toEqual(["M1"]);
    expect(products[0].description).toBe(`Filter ${tag}`); // no description -> name
  });

  it("re-importing updates by part number (ignoring punctuation) instead of duplicating", async () => {
    const plan = await service.commit(
      file(`Pad ${tag} v2;${category};${brand};ab 123 ${tag};;neuf;47000;6;;`),
    );
    expect(plan.summary).toEqual({ create: 0, update: 1, errors: 0 });
    const pad = (await productsOf()).find((p) => p.name === `Pad ${tag} v2`)!;
    expect(Number(pad.price)).toBe(47000);
    expect(pad.quantity).toBe(6);
    // Empty cells kept what was there:
    expect(pad.description).toBe("Front pads");
    expect(pad.crossReference).toEqual(["X1", "X2"]);
    expect(pad.compatibility).toHaveLength(1);
    expect(await productsOf()).toHaveLength(2);
  });

  it("one bad row means nothing is imported (all or nothing)", async () => {
    const bad = file(
      `New good part ${tag};Other${tag};${brand};NG-1 ${tag};;neuf;1000;1;;`,
      `Broken ${tag};${category};${brand};;;neuf;not-a-price;1;;`,
    );
    await expect(service.commit(bad)).rejects.toThrow(/nothing was imported/);
    expect(await prisma.category.count({ where: { name: `Other${tag}` } })).toBe(0);
    expect(await productsOf()).toHaveLength(2);
  });

  it("a French category name matches the existing category", async () => {
    await prisma.category.update({ where: { name: category }, data: { nameFr: `Freins${tag}` } });
    const plan = await service.preview(file(`Disc ${tag};Freins${tag};${brand};;;neuf;1000;1;;`));
    expect(plan.newCategories).toEqual([]);
  });
});
