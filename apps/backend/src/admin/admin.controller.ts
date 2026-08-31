import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "@truckparts/prisma";
import { PrismaService } from "../common/prisma/prisma.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get("stats")
  async stats() {
    const [products, categories, brands, users, orders] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.category.count(),
      this.prisma.brand.count(),
      this.prisma.user.count(),
      this.prisma.order.count(),
    ]);
    return { products, categories, brands, users, orders };
  }
}