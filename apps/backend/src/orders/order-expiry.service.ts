import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { OrderStatus } from "@truckparts/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { OrdersService } from "./orders.service";
import { OrderPaymentsService } from "./order-payments.service";

const MINUTE = 60_000;
const BATCH_SIZE = 100;

// Releases stock held by orders nobody paid for. Checkout reserves units
// immediately (so two people can't buy the last one), which means an
// abandoned order would otherwise lock those units forever.
//
// - Online / not-yet-chosen: ORDER_PAYMENT_TTL_MINUTES after the last
//   activity (order creation or latest payment attempt), default 60.
// - Cash at pickup: CASH_PICKUP_TTL_HOURS, default 72 — the customer needs
//   time to come by.
//
// Safe to run on several instances at once: each expiry is a conditional
// transition, so a second runner finds nothing left to do.
@Injectable()
export class OrderExpiryService {
  private readonly logger = new Logger(OrderExpiryService.name);

  constructor(
    private prisma: PrismaService,
    private orders: OrdersService,
    private orderPayments: OrderPaymentsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireStaleOrders(now = new Date()) {
    const onlineTtl = Number(process.env.ORDER_PAYMENT_TTL_MINUTES || 60) * MINUTE;
    const cashTtl = Number(process.env.CASH_PICKUP_TTL_HOURS || 72) * 60 * MINUTE;

    const candidates = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PAYMENT_PENDING,
        createdAt: { lt: new Date(now.getTime() - Math.min(onlineTtl, cashTtl)) },
      },
      include: { payments: true },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
    });

    let expired = 0;
    for (const order of candidates) {
      const isCash = order.payments.some((p) => p.provider === "cash" && p.status === "PENDING");
      const lastActivity = Math.max(order.createdAt.getTime(), ...order.payments.map((p) => p.createdAt.getTime()));
      if (now.getTime() - lastActivity < (isCash ? cashTtl : onlineTtl)) continue;

      try {
        // The customer may have paid and the webhook got lost — ask first.
        await this.orderPayments.reconcilePending(order.id);
        // No-op (null) if reconciliation just marked it PAID.
        if (await this.orders.transition(order.id, OrderStatus.EXPIRED, "system")) expired++;
      } catch (err) {
        this.logger.error(`Couldn't expire ${order.orderNumber}: ${err instanceof Error ? err.message : err}`);
      }
    }

    if (expired > 0) this.logger.log(`Expired ${expired} unpaid order(s) and released their stock`);
    return expired;
  }
}
