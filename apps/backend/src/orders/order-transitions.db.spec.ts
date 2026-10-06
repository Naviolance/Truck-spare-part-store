import { randomUUID } from "crypto";
import { OrderStatus, PaymentStatus } from "@truckparts/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { OrdersService } from "./orders.service";
import { OrderPaymentsService } from "./order-payments.service";
import { OrderExpiryService } from "./order-expiry.service";
import { PaymentGatewayService } from "../payments/payment-gateway.service";
import type { PaymentProvider, PaymentStatusResult } from "../payments/providers/payment-provider";

// Runs against a REAL Postgres (row locks are what make the conditional
// updates safe, and a mock can't prove that). Opt-in: `pnpm test:db`, which
// sets DB_TESTS=1 and loads DATABASE_URL from the root .env. Every fixture is
// namespaced with a random suffix and deleted afterwards.
const describeDb = process.env.DB_TESTS ? describe : describe.skip;

class FakeProvider implements PaymentProvider {
  readonly name = "fake";
  nextStatus: PaymentStatusResult = { status: "pending" };
  failCheckout = false;
  async createCheckout(input: { reference: string }) {
    if (this.failCheckout) throw new Error("provider down");
    return { checkoutUrl: `https://pay.example/${input.reference}`, providerReference: `prov-${input.reference}` };
  }
  async fetchStatus() {
    return this.nextStatus;
  }
  parseWebhook(rawBody: string) {
    const body = JSON.parse(rawBody);
    return body.signature === "valid" ? { status: body.status, reference: body.reference, amount: body.amount } : null;
  }
}

