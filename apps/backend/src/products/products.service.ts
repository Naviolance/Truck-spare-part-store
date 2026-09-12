import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { ProductStatus, Prisma } from "@truckparts/prisma";
import { QueryProductsDto } from "./dto/query-products.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { slugify } from "../common/utils/slugify";


@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryProductsDto) {
    const where: Prisma.ProductWhereInput = { status: ProductStatus.PUBLISHED, quantity: { gt: 0 } };

    if (query.search) {
      // Case-insensitive match across name and both description languages -
      // a French search term (which may be the only place a product's
      // French name appears, per the admin-authored descriptionFr) still
      // has to find the product.
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { descriptionFr: { contains: query.search, mode: "insensitive" } },
        { partNumber: { contains: query.search, mode: "insensitive" } },
      ];
    }
    const isSearch = Boolean(query.search);

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.brandId) where.brandId = query.brandId;
    if (query.condition) where.condition = query.condition;

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 24;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { category: true, brand: true, images: { orderBy: { position: "asc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    if (isSearch && items.length > 0) {
      // Fire-and-forget — powers "most searched", not worth delaying the response for.
      this.prisma.product
        .updateMany({ where: { id: { in: items.map((p) => p.id) } }, data: { searchHits: { increment: 1 } } })
        .catch(() => {});
    }

    // An exact ILIKE match found nothing — before giving up, try a
    // trigram-similarity match so a typo ("brke" for "brake") still finds
    // the part instead of a dead-end empty result.
    if (isSearch && items.length === 0) {
      return this.findByTypoTolerantSearch(query, page, limit);
    }

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  // Fallback-only path — deliberately not paginated like findAll's main
  // path: this is a "did you mean" rescue for a query that matched nothing
  // exactly, not a full search mode, so a single best-effort page is enough.
  private async findByTypoTolerantSearch(query: QueryProductsDto, page: number, limit: number) {
    const term = query.search!.trim();
    if (!term) return { items: [], total: 0, page, limit, totalPages: 1 };

    // word_similarity (not similarity) on purpose: product names are
    // multi-word ("Cummins Filter HXIVI"), and plain similarity() scores the
    // typo against the ENTIRE name, which dilutes a good match on just one
    // word down below any sane threshold. word_similarity finds the
    // best-matching word run instead, so "Cummns" still scores well against
    // "Cummins Filter HXIVI" (~0.57) rather than ~0.22.
    const conditions: Prisma.Sql[] = [
      Prisma.sql`status = 'PUBLISHED'::"ProductStatus"`,
      Prisma.sql`quantity > 0`,
      Prisma.sql`(word_similarity(${term}, name) > 0.4 OR word_similarity(${term}, COALESCE("partNumber", '')) > 0.4)`,
    ];
    if (query.categoryId) conditions.push(Prisma.sql`"categoryId" = ${query.categoryId}`);
    if (query.brandId) conditions.push(Prisma.sql`"brandId" = ${query.brandId}`);
    if (query.condition) conditions.push(Prisma.sql`condition = ${query.condition}::"ProductCondition"`);
    if (query.minPrice !== undefined) conditions.push(Prisma.sql`price >= ${query.minPrice}`);
    if (query.maxPrice !== undefined) conditions.push(Prisma.sql`price <= ${query.maxPrice}`);

    const matches = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM products
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY GREATEST(word_similarity(${term}, name), word_similarity(${term}, COALESCE("partNumber", ''))) DESC
      LIMIT ${limit}
    `);

    if (matches.length === 0) return { items: [], total: 0, page, limit, totalPages: 1 };

    const products = await this.prisma.product.findMany({
      where: { id: { in: matches.map((m) => m.id) } },
      include: { category: true, brand: true, images: { orderBy: { position: "asc" }, take: 1 } },
    });

    // The raw query's ORDER BY (best similarity first) doesn't survive the
    // second findMany — restore it, same pattern as findMostPurchased.
    const order = new Map(matches.map((m, i) => [m.id, i]));
    const items = products.sort((a, b) => order.get(a.id)! - order.get(b.id)!);

    return { items, total: items.length, page: 1, limit, totalPages: 1, fuzzy: true };
  }

  async findMostSearched(limit = 6) {
    return this.prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED, quantity: { gt: 0 }, searchHits: { gt: 0 } },
      include: { category: true, brand: true, images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { searchHits: "desc" },
      take: limit,
    });
  }

  async findMostPurchased(limit = 6) {
    // "Purchased" = appeared in an order that actually completed payment —
    // a still-pending or failed order shouldn't count.
    //
    // Over-fetch the group beyond `limit`: some of the top-N purchased
    // products may have since sold out or been unpublished, and the second
    // query below filters those out. Capping the groupBy at exactly `limit`
    // would silently under-fill the result whenever that happens, since
    // there's no way to "backfill" from products the groupBy never fetched.
    const grouped = await this.prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit * 4,
    });

    if (grouped.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) }, status: ProductStatus.PUBLISHED, quantity: { gt: 0 } },
      include: { category: true, brand: true, images: { orderBy: { position: "asc" }, take: 1 } },
    });

    // groupBy doesn't preserve order through the second query — restore it.
    const order = new Map(grouped.map((g, i) => [g.productId, i]));
    return products.sort((a, b) => order.get(a.id)! - order.get(b.id)!).slice(0, limit);
  }

  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { position: "asc" } },
        compatibility: { include: { vehicle: true } },
        reviews: true,
      },
    });

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundException(`Product "${slug}" not found`);
    }

    return product;
  }

  findAllAdmin() {
    return this.prisma.product.findMany({
      include: { category: true, brand: true, images: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByIdAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, brand: true, images: true, compatibility: { include: { vehicle: true } } },
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async create(dto: CreateProductDto) {
    const baseSlug = slugify(dto.name);
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const { imageUrls, vehicleIds, status, ...rest } = dto;

    return this.prisma.product.create({
      data: {
        ...rest,
        slug,
        status: status ?? ProductStatus.PUBLISHED,
        images: imageUrls?.length
          ? { create: imageUrls.map((url, position) => ({ url, position })) }
          : undefined,
        compatibility: vehicleIds?.length
          ? { create: vehicleIds.map((vehicleId) => ({ vehicleId })) }
          : undefined,
      },
      include: { images: true, compatibility: true },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findByIdAdmin(id);
    const { imageUrls, vehicleIds, ...rest } = dto;

    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(imageUrls
          ? {
              images: {
                deleteMany: {},
                create: imageUrls.map((url, position) => ({ url, position })),
              },
            }
          : {}),
        ...(vehicleIds
          ? {
              compatibility: {
                deleteMany: {},
                create: vehicleIds.map((vehicleId) => ({ vehicleId })),
              },
            }
          : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findByIdAdmin(id);
    return this.prisma.product.delete({ where: { id } });
  }
}