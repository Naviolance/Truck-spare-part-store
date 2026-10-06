import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { OrderStatus, Payment, PaymentStatus, Prisma } from "@truckparts/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { PaymentGatewayService } from "../payments/payment-gateway.service";
import type { PaymentStatusResult, PaymentWebhookEvent } from "../payments/providers/payment-provider";
import { OrdersService, StockUnavailableError } from "./orders.service";
import { formatXaf } from "../common/utils/money";

// Provider-agnostic online payments: everything between "customer clicks
// Pay" and "order is PAID", independent of which provider adapter is active.
//
// - Each attempt is its own Payment row with a unique `reference`, so a
//   customer can retry after a failed or abandoned attempt, and a late result
//   for an old attempt only ever touches that attempt's row.
// - A failed attempt does NOT fail the order: the customer can try again, and
//   OrderExpiryService releases the stock if nobody pays in time.
// - Results are applied idempotently (claim the Payment row with a
//   conditional update first), so a webhook delivered twice, or a webhook
//   racing a reconciliation poll, confirms the order once.
@Injectable()
export class OrderPaymentsService {
  private readonly logger = new Logger(OrderPaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: PaymentGatewayService,
    private orders: OrdersService,
    private mail: MailService,
  ) {}

  options() {
    const provider = this.gateway.active();
    return { cash: true, online: provider !== null };
  }