describeDb("order transitions (real database)", () => {
  const prisma = new PrismaService();
  const mail = { sendQuietly: jest.fn(), notifyAdmin: jest.fn() };
  const provider = new FakeProvider();
  const orders = new OrdersService(prisma, {} as never, mail as never);
  const payments = new OrderPaymentsService(prisma, PaymentGatewayService.withProvider(provider), orders, mail as never);
  const expiry = new OrderExpiryService(prisma, orders, payments);

  const tag = randomUUID().slice(0, 8);
  let userId: string;
  let categoryId: string;

  beforeAll(async () => {
    await prisma.$connect();
    userId = (
      await prisma.user.create({
        data: { email: `db-test-${tag}@example.com`, passwordHash: "x", firstName: "Db", lastName: "Test" },
      })
    ).id;
    categoryId = (await prisma.category.create({ data: { name: `DB Test ${tag}`, slug: `db-test-${tag}` } })).id;
  });

  afterAll(async () => {
    const orderIds = (await prisma.order.findMany({ where: { userId }, select: { id: true } })).map((o) => o.id);
    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.coupon.deleteMany({ where: { code: { startsWith: `DBT${tag}`.toUpperCase() } } });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    provider.nextStatus = { status: "pending" };
    provider.failCheckout = false;
  });

  // An order for 2 units of a product that started with 5, as checkout would
  // leave it: stock already decremented to 3.
  async function pendingOrder(opts: { createdAt?: Date; couponId?: string } = {}) {
    const n = randomUUID().slice(0, 8);
    const product = await prisma.product.create({
      data: { name: `Part ${n}`, slug: `part-${tag}-${n}`, description: "test part", price: 1000, quantity: 3, condition: "NEW", categoryId },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-T-${tag}-${n}`,
        userId,
        status: OrderStatus.PAYMENT_PENDING,
        subtotal: 2000,
        total: 2000,
        couponId: opts.couponId,
        shippingAddress: "Rue 1",
        shippingCity: "Douala",
        shippingPhone: "+237600000000",
        createdAt: opts.createdAt,
        items: { create: [{ productId: product.id, productName: product.name, unitPrice: 1000, quantity: 2 }] },
      },
    });
    return { order, productId: product.id };
  }

  const stockOf = async (productId: string) => (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).quantity;
  const statusOf = async (orderId: string) => (await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status;

  it("restocks exactly once when many callers expire the same order at the same time", async () => {
    const { order, productId } = await pendingOrder();
    await Promise.all(Array.from({ length: 8 }, () => orders.transition(order.id, OrderStatus.EXPIRED, "system")));
    expect(await statusOf(order.id)).toBe(OrderStatus.EXPIRED);
    expect(await stockOf(productId)).toBe(5); // 3 + 2, not 3 + 16
  });

  it("an admin can't click an unpaid order into PAID", async () => {
    const { order } = await pendingOrder();
    await expect(orders.updateStatus(order.id, OrderStatus.PAID)).rejects.toThrow(/can't go from PAYMENT_PENDING to PAID/);
  });

  it("a failed checkout start keeps the order payable, and a retry is a new attempt", async () => {
    const { order } = await pendingOrder();
    provider.failCheckout = true;
    await expect(payments.startOnlinePayment(userId, order.id)).rejects.toThrow(/couldn't reach the payment service/);
    expect(await statusOf(order.id)).toBe(OrderStatus.PAYMENT_PENDING);

    provider.failCheckout = false;
    const { checkoutUrl } = await payments.startOnlinePayment(userId, order.id);
    expect(checkoutUrl).toContain(`${order.orderNumber}-2`);
    const attempts = await prisma.payment.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "asc" } });
    expect(attempts.map((p) => p.status)).toEqual([PaymentStatus.FAILED, PaymentStatus.PENDING]);
  });

  it("a duplicated success webhook confirms the order once", async () => {
    const { order, productId } = await pendingOrder();
    await payments.startOnlinePayment(userId, order.id);
    const body = JSON.stringify({ signature: "valid", status: "succeeded", reference: `${order.orderNumber}-1`, amount: 2000 });
    await Promise.all([1, 2, 3].map(() => payments.handleWebhook("fake", body, {})));
    expect(await statusOf(order.id)).toBe(OrderStatus.PAID);
    expect(await stockOf(productId)).toBe(3);
    expect(mail.notifyAdmin).not.toHaveBeenCalledWith(expect.stringContaining(order.orderNumber), expect.anything());
  });

  it("rejects a forged webhook and an underpaid one", async () => {
    const { order } = await pendingOrder();
    await payments.startOnlinePayment(userId, order.id);
    const forged = JSON.stringify({ signature: "forged", status: "succeeded", reference: `${order.orderNumber}-1` });
    expect(await payments.handleWebhook("fake", forged, {})).toBe(false);
    const underpaid = JSON.stringify({ signature: "valid", status: "succeeded", reference: `${order.orderNumber}-1`, amount: 10 });
    await payments.handleWebhook("fake", underpaid, {});
    expect(await statusOf(order.id)).toBe(OrderStatus.PAYMENT_PENDING);
  });

  it("a failed attempt doesn't fail or restock the order", async () => {
    const { order, productId } = await pendingOrder();
    await payments.startOnlinePayment(userId, order.id);
    await payments.handleWebhook("fake", JSON.stringify({ signature: "valid", status: "failed", reference: `${order.orderNumber}-1` }), {});
    expect(await statusOf(order.id)).toBe(OrderStatus.PAYMENT_PENDING);
    expect(await stockOf(productId)).toBe(3);
  });

  it("a payment success racing the expiry job ends PAID with stock still reserved", async () => {
    const { order, productId } = await pendingOrder();
    await payments.startOnlinePayment(userId, order.id);
    const success = JSON.stringify({ signature: "valid", status: "succeeded", reference: `${order.orderNumber}-1`, amount: 2000 });
    await Promise.all([
      orders.transition(order.id, OrderStatus.EXPIRED, "system"),
      payments.handleWebhook("fake", success, {}),
    ]);
    // Whichever ran first, a late success revives an expired order.
    expect(await statusOf(order.id)).toBe(OrderStatus.PAID);
    expect(await stockOf(productId)).toBe(3);
  });

  it("a late payment for an expired order whose stock was sold is DISPUTED and flagged", async () => {
    const { order, productId } = await pendingOrder();
    await payments.startOnlinePayment(userId, order.id);
    await orders.transition(order.id, OrderStatus.EXPIRED, "system");
    await prisma.product.update({ where: { id: productId }, data: { quantity: 0 } }); // sold to someone else
    await payments.handleWebhook("fake", JSON.stringify({ signature: "valid", status: "succeeded", reference: `${order.orderNumber}-1`, amount: 2000 }), {});
    expect(await statusOf(order.id)).toBe(OrderStatus.DISPUTED);
    expect(mail.notifyAdmin).toHaveBeenCalledWith(expect.stringContaining(order.orderNumber), expect.stringContaining("refund"));
  });

  it("the expiry job releases old unpaid orders, gives back the coupon, and leaves fresh/cash ones alone", async () => {
    const coupon = await prisma.coupon.create({ data: { code: `DBT${tag}`.toUpperCase(), type: "FIXED", value: 100, usedCount: 1 } });
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000);
    const stale = await pendingOrder({ createdAt: twoHoursAgo, couponId: coupon.id });
    const fresh = await pendingOrder();
    const cash = await pendingOrder({ createdAt: twoHoursAgo });
    await orders.selectCashPayment(userId, cash.order.id);
    // The cash payment row was just created, so it's recent activity — also
    // backdate it to prove the 72h cash window (not 60 min) is what applies.
    await prisma.payment.updateMany({ where: { orderId: cash.order.id }, data: { createdAt: twoHoursAgo } });

    await expiry.expireStaleOrders();

    expect(await statusOf(stale.order.id)).toBe(OrderStatus.EXPIRED);
    expect(await stockOf(stale.productId)).toBe(5);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(0);
    expect(await statusOf(fresh.order.id)).toBe(OrderStatus.PAYMENT_PENDING);
    expect(await statusOf(cash.order.id)).toBe(OrderStatus.PAYMENT_PENDING);
  });

  it("the expiry job checks with the provider first and confirms a paid-but-unnotified order", async () => {
    const { order, productId } = await pendingOrder();
    await payments.startOnlinePayment(userId, order.id);
    // Backdate both the order and its attempt past the 60-minute window.
    const old = new Date(Date.now() - 2 * 3600_000);
    await prisma.order.update({ where: { id: order.id }, data: { createdAt: old } });
    await prisma.payment.updateMany({ where: { orderId: order.id }, data: { createdAt: old } });
    provider.nextStatus = { status: "succeeded", amount: 2000 };

    await expiry.expireStaleOrders();

    expect(await statusOf(order.id)).toBe(OrderStatus.PAID);
    expect(await stockOf(productId)).toBe(3);
  });
});
