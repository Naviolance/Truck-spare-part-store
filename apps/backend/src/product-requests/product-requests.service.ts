import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateProductRequestDto } from "./dto/create-product-request.dto";
import { UpdateProductRequestDto } from "./dto/update-product-request.dto";

@Injectable()
export class ProductRequestsService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, dto: CreateProductRequestDto) {
    return this.prisma.productRequest.create({
      data: {
        userId,
        description: dto.description,
        partNumber: dto.partNumber,
        vehicleInfo: dto.vehicleInfo,
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.productRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  findAllAdmin() {
    return this.prisma.productRequest.findMany({
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateAdmin(id: string, dto: UpdateProductRequestDto) {
    const existing = await this.prisma.productRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Product request not found");

    return this.prisma.productRequest.update({
      where: { id },
      data: { status: dto.status, adminNote: dto.adminNote },
    });
  }
}
