import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { OrderStatus, ProductRequestStatus, UserRole } from "@truckparts/prisma";
import { ORDER_GROUPS, type OrderGroup } from "../orders/order-status";
import { PrismaService } from "../common/prisma/prisma.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get("stats")
  async stats() {
    const [products, categories, brands, users, orders, outOfStock, pendingPayment, revenue, recentOrders, byStatus, openRequests] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.category.count(),
        this.prisma.brand.count(),
        this.prisma.user.count(),
        this.prisma.order.count(),
        this.prisma.product.count({ where: { quantity: 0 } }),
        this.prisma.order.count({ where: { status: OrderStatus.PAYMENT_PENDING } }),
        this.prisma.order.aggregate({ where: { status: OrderStatus.PAID }, _sum: { total: true } }),
        this.prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
            user: { select: { firstName: true, lastName: true } },
          },
        }),
        this.prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
        this.prisma.productRequest.count({ where: { status: ProductRequestStatus.OPEN } }),
      ]);

    // Counts for the admin's order tabs and "to do today" (ORDER_GROUPS).
    const orderGroups = Object.fromEntries(
      Object.entries(ORDER_GROUPS).map(([group, statuses]) => [
        group,
        byStatus.filter((row) => (statuses as OrderStatus[]).includes(row.status)).reduce((n, row) => n + row._count._all, 0),
      ]),
    ) as Record<OrderGroup, number>;

    return {
      products,
      categories,
      brands,
      users,
      orders,
      outOfStock,
      pendingPayment,
      revenue: revenue._sum.total ?? 0,
      recentOrders,
      orderGroups,
      openRequests,
    };
  }
}