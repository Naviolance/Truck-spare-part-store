import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { PaymentsService } from "../payments/payments.service";
import { CouponsService } from "../coupons/coupons.service";
import { MailService } from "../mail/mail.service";
import { OrderStatus, PaymentStatus } from "@truckparts/prisma";
import { CreateOrderDto } from "./dto/create-order.dto";
import { generateOrderNumber } from "../common/utils/order-number";

const STATUS_EMAIL_CONTENT: Partial<Record<OrderStatus, { subject: string; body: string }>> = {
  [OrderStatus.PAID]: {
    subject: "confirmed",
    body: "We've received your payment. We'll email you again once it ships.",
  },
  [OrderStatus.PROCESSING]: {
    subject: "is being processed",
    body: "Your order is now being prepared.",
  },
  [OrderStatus.SHIPPED]: {
    subject: "has shipped",
    body: "Your order is on its way.",
  },
  [OrderStatus.DELIVERED]: {
    subject: "was delivered",
    body: "Your order has been marked as delivered. We hope you're happy with it!",
  },
  [OrderStatus.PAYMENT_FAILED]: {
    subject: "payment failed",
    body: "We couldn't process payment for this order. The items have been released back to stock — feel free to try again.",
  },
  [OrderStatus.CANCELLED]: {
    subject: "was cancelled",
    body: "This order has been cancelled.",
  },
  [OrderStatus.REFUNDED]: {
    subject: "was refunded",
    body: "This order has been refunded.",
  },
  [OrderStatus.PARTIALLY_REFUNDED]: {
    subject: "was partially refunded",
    body: "Part of this order has been refunded.",
  },
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private couponsService: CouponsService,
    private mailService: MailService,
  ) {}

  // Best-effort — a flaky mail server shouldn't ever block a real state
  // change like a payment confirming or stock being restored. DISPUTED,
  // CART, and PAYMENT_PENDING have no entry above, so this is a no-op for
  // those on purpose.
  private async notifyStatusChange(orderId: string, status: OrderStatus) {
    const entry = STATUS_EMAIL_CONTENT[status];
    if (!entry) return;

    try {
      const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
      if (!order) return;

      await this.mailService.sendMail(
        order.user.email,
        `Order ${order.orderNumber} ${entry.subject}`,
        `<p>Hi ${order.user.firstName},</p><p>${entry.body}</p><p>Order: ${order.orderNumber}</p>`,
      );
    } catch (err) {
      console.error("Failed to send order status email:", err);
    }
  }

  // Checkout without overselling.
  //
  // Problem: two customers check out the last unit of a part at the same
  // time. A naive "read stock, check it, then write stock - qty" lets both
  // reads see 1 in stock, so both orders succeed and stock goes to -1.
  //
  // Solution: the check and the decrement are one SQL statement
  // (UPDATE ... SET quantity = quantity - n WHERE id = ? AND quantity >= n).
  // Postgres locks the row while it updates, so the second request re-checks
  // the new value and matches 0 rows. count === 0 means "not enough stock",
  // and throwing inside $transaction rolls back every earlier decrement,
  // the coupon use and the order. The customer gets all items or nothing.
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

  // Customer chose to pay cash at pickup instead of online — no gateway
  // involved, so there's no checkoutUrl to redirect to. The order stays
  // PAYMENT_PENDING (stock is already reserved from checkout()) until an
  // admin confirms cash was actually received, via confirmCashPayment below.
  async selectCashPayment(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new BadRequestException("This order has already been processed");
    }

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "cash",
        amount: order.total,
        status: PaymentStatus.PENDING,
      },
    });

    return order;
  }

  // Admin-triggered — the counterpart to confirmPayment() for orders paid in
  // person rather than through the webhook. Only usable on an order that
  // actually has a pending cash payment, so a normal online order can't be
  // marked paid through this shortcut.
  async confirmCashPayment(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new BadRequestException("This order has already been processed");
    }

    const cashPayment = await this.prisma.payment.findFirst({
      where: { orderId, provider: "cash", status: PaymentStatus.PENDING },
    });
    if (!cashPayment) throw new BadRequestException("This order has no pending cash payment");

    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID } }),
      this.prisma.payment.update({ where: { id: cashPayment.id }, data: { status: PaymentStatus.SUCCEEDED } }),
    ]);

    // Fire-and-forget: a slow or failing mail provider must never block the
    // caller — this can now run from a customer's browser polling
    // GET /orders/:id, not just the webhook or an admin action.
    void this.notifyStatusChange(order.id, OrderStatus.PAID);
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

    // Fire-and-forget: a slow or failing mail provider must never block the
    // caller — this can now run from a customer's browser polling
    // GET /orders/:id, not just the webhook or an admin action.
    void this.notifyStatusChange(order.id, OrderStatus.PAID);
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

    void this.notifyStatusChange(order.id, OrderStatus.PAYMENT_FAILED);
  }

  // Admin-triggered cancel/refund. Picks CANCELLED vs REFUNDED automatically
  // based on whether the order was ever actually paid — stock is always
  // restored either way, since checkout reserved it regardless of outcome.
  // Actually returning money to the customer via Notch Pay is a manual step
  // for now (payment-gateway integration for refunds isn't wired up yet).
  async cancelOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException("Order not found");

    const alreadyFinal: OrderStatus[] = [
      OrderStatus.CANCELLED,
      OrderStatus.REFUNDED,
      OrderStatus.PARTIALLY_REFUNDED,
    ];
    if (alreadyFinal.includes(order.status)) {
      throw new BadRequestException("This order has already been cancelled or refunded");
    }

    const wasPaid = order.status !== OrderStatus.PAYMENT_PENDING && order.status !== OrderStatus.PAYMENT_FAILED;
    const newStatus = wasPaid ? OrderStatus.REFUNDED : OrderStatus.CANCELLED;

    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: order.id }, data: { status: newStatus } }),
      this.prisma.payment.updateMany({
        where: { orderId: order.id, status: PaymentStatus.SUCCEEDED },
        data: { status: PaymentStatus.REFUNDED },
      }),
      ...order.items.map((item) =>
        this.prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        }),
      ),
    ]);

    void this.notifyStatusChange(order.id, newStatus);

    return this.prisma.order.findUnique({ where: { id: order.id }, include: { items: true } });
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, payments: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(userId: string, orderId: string, isAdmin: boolean) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true, user: { select: { firstName: true, lastName: true, email: true } } },
    });

    if (!order) throw new NotFoundException("Order not found");
    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException("You do not have access to this order");
    }

    // The webhook that normally confirms payment can be delayed — or, if
    // Notch Pay can't reach this backend at all (e.g. it's running on
    // localhost), never arrive. So whenever someone checks a still-pending
    // online order, also ask Notch Pay directly whether it actually went
    // through, and self-heal instead of relying on the webhook alone.
    const notchPayment = order.payments.find((p) => p.provider === "notchpay");
    if (order.status === OrderStatus.PAYMENT_PENDING && notchPayment?.providerTransactionId) {
      try {
        const { transaction } = await this.paymentsService.verifyPayment(notchPayment.providerTransactionId);
        if (transaction?.status === "complete") {
          await this.confirmPayment(order.orderNumber, transaction.reference);
        } else if (["failed", "expired", "canceled", "declined"].includes(transaction?.status)) {
          await this.failPayment(order.orderNumber);
        }
      } catch {
        // Notch Pay lookup failed (network blip, unknown reference) — fall
        // back to what we already have rather than blocking the page on it.
      }
      return this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, payments: true, user: { select: { firstName: true, lastName: true, email: true } } },
      });
    }

    return order;
  }

  async findAllAdmin() {
    return this.prisma.order.findMany({
      include: { items: true, payments: true, user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found");

    const updated = await this.prisma.order.update({ where: { id: orderId }, data: { status } });
    void this.notifyStatusChange(orderId, status);
    return updated;
  }
}