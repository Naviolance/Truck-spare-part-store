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
      // Case-insensitive match across name and description.
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
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

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
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
    const grouped = await this.prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    if (grouped.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) }, status: ProductStatus.PUBLISHED, quantity: { gt: 0 } },
      include: { category: true, brand: true, images: { orderBy: { position: "asc" }, take: 1 } },
    });

    // groupBy doesn't preserve order through the second query — restore it.
    const order = grouped.map((g) => g.productId);
    return products.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
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

    const { imageUrls, vehicleIds, ...rest } = dto;

    return this.prisma.product.create({
      data: {
        ...rest,
        slug,
        status: ProductStatus.PUBLISHED,
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