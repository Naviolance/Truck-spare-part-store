import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { OrderStatus } from "@truckparts/prisma";
import { CreateOrderDto } from "./dto/create-order.dto";
import { generateOrderNumber } from "../common/utils/order-number";

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async checkout(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new BadRequestException("Cart is empty");

    const cartItems = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: true },
    });

    if (cartItems.length === 0) throw new BadRequestException("Cart is empty");

    return this.prisma.$transaction(async (tx) => {
      let subtotal = 0;

      for (const item of cartItems) {
        // Atomic conditional update: only succeeds if enough stock is STILL
        // available at this exact instant, regardless of what the cart said
        // when the page loaded. This is what makes concurrent checkouts safe.
        const result = await tx.product.updateMany({
          where: { id: item.productId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });

        if (result.count === 0) {
          throw new BadRequestException(
            `"${item.product.name}" no longer has enough stock available`,
          );
        }

        subtotal += Number(item.product.price) * item.quantity;
      }

      // TEMPORARY: real payment integration lands in the next task. Until
      // then, orders are marked PAID immediately at checkout so we can build
      // and test the rest of the order flow end to end.
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          status: OrderStatus.PAID,
          subtotal,
          shippingTotal: 0,
          total: subtotal,
          shippingAddress: dto.shippingAddress,
          shippingCity: dto.shippingCity,
          shippingPhone: dto.shippingPhone,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              unitPrice: item.product.price,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(userId: string, orderId: string, isAdmin: boolean) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: { select: { firstName: true, lastName: true, email: true } } },
    });

    if (!order) throw new NotFoundException("Order not found");
    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException("You do not have access to this order");
    }

    return order;
  }

  async findAllAdmin() {
    return this.prisma.order.findMany({
      include: { items: true, user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found");

    return this.prisma.order.update({ where: { id: orderId }, data: { status } });
  }
}