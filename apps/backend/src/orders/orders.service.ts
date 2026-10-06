import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CouponsService } from "../coupons/coupons.service";
import { MailService } from "../mail/mail.service";
import { Order, OrderStatus, PaymentStatus, Prisma } from "@truckparts/prisma";
import { CreateOrderDto } from "./dto/create-order.dto";
import { generateOrderNumber } from "../common/utils/order-number";
import { escapeHtml } from "../common/utils/escape-html";
import { formatXaf } from "../common/utils/money";
import { Actor, canTransition, nextStatusesForAdmin, releasesCoupon, releasesStock, reservesStock } from "./order-status";

const STATUS_EMAIL_CONTENT: Partial<Record<OrderStatus, { subject: string; body: string }>> = {
  [OrderStatus.PAID]: {
    subject: "confirmed",
    body: "We've received your payment. We'll let you know when your order is ready.",
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
  [OrderStatus.EXPIRED]: {
    subject: "has expired",
    body: "We didn't receive payment for this order in time, so the items were released back to stock. You're welcome to order again.",
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

const ORDER_DETAIL_INCLUDE = {
  items: true,
  payments: true,
  user: { select: { firstName: true, lastName: true, email: true } },
} satisfies Prisma.OrderInclude;

// Thrown inside a transition's transaction when a late payment tries to
// revive an EXPIRED order but its units have since been sold to someone else.
export class StockUnavailableError extends Error {}

type TransitionOptions = {
  // Extra writes that must commit atomically with the status change (e.g.
  // marking the cash payment SUCCEEDED together with the order becoming PAID).
  inTransaction?: (tx: Prisma.TransactionClient, order: Order) => Promise<void>;
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private couponsService: CouponsService,
    private mailService: MailService,
  ) {}

  // The ONLY place an existing order's status changes. Enforces the state
  // machine in order-status.ts and applies its stock/coupon side effects.
  //
  // Why it can't double-restock: the status change is a conditional
  // `UPDATE ... WHERE id = ? AND status = <the status we read>`. If two
  // callers race (a webhook and the expiry job, two admin clicks...), both
  // may read PAYMENT_PENDING, but Postgres row-locks the first UPDATE; the
  // second re-checks `status = PAYMENT_PENDING` after the lock is released,
  // matches 0 rows, and stops BEFORE touching stock. Same idea as checkout().
  //
  // Returns the order with its previous status, or null when nothing changed
  // (already in that status, a concurrent caller won, or — for the system
  // actor — the move isn't allowed). Admin requests for illegal moves throw.
  async transition(orderId: string, to: OrderStatus, actor: Actor, options: TransitionOptions = {}) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new NotFoundException("Order not found");
      const from = order.status;
      if (from === to) return null;

      if (!canTransition(actor, from, to)) {
        if (actor === "admin") throw new BadRequestException(`An order can't go from ${from} to ${to}`);
        return null;
      }

      const claimed = await tx.order.updateMany({ where: { id: orderId, status: from }, data: { status: to } });
      if (claimed.count === 0) return null;

      if (releasesStock(from, to)) {
        for (const item of order.items) {
          await tx.product.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity } } });
        }
      }

      if (reservesStock(from, to)) {
        for (const item of order.items) {
          const reserved = await tx.product.updateMany({
            where: { id: item.productId, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } },
          });
          if (reserved.count === 0) throw new StockUnavailableError(item.productName);
        }
      }

      if (releasesCoupon(from, to) && order.couponId) {
        await tx.coupon.updateMany({
          where: { id: order.couponId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }

      if (to === OrderStatus.REFUNDED) {
        await tx.payment.updateMany({
          where: { orderId, status: PaymentStatus.SUCCEEDED },
          data: { status: PaymentStatus.REFUNDED },
        });
      } else if (to === OrderStatus.EXPIRED || to === OrderStatus.CANCELLED || to === OrderStatus.PAYMENT_FAILED) {
        await tx.payment.updateMany({
          where: { orderId, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED },
        });
      }

      await options.inTransaction?.(tx, order);
      return { ...order, status: to, previousStatus: from };
    });

    if (result) this.notifyStatusChange(orderId, to);
    return result;
  }

  // Fire-and-forget (see MailService.sendQuietly). DISPUTED, CART and
  // PAYMENT_PENDING have no entry, so they don't email the customer.
  private notifyStatusChange(orderId: string, status: OrderStatus) {
    const entry = STATUS_EMAIL_CONTENT[status];
    if (!entry) return;

    this.prisma.order
      .findUnique({ where: { id: orderId }, include: { user: true } })
      .then((order) => {
        if (!order) return;
        this.mailService.sendQuietly(
          order.user.email,
          `Order ${order.orderNumber} ${entry.subject}`,
          `<p>Hi ${escapeHtml(order.user.firstName)},</p><p>${entry.body}</p><p>Order: ${order.orderNumber}</p>`,
        );
      })
      .catch((err) => console.error("Failed to load order for status email:", err));
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
  //
  // The same idea stops a double-submitted checkout (double click, retry):
  // each request first "claims" the cart by deleting its items. Only one
  // request can delete them; the other deletes fewer rows than it read and
  // stops before touching stock or coupons.
  //
  // The order is PAYMENT_PENDING until paid (online or cash). If it never is,
  // OrderExpiryService releases the stock after the time limit.
  async checkout(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new BadRequestException("Cart is empty");

    const order = await this.prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { cartId: cart.id },
        include: { product: true },
      });

      if (cartItems.length === 0) throw new BadRequestException("Cart is empty");

      // Claim the cart. A concurrent checkout of the same cart waits on these
      // row locks, then finds the rows already gone.
      const claimed = await tx.cartItem.deleteMany({
        where: { id: { in: cartItems.map((item) => item.id) } },
      });

      if (claimed.count !== cartItems.length) {
        throw new ConflictException("This cart is already being checked out");
      }

      let subtotal = 0;

      for (const item of cartItems) {
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

      return tx.order.create({
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
    });

    this.mailService.notifyAdmin(
      `New order ${order.orderNumber} — ${formatXaf(order.total)}`,
      `<p>A new order was placed.</p>
       <ul>${order.items.map((i) => `<li>${i.quantity} × ${escapeHtml(i.productName)}</li>`).join("")}</ul>
       <p>Total: ${formatXaf(order.total)}<br>City: ${escapeHtml(order.shippingCity)}<br>Phone: ${escapeHtml(order.shippingPhone)}</p>
       <p>It is awaiting payment; see the admin orders page.</p>`,
    );

    return order;
  }

  // Customer chose to pay cash at pickup — no gateway involved. The order
  // stays PAYMENT_PENDING (stock already reserved) until an admin confirms
  // the cash was received. Idempotent: a double click records one payment.
  async selectCashPayment(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId }, include: { payments: true } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new BadRequestException("This order has already been processed");
    }

    const hasPendingCash = order.payments.some((p) => p.provider === "cash" && p.status === PaymentStatus.PENDING);
    if (!hasPendingCash) {
      await this.prisma.payment.create({
        data: { orderId: order.id, provider: "cash", amount: order.total, status: PaymentStatus.PENDING },
      });
    }

    return order;
  }

  // Admin confirms cash was received. The order becoming PAID and the cash
  // payment becoming SUCCEEDED commit together, or neither does.
  async confirmCashPayment(orderId: string) {
    const cashPayment = await this.prisma.payment.findFirst({
      where: { orderId, provider: "cash", status: PaymentStatus.PENDING },
    });
    if (!cashPayment) throw new BadRequestException("This order has no pending cash payment");

    const result = await this.transition(orderId, OrderStatus.PAID, "system", {
      inTransaction: async (tx) => {
        await tx.payment.update({ where: { id: cashPayment.id }, data: { status: PaymentStatus.SUCCEEDED } });
      },
    });
    if (!result) throw new BadRequestException("This order has already been processed");
  }

  // Admin "cancel" button: a never-paid order is CANCELLED, a paid one is
  // REFUNDED. Actually sending the money back is manual for now.
  async cancelOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found");

    const to = order.status === OrderStatus.PAYMENT_PENDING ? OrderStatus.CANCELLED : OrderStatus.REFUNDED;
    const result = await this.transition(orderId, to, "admin");
    if (!result) throw new ConflictException("This order was changed by someone else — refresh and try again");

    return this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const result = await this.transition(orderId, status, "admin");
    if (!result) throw new ConflictException("This order was changed by someone else — refresh and try again");
    return this.prisma.order.findUnique({ where: { id: orderId } });
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, payments: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(userId: string, orderId: string, isAdmin: boolean) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: ORDER_DETAIL_INCLUDE });

    if (!order) throw new NotFoundException("Order not found");
    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException("You do not have access to this order");
    }
    return order;
  }

  // nextStatuses: what the admin dropdown may offer for each order, straight
  // from the state machine, so the UI can never propose an illegal move.
  async findAllAdmin() {
    const orders = await this.prisma.order.findMany({ include: ORDER_DETAIL_INCLUDE, orderBy: { createdAt: "desc" } });
    return orders.map((order) => ({ ...order, nextStatuses: nextStatusesForAdmin(order.status) }));
  }
}
