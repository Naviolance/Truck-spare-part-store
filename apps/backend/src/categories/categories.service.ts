import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { slugify } from "../common/utils/slugify";
import { ProductStatus } from "@truckparts/prisma";

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      // Count only what a shopper can see (landing pages / filters).
      include: { _count: { select: { products: { where: { status: ProductStatus.PUBLISHED } } } } },
      orderBy: { name: "asc" },
    });
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name);
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new ConflictException("A category with this name already exists");

    return this.prisma.category.create({
      data: { name: dto.name, slug, parentId: dto.parentId },
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Category not found");
    return this.prisma.category.delete({ where: { id } });
  }
}