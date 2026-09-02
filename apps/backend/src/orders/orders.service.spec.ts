import { BadRequestException, NotFoundException } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrderStatus, PaymentStatus } from "@truckparts/prisma";

function makeOrder(overrides: Partial<any> = {}) {
  return {
    id: "order-1",
    orderNumber: "ORD-1",
    status: OrderStatus.PAID,
    items: [
      { id: "item-1", productId: "product-1", quantity: 2 },
      { id: "item-2", productId: "product-2", quantity: 1 },
    ],
    user: { email: "buyer@example.com", firstName: "Test" },
    ...overrides,
  };
}

function mockPrisma() {
  return {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      updateMany: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
    $transaction: jest.fn().mockResolvedValue(undefined),
  };
}

describe("OrdersService.cancelOrder", () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let mailService: { sendMail: jest.Mock };
  let service: OrdersService;

  beforeEach(() => {
    prisma = mockPrisma();
    mailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
    // paymentsService and couponsService aren't touched by cancelOrder — empty stubs.
    service = new OrdersService(prisma as any, {} as any, {} as any, mailService as any);
  });

  it("throws NotFoundException for a nonexistent order", async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(service.cancelOrder("missing")).rejects.toThrow(NotFoundException);
  });

  it("refuses to cancel an order that's already CANCELLED, REFUNDED, or PARTIALLY_REFUNDED", async () => {
    for (const status of [OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED]) {
      prisma.order.findUnique.mockResolvedValueOnce(makeOrder({ status }));
      await expect(service.cancelOrder("order-1")).rejects.toThrow(BadRequestException);
    }
    // The critical assertion: it must bail out BEFORE running the
    // stock-restoration transaction, or stock would be restored twice for an
    // order someone accidentally (or maliciously) tries to cancel repeatedly.
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("marks a PAID order as REFUNDED (it had actually been paid)", async () => {
    prisma.order.findUnique
      .mockResolvedValueOnce(makeOrder({ status: OrderStatus.PAID }))
      .mockResolvedValueOnce(makeOrder({ status: OrderStatus.REFUNDED }));

    await service.cancelOrder("order-1");

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: OrderStatus.REFUNDED },
    });
  });

  it("marks a never-paid order as CANCELLED, not REFUNDED", async () => {
    prisma.order.findUnique
      .mockResolvedValueOnce(makeOrder({ status: OrderStatus.PAYMENT_PENDING }))
      .mockResolvedValueOnce(makeOrder({ status: OrderStatus.CANCELLED }));

    await service.cancelOrder("order-1");

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: OrderStatus.CANCELLED },
    });
  });

  it("restores stock for every item in the order", async () => {
    const order = makeOrder({ status: OrderStatus.PAID });
    prisma.order.findUnique.mockResolvedValueOnce(order).mockResolvedValueOnce(order);

    await service.cancelOrder("order-1");

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: "product-1" },
      data: { quantity: { increment: 2 } },
    });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: "product-2" },
      data: { quantity: { increment: 1 } },
    });
  });

  it("marks any SUCCEEDED payment as REFUNDED", async () => {
    const order = makeOrder({ status: OrderStatus.PAID });
    prisma.order.findUnique.mockResolvedValueOnce(order).mockResolvedValueOnce(order);

    await service.cancelOrder("order-1");

    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { orderId: "order-1", status: PaymentStatus.SUCCEEDED },
      data: { status: PaymentStatus.REFUNDED },
    });
  });

  it("sends the customer a status email and never lets a mail failure break the cancellation", async () => {
    const order = makeOrder({ status: OrderStatus.PAID });
    prisma.order.findUnique
      .mockResolvedValueOnce(order) // initial lookup inside cancelOrder
      .mockResolvedValueOnce(order) // the return-value lookup at the end
      .mockResolvedValueOnce(order); // notifyStatusChange's own lookup
    mailService.sendMail.mockRejectedValueOnce(new Error("Mailhog is down"));

    await expect(service.cancelOrder("order-1")).resolves.toBeDefined();
    expect(mailService.sendMail).toHaveBeenCalled();
  });
});
