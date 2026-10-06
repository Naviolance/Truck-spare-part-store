import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { apiError } from "../common/errors";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { slugify } from "../common/utils/slugify";
import { ProductStatus } from "@truckparts/prisma";

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.brand.findMany({
      // Count only what a shopper can see (landing pages / filters).
      include: { _count: { select: { products: { where: { status: ProductStatus.PUBLISHED } } } } },
      orderBy: { name: "asc" },
    });
  }

  async create(dto: CreateBrandDto) {
    const slug = slugify(dto.name);
    const existing = await this.prisma.brand.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(apiError("BRAND_EXISTS", "A brand with this name already exists"));

    return this.prisma.brand.create({ data: { name: dto.name, slug } });
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException("Brand not found");
    // Products reference it; deleting would fail on the foreign key (a 500).
    // Say what to do instead.
    const products = await this.prisma.product.count({ where: { brandId: id } });
    if (products > 0) {
      throw new ConflictException(apiError("BRAND_HAS_PRODUCTS", `This brand still has ${products} product(s). Move them to another brand first.`, { count: products }));
    }
    return this.prisma.brand.delete({ where: { id } });
  }
}