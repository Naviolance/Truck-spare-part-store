import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { PaymentsService } from "../payments/payments.service";
import { CouponsService } from "../coupons/coupons.service";
import { OrderStatus, PaymentStatus } from "@truckparts/prisma";
import { CreateOrderDto } from "./dto/create-order.dto";
import { generateOrderNumber } from "../common/utils/order-number";

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private couponsService: CouponsService,
  ) {}
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

      let discountTotal = 0;
      let couponId: string | undefined;
      if (dto.couponCode) {
        const applied = await this.couponsService.applyWithinTransaction(tx, dto.couponCode, subtotal);
        discountTotal = applied.discount;
        couponId = applied.couponId;
      }

      // Order stays PAYMENT_PENDING — the webhook is what confirms payment
      // and finalizes things. Stock is already reserved above via the
      // atomic decrement, so no one else can buy these units in the meantime.
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          status: OrderStatus.PAYMENT_PENDING,
          subtotal,
          shippingTotal: 0,
          discountTotal,
          total: subtotal - discountTotal,
          couponId,
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

  // Called right after order creation — starts the actual payment with
  // Notch Pay and returns the hosted checkout URL to redirect the customer to.
  async initiatePayment(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new BadRequestException("This order has already been processed");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const payment = await this.paymentsService.initializePayment({
      amount: Number(order.total),
      reference: order.orderNumber,
      email: user!.email,
      name: `${user!.firstName} ${user!.lastName}`,
      callbackUrl: `${process.env.FRONTEND_URL}/orders/${order.id}`,
    });

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "notchpay",
        providerTransactionId: payment.transaction?.reference || order.orderNumber,
        amount: order.total,
        status: PaymentStatus.PENDING,
      },
    });

    return { checkoutUrl: payment.authorization_url };
  }

  // Called by the webhook handler once Notch Pay confirms payment success.
  // This is where the order actually becomes final — atomically, since stock
  // was already safely reserved at checkout time.
  async confirmPayment(orderNumber: string, providerTransactionId: string) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber } });
    if (!order) return; // unknown order — ignore silently, don't error on webhook

    // Idempotency: if we've already processed this (webhook retried, or
    // arrived twice), don't double-process.
    if (order.status !== OrderStatus.PAYMENT_PENDING) return;

    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID } }),
      this.prisma.payment.updateMany({
        where: { orderId: order.id },
        data: { status: PaymentStatus.SUCCEEDED, providerTransactionId },
      }),
    ]);
  }

  async failPayment(orderNumber: string) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber } });
    if (!order || order.status !== OrderStatus.PAYMENT_PENDING) return;

    // Restore the stock we reserved at checkout, since the payment didn't go through.
    const items = await this.prisma.orderItem.findMany({ where: { orderId: order.id } });

    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAYMENT_FAILED } }),
      this.prisma.payment.updateMany({ where: { orderId: order.id }, data: { status: PaymentStatus.FAILED } }),
      ...items.map((item) =>
        this.prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        }),
      ),
    ]);
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