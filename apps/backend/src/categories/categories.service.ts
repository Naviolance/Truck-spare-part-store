import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { apiError } from "../common/errors";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
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
    if (existing) throw new ConflictException(apiError("CATEGORY_EXISTS", "A category with this name already exists"));

    return this.prisma.category.create({
      data: { name: dto.name, nameFr: dto.nameFr || null, slug, parentId: dto.parentId },
    });
  }

  // The slug is deliberately NOT regenerated on rename: it's the category's
  // public URL (/categories/<slug>), and changing it would break every link
  // and search result pointing at the old one.
  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Category not found");
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameFr !== undefined && { nameFr: dto.nameFr || null }),
      },
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Category not found");
    // Products reference it; deleting would fail on the foreign key (a 500).
    // Say what to do instead.
    const products = await this.prisma.product.count({ where: { categoryId: id } });
    if (products > 0) {
      throw new ConflictException(apiError("CATEGORY_HAS_PRODUCTS", `This category still has ${products} product(s). Move them to another category first.`, { count: products }));
    }
    return this.prisma.category.delete({ where: { id } });
  }
}