  // Start (or retry) an online payment. Safe to call again for the same
  // PAYMENT_PENDING order: each call is a new attempt.
  async startOnlinePayment(userId: string, orderId: string) {
    const provider = this.gateway.active();
    if (!provider) throw new BadRequestException("Online payment isn't available — please choose cash at pickup");

    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId }, include: { user: true } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new BadRequestException("This order can no longer be paid");
    }

    const attempt = (await this.prisma.payment.count({ where: { orderId } })) + 1;
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        provider: provider.name,
        reference: `${order.orderNumber}-${attempt}`,
        amount: order.total,
        status: PaymentStatus.PENDING,
      },
    });

    try {
      const checkout = await provider.createCheckout({
        amount: Math.round(Number(order.total)),
        currency: "XAF",
        reference: payment.reference!,
        description: `Order ${order.orderNumber}`,
        customer: { email: order.user.email, name: `${order.user.firstName} ${order.user.lastName}`, phone: order.shippingPhone },
        returnUrl: `${process.env.FRONTEND_URL}/orders/${order.id}`,
      });
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { providerTransactionId: checkout.providerReference },
      });
      return { checkoutUrl: checkout.checkoutUrl };
    } catch (err) {
      // The order and its reserved stock stay intact; only this attempt is
      // marked failed, so the customer can press "Pay" again from the order page.
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
      this.logger.error(`createCheckout failed for ${payment.reference}: ${err instanceof Error ? err.message : err}`);
      throw new ServiceUnavailableException(
        "We couldn't reach the payment service. Your order is saved — please try again in a moment.",
      );
    }
  }

  // Returns false for a bad signature (controller answers 400). Unknown
  // references are acknowledged (true) so the provider stops retrying.
  async handleWebhook(providerName: string, rawBody: string, headers: Record<string, string | string[] | undefined>) {
    const provider = this.gateway.byName(providerName);
    if (!provider) throw new NotFoundException("Unknown payment provider");

    const event = provider.parseWebhook(rawBody, headers);
    if (!event) return false;

    const payment = await this.findPaymentForEvent(provider.name, event);
    if (!payment) {
      this.logger.warn(`Webhook for unknown payment (reference=${event.reference}, provider=${event.providerReference})`);
      return true;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { rawPayload: safeJson(rawBody) },
    });
    await this.applyResult(payment, event);
    return true;
  }

  // Ask the provider directly about this order's still-pending attempts.
  // Webhooks can be late or never arrive, so the order page and the expiry
  // job call this instead of trusting the webhook alone. Never throws.
  async reconcilePending(orderId: string) {
    const provider = this.gateway.active();
    if (!provider) return;

    const pending = await this.prisma.payment.findMany({
      where: {
        orderId,
        provider: provider.name,
        status: PaymentStatus.PENDING,
        providerTransactionId: { not: null },
        order: { status: OrderStatus.PAYMENT_PENDING },
      },
    });

    for (const payment of pending) {
      try {
        const result = await provider.fetchStatus(payment.providerTransactionId!);
        await this.applyResult(payment, result);
      } catch (err) {
        this.logger.warn(`Couldn't reconcile ${payment.reference}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // Exposed for tests; webhook + reconciliation both funnel through here.
  async applyResult(payment: Payment, result: PaymentStatusResult, depth = 0): Promise<void> {
    if (result.status === "pending") return;

    if (result.status === "failed") {
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.FAILED },
      });
      return;
    }

    // Never mark an order paid for less than it costs.
    if (result.amount !== undefined && Math.round(result.amount) !== Math.round(Number(payment.amount))) {
      this.logger.error(`Amount mismatch on ${payment.reference}: expected ${payment.amount}, got ${result.amount}`);
      this.alertAdmin(payment, `reported ${formatXaf(result.amount)} instead of ${formatXaf(payment.amount)}. The order was NOT marked paid.`);
      return;
    }

    const order = await this.prisma.order.findUnique({ where: { id: payment.orderId } });
    if (!order) return;

    // Claim: only one caller gets to process this success. FAILED is
    // included because a provider can report success after we gave up on the
    // attempt — the money is real either way.
    const claim = async (client: Prisma.TransactionClient | PrismaService) =>
      (
        await client.payment.updateMany({
          where: { id: payment.id, status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] } },
          data: { status: PaymentStatus.SUCCEEDED },
        })
      ).count > 0;

    if (order.status === OrderStatus.PAYMENT_PENDING || order.status === OrderStatus.EXPIRED) {
      let changed;
      try {
        // Payment SUCCEEDED and order PAID commit together, so a crash in
        // between can't leave money recorded against an unpaid order.
        changed = await this.orders.transition(order.id, OrderStatus.PAID, "system", {
          inTransaction: async (tx) => {
            if (!(await claim(tx))) throw new AlreadyProcessedError();
          },
        });
      } catch (err) {
        if (err instanceof AlreadyProcessedError) return;
        if (!(err instanceof StockUnavailableError)) throw err;
        // Paid after expiry, but the units were sold to someone else.
        if (!(await claim(this.prisma))) return;
        await this.orders.transition(order.id, OrderStatus.DISPUTED, "system");
        this.alertAdmin(payment, "arrived after the order expired and the items are no longer in stock. Please refund the customer.");
        return;
      }
      // null = the order changed under us (e.g. another attempt just paid it):
      // re-evaluate against its new status, once.
      if (!changed && depth === 0) return this.applyResult(payment, result, 1);
      return;
    }

    if (!(await claim(this.prisma))) return;

    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.PAYMENT_FAILED) {
      await this.orders.transition(order.id, OrderStatus.DISPUTED, "system");
      this.alertAdmin(payment, `arrived for an order that was already ${order.status}. Please review and refund if needed.`);
      return;
    }

    // Already paid through another attempt: the customer paid twice.
    this.alertAdmin(payment, "is a second successful payment for an order that was already paid. Please refund one of them.");
  }

  private findPaymentForEvent(providerName: string, event: PaymentWebhookEvent) {
    const refs = [event.reference, event.providerReference].filter((r): r is string => !!r);
    if (refs.length === 0) return null;
    return this.prisma.payment.findFirst({
      where: {
        provider: providerName,
        OR: [{ reference: { in: refs } }, { providerTransactionId: { in: refs } }],
      },
    });
  }

  private alertAdmin(payment: Payment, problem: string) {
    this.mail.notifyAdmin(
      `Payment needs attention (${payment.reference})`,
      `<p>Payment <strong>${payment.reference}</strong> (${formatXaf(payment.amount)}) ${problem}</p>`,
    );
  }
}

class AlreadyProcessedError extends Error {}

function safeJson(raw: string): Prisma.InputJsonValue | undefined {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
