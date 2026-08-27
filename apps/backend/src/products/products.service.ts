import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { ProductStatus } from "@truckparts/prisma";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // Public product listing — only ever returns PUBLISHED products.
  async findAll() {
    return this.prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { position: "asc" } },
      },
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
}
