import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, ProductStatus } from "@truckparts/prisma";
import { PrismaService } from "../../common/prisma/prisma.service";
import { uniqueSlug } from "../../common/utils/unique-slug";
import { ImportIssue, ImportRow, VehicleRef, normalizeKey, parseProductCsv } from "./product-import.parser";

type Db = PrismaService | Prisma.TransactionClient;

export type PlannedRow = {
  line: number;
  action: "create" | "update";
  name: string;
  partNumber: string | null;
  brand: string | null;
  category: string;
  price: number;
  quantity: number;
  productId?: string; // for updates
};

export type ImportPlan = {
  rows: PlannedRow[];
  newCategories: string[];
  newBrands: string[];
  newVehicles: string[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
  summary: { create: number; update: number; errors: number };
};

const vehicleKey = (v: Pick<VehicleRef, "manufacturer" | "model" | "yearStart" | "yearEnd" | "engine">) =>
  [normalizeKey(v.manufacturer), normalizeKey(v.model), v.yearStart, v.yearEnd ?? "", normalizeKey(v.engine ?? "")].join("|");
const vehicleLabel = (v: VehicleRef) => `${v.manufacturer} ${v.model} (${v.yearStart}${v.yearEnd ? `–${v.yearEnd}` : "+"})${v.engine ? ` ${v.engine}` : ""}`;

// Bulk product import, in two steps the admin controls:
//   preview(file) -> what WOULD happen (creates, updates, new categories /
//                    brands / trucks, every error and warning). Writes nothing.
//   commit(file)  -> re-validates the same file and applies it in ONE
//                    transaction: every row is written, or none is.
// Stateless on purpose: the admin re-sends the file to commit, so nothing is
// stored on the server between the two steps.
//
// A row UPDATES an existing product when its part number (compared ignoring
// spaces, dashes and case) and brand match one; otherwise it CREATES one.
// That's what lets the owner keep one master spreadsheet and re-upload it to
// refresh prices and stock.
@Injectable()
export class ProductImportService {
  constructor(private prisma: PrismaService) {}

  async preview(file: Buffer): Promise<ImportPlan> {
    const { plan } = await this.plan(this.prisma, file);
    return plan;
  }

  async commit(file: Buffer, defaultStatus: ProductStatus = ProductStatus.PUBLISHED): Promise<ImportPlan> {
    return this.prisma.$transaction(
      async (tx) => {
        const { plan, rows, lookups } = await this.plan(tx, file);
        if (plan.errors.length > 0) {
          throw new BadRequestException({ message: "The file has errors — nothing was imported. Fix them and try again.", plan });
        }
        await this.apply(tx, plan, rows, lookups, defaultStatus);
        return plan;
      },
      { timeout: 120_000, maxWait: 10_000 },
    );
  }

  private async plan(db: Db, file: Buffer) {
    const parsed = parseProductCsv(file);
    const errors = [...parsed.errors];
    const warnings = [...parsed.warnings];

    // What already exists, keyed the way the file is matched.
    const [categories, brands, vehicles] = await Promise.all([
      db.category.findMany({ select: { id: true, name: true, nameFr: true } }),
      db.brand.findMany({ select: { id: true, name: true } }),
      db.vehicle.findMany(),
    ]);
    const categoryByKey = new Map<string, string>();
    for (const c of categories) {
      categoryByKey.set(normalizeKey(c.name), c.id);
      if (c.nameFr) categoryByKey.set(normalizeKey(c.nameFr), c.id); // "Freinage" finds "Brakes"
    }
    const brandByKey = new Map(brands.map((b) => [normalizeKey(b.name), b.id]));
    const vehicleByKey = new Map(vehicles.map((v) => [vehicleKey(v), v.id]));

    const existing = await this.findByPartNumbers(db, parsed.rows);

    const newCategories = new Map<string, string>();
    const newBrands = new Map<string, string>();
    const newVehicles = new Map<string, VehicleRef>();
    const rows: PlannedRow[] = [];

    for (const row of parsed.rows) {
      const categoryKey = normalizeKey(row.category);
      if (!categoryByKey.has(categoryKey)) newCategories.set(categoryKey, row.category);
      const brandKey = row.brand ? normalizeKey(row.brand) : null;
      if (brandKey && !brandByKey.has(brandKey)) newBrands.set(brandKey, row.brand!);
      for (const v of row.vehicles) if (!vehicleByKey.has(vehicleKey(v))) newVehicles.set(vehicleKey(v), v);

      let productId: string | undefined;
      if (row.partNumber) {
        const brandId = brandKey ? brandByKey.get(brandKey) ?? "(new)" : null;
        const matches = (existing.get(normalizeKey(row.partNumber)) ?? []).filter((p) => p.brandId === brandId);
        if (matches.length > 1) {
          errors.push({
            line: row.line,
            field: "partNumber",
            message: `${matches.length} existing products already have this part number and brand — fix the duplicates in the admin first`,
          });
          continue;
        }
        productId = matches[0]?.id;
        if (matches[0]?.status === ProductStatus.ARCHIVED && !row.status) {
          warnings.push({ line: row.line, message: "Matches an archived product: it stays hidden unless status is set to Published" });
        }
      }
      if (!productId && !row.description) {
        warnings.push({ line: row.line, field: "description", message: "No description — the product name is used. Add one later for better search results." });
      }

      rows.push({
        line: row.line,
        action: productId ? "update" : "create",
        name: row.name,
        partNumber: row.partNumber,
        brand: row.brand,
        category: row.category,
        price: row.price,
        quantity: row.quantity,
        productId,
      });
    }

    const plan: ImportPlan = {
      rows,
      newCategories: [...newCategories.values()],
      newBrands: [...newBrands.values()],
      newVehicles: [...newVehicles.values()].map(vehicleLabel),
      errors: errors.sort((a, b) => a.line - b.line),
      warnings: warnings.sort((a, b) => a.line - b.line),
      summary: {
        create: rows.filter((r) => r.action === "create").length,
        update: rows.filter((r) => r.action === "update").length,
        errors: errors.length,
      },
    };
    return {
      plan,
      rows: parsed.rows,
      lookups: { categoryByKey, brandByKey, vehicleByKey, newCategories, newBrands, newVehicles },
    };
  }

  // Existing products whose part number matches any in the file, compared
  // the way search does (lower case, letters and digits only).
  private async findByPartNumbers(db: Db, rows: ImportRow[]) {
    const keys = [...new Set(rows.map((r) => r.partNumber).filter((p): p is string => !!p).map(normalizeKey))];
    const byKey = new Map<string, { id: string; brandId: string | null; status: ProductStatus }[]>();
    if (keys.length === 0) return byKey;
    const found = await db.$queryRaw<{ id: string; brandId: string | null; status: ProductStatus; key: string }[]>`
      SELECT id, "brandId", status, regexp_replace(lower("partNumber"), '[^a-z0-9]', '', 'g') AS key
      FROM products
      WHERE "partNumber" IS NOT NULL
        AND regexp_replace(lower("partNumber"), '[^a-z0-9]', '', 'g') = ANY(${keys})`;
    for (const p of found) byKey.set(p.key, [...(byKey.get(p.key) ?? []), { id: p.id, brandId: p.brandId, status: p.status }]);
    return byKey;
  }

  private async apply(
    tx: Prisma.TransactionClient,
    plan: ImportPlan,
    rows: ImportRow[],
    lookups: Awaited<ReturnType<ProductImportService["plan"]>>["lookups"],
    defaultStatus: ProductStatus,
  ) {
    const { categoryByKey, brandByKey, vehicleByKey, newCategories, newBrands, newVehicles } = lookups;

    for (const [key, name] of newCategories) {
      const slug = await uniqueSlug(name, async (s) => Boolean(await tx.category.findUnique({ where: { slug: s } })));
      categoryByKey.set(key, (await tx.category.create({ data: { name, slug } })).id);
    }
    for (const [key, name] of newBrands) {
      const slug = await uniqueSlug(name, async (s) => Boolean(await tx.brand.findUnique({ where: { slug: s } })));
      brandByKey.set(key, (await tx.brand.create({ data: { name, slug } })).id);
    }
    for (const [key, v] of newVehicles) {
      vehicleByKey.set(key, (await tx.vehicle.create({ data: v })).id);
    }

    const plannedByLine = new Map(plan.rows.map((r) => [r.line, r]));
    const reservedSlugs = new Set<string>();

    for (const row of rows) {
      const planned = plannedByLine.get(row.line)!;
      const categoryId = categoryByKey.get(normalizeKey(row.category))!;
      const brandId = row.brand ? brandByKey.get(normalizeKey(row.brand))! : null;
      const vehicleIds = row.vehicles.map((v) => vehicleByKey.get(vehicleKey(v))!);

      const common = {
        name: row.name,
        price: row.price,
        quantity: row.quantity,
        condition: row.condition,
        conditionNotes: row.conditionNotes,
        partNumber: row.partNumber,
        categoryId,
        brandId,
      };

      if (planned.action === "update") {
        // Empty cells keep what's there (description, translations, cross
        // references, trucks); filled cells replace it.
        await tx.product.update({
          where: { id: planned.productId },
          data: {
            ...common,
            ...(row.description && { description: row.description }),
            ...(row.descriptionFr && { descriptionFr: row.descriptionFr }),
            ...(row.crossReference.length > 0 && { crossReference: row.crossReference }),
            ...(row.status && { status: row.status }),
            ...(vehicleIds.length > 0 && {
              compatibility: { deleteMany: {}, create: vehicleIds.map((vehicleId) => ({ vehicleId })) },
            }),
          },
        });
      } else {
        const slug = await uniqueSlug(
          row.name,
          async (s) => Boolean(await tx.product.findUnique({ where: { slug: s }, select: { id: true } })),
          reservedSlugs,
        );
        await tx.product.create({
          data: {
            ...common,
            slug,
            description: row.description ?? row.descriptionFr ?? row.name,
            descriptionFr: row.descriptionFr,
            crossReference: row.crossReference,
            status: row.status ?? defaultStatus,
            ...(vehicleIds.length > 0 && { compatibility: { create: vehicleIds.map((vehicleId) => ({ vehicleId })) } }),
          },
        });
      }
    }
  }
}
