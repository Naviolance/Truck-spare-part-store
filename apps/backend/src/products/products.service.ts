import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { ProductStatus, Prisma } from "@truckparts/prisma";
import { QueryProductsDto } from "./dto/query-products.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { slugify } from "../common/utils/slugify";
import { buildListingQuery, ListingFilters } from "./product-listing";


// What a product card needs: category, brand and the first image only.
const CARD_INCLUDE = {
  category: true,
  brand: true,
  images: { orderBy: { position: "asc" as const }, take: 1 },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // Catalog listing for everything public: /products, search, Find My Part
  // (manufacturer/model/vehicleId) and the category/brand/vehicle landing
  // pages. Out-of-stock products are INCLUDED (sorted last, labelled by the
  // frontend) so they stay findable and can still be requested.
  async findAll(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const filters: ListingFilters = { ...query, inStockOnly: query.inStock === true };

    let mode: "exact" | "fuzzy" = "exact";
    let { items, total } = await this.runListing(filters, mode, page, limit);

    // Nothing matched exactly — before giving up, try a typo-tolerant match
    // so "brke pads" still finds "Brake pads" instead of a dead end.
    if (total === 0 && query.search?.trim()) {
      mode = "fuzzy";
      ({ items, total } = await this.runListing(filters, mode, page, limit));
    }

    if (query.search && items.length > 0) {
      // Fire-and-forget — powers "most searched", not worth delaying the response for.
      this.prisma.product
        .updateMany({ where: { id: { in: items.map((p) => p.id) } }, data: { searchHits: { increment: 1 } } })
        .catch(() => {});
    }

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      ...(mode === "fuzzy" && { fuzzy: true }),
    };
  }

  private async runListing(filters: ListingFilters, mode: "exact" | "fuzzy", page: number, limit: number) {
    const query = buildListingQuery(filters, mode, page, limit);
    const [rows, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>(query.ids),
      this.prisma.$queryRaw<{ total: number }[]>(query.count),
    ]);
    return { items: await this.cardsInOrder(rows.map((r) => r.id)), total };
  }

  // Load product cards by id, keeping the caller's order (a findMany with
  // `id: { in }` returns them in arbitrary order).
  private async cardsInOrder(ids: string[]) {
    if (ids.length === 0) return [];
    const products = await this.prisma.product.findMany({ where: { id: { in: ids } }, include: CARD_INCLUDE });
    const position = new Map(ids.map((id, i) => [id, i]));
    return products.sort((a, b) => position.get(a.id)! - position.get(b.id)!);
  }

  async findMostSearched(limit = 6) {
    return this.prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED, quantity: { gt: 0 }, searchHits: { gt: 0 } },
      include: CARD_INCLUDE,
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

    // Homepage section: only parts a customer can buy right now.
    const available = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) }, status: ProductStatus.PUBLISHED, quantity: { gt: 0 } },
      select: { id: true },
    });
    const availableIds = new Set(available.map((p) => p.id));
    return this.cardsInOrder(grouped.map((g) => g.productId).filter((id) => availableIds.has(id)).slice(0, limit));
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

  // A product that was ever ordered can't be deleted: order history
  // references it (and must keep doing so for receipts and accounting). It's
  // archived instead — hidden from the store, kept in the database. A product
  // nobody ever ordered is deleted outright.
  async remove(id: string) {
    await this.findByIdAdmin(id);
    const ordered = await this.prisma.orderItem.count({ where: { productId: id } });
    if (ordered > 0) {
      await this.prisma.product.update({ where: { id }, data: { status: ProductStatus.ARCHIVED } });
      return { archived: true };
    }
    await this.prisma.product.delete({ where: { id } });
    return { archived: false };
  }
}