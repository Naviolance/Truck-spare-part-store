import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
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
    if (existing) throw new ConflictException("A brand with this name already exists");

    return this.prisma.brand.create({ data: { name: dto.name, slug } });
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException("Brand not found");
    return this.prisma.brand.delete({ where: { id } });
  }
}