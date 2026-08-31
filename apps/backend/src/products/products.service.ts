import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { ProductStatus } from "@truckparts/prisma";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { slugify } from "../common/utils/slugify";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED },
      include: { category: true, brand: true, images: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
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

    const { imageUrls, ...rest } = dto;

    return this.prisma.product.create({
      data: {
        ...rest,
        slug,
        status: ProductStatus.DRAFT,
        images: imageUrls?.length
          ? { create: imageUrls.map((url, position) => ({ url, position })) }
          : undefined,
      },
      include: { images: true },
    });
  }

async update(id: string, dto: UpdateProductDto) {
  await this.findByIdAdmin(id);
  const { imageUrls, ...rest } = dto;

  return this.prisma.product.update({
    where: { id },
    data: {
      ...rest,
      // If imageUrls was provided, replace all existing images with the new set.
      ...(imageUrls
        ? {
            images: {
              deleteMany: {}, // remove old image records for this product
              create: imageUrls.map((url, position) => ({ url, position })),
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