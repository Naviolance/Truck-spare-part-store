import { BadRequestException, ConflictException } from "@nestjs/common";
import { OrdersService } from "./orders.service";

// Checkout's claim-the-cart and reserve-stock logic, with a mocked Prisma.
// Status transitions (cancel, expiry, payments, double-restock races) are
// tested against a real Postgres in order-transitions.db.spec.ts.

describe("OrdersService.checkout", () => {
  const dto = { shippingAddress: "Rue 1", shippingCity: "Douala", shippingPhone: "+237600000000" } as any;
  const cartItems = [
    { id: "ci-1", productId: "product-1", quantity: 2, product: { name: "Brake pad", price: 1000 } },
    { id: "ci-2", productId: "product-2", quantity: 1, product: { name: "Oil filter", price: 500 } },
  ];

  let tx: any;
  let couponsService: { applyWithinTransaction: jest.Mock };
  let service: OrdersService;

  beforeEach(() => {
    tx = {
      cartItem: {
        findMany: jest.fn().mockResolvedValue(cartItems),
        deleteMany: jest.fn().mockResolvedValue({ count: cartItems.length }),
      },
      product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      order: { create: jest.fn().mockResolvedValue({ id: "order-1", items: [] }) },
    };
    const prisma = {
      cart: { findUnique: jest.fn().mockResolvedValue({ id: "cart-1" }) },
      $transaction: jest.fn((fn: (tx: any) => unknown) => fn(tx)),
    };
    couponsService = { applyWithinTransaction: jest.fn() };
    service = new OrdersService(prisma as any, couponsService as any, { notifyAdmin: jest.fn() } as any);
  });

  it("claims the cart items, reserves stock and creates the order", async () => {
    await expect(service.checkout("user-1", dto)).resolves.toEqual({ id: "order-1", items: [] });
    expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["ci-1", "ci-2"] } } });
    expect(tx.product.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.order.create.mock.calls[0][0].data.subtotal).toBe(2500);
  });

  it("rejects a double-submitted checkout before touching stock, coupons or orders", async () => {
    // A concurrent checkout of the same cart already deleted the items.
    tx.cartItem.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.checkout("user-1", { ...dto, couponCode: "SAVE10" })).rejects.toThrow(ConflictException);
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(couponsService.applyWithinTransaction).not.toHaveBeenCalled();
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it("rejects an empty cart", async () => {
    tx.cartItem.findMany.mockResolvedValue([]);
    await expect(service.checkout("user-1", dto)).rejects.toThrow(BadRequestException);
    expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
  });
});
