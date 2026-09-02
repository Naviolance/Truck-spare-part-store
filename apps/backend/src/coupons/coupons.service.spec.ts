import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { CouponsService } from "./coupons.service";
import { CouponType } from "@truckparts/prisma";

function makeCoupon(overrides: Partial<any> = {}) {
  return {
    id: "coupon-1",
    code: "SAVE10",
    type: CouponType.PERCENTAGE,
    value: "10",
    active: true,
    minOrderTotal: null,
    maxUses: null,
    usedCount: 0,
    expiresAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function mockPrisma() {
  return {
    coupon: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

describe("CouponsService", () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let service: CouponsService;

  beforeEach(() => {
    prisma = mockPrisma();
    service = new CouponsService(prisma as any);
  });

  describe("validate", () => {
    it("computes a percentage discount correctly", async () => {
      prisma.coupon.findUnique.mockResolvedValue(makeCoupon({ type: CouponType.PERCENTAGE, value: "10" }));
      const result = await service.validate("SAVE10", 1000);
      expect(result.discount).toBe(100);
    });

    it("computes a fixed discount correctly", async () => {
      prisma.coupon.findUnique.mockResolvedValue(makeCoupon({ type: CouponType.FIXED, value: "200" }));
      const result = await service.validate("SAVE10", 1000);
      expect(result.discount).toBe(200);
    });

    it("caps a fixed discount at the subtotal — never produces a negative order total", async () => {
      prisma.coupon.findUnique.mockResolvedValue(makeCoupon({ type: CouponType.FIXED, value: "1000" }));
      const result = await service.validate("SAVE10", 300);
      expect(result.discount).toBe(300);
    });

    it("normalizes the code to uppercase before looking it up", async () => {
      prisma.coupon.findUnique.mockResolvedValue(makeCoupon());
      await service.validate("save10", 1000);
      expect(prisma.coupon.findUnique).toHaveBeenCalledWith({ where: { code: "SAVE10" } });
    });

    it("rejects an unknown code", async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      await expect(service.validate("NOPE", 1000)).rejects.toThrow(BadRequestException);
    });

    it("rejects an inactive coupon", async () => {
      prisma.coupon.findUnique.mockResolvedValue(makeCoupon({ active: false }));
      await expect(service.validate("SAVE10", 1000)).rejects.toThrow(BadRequestException);
    });

    it("rejects an expired coupon", async () => {
      prisma.coupon.findUnique.mockResolvedValue(makeCoupon({ expiresAt: new Date(Date.now() - 1000) }));
      await expect(service.validate("SAVE10", 1000)).rejects.toThrow("This coupon has expired");
    });

    it("rejects when subtotal is below the minimum order total", async () => {
      prisma.coupon.findUnique.mockResolvedValue(makeCoupon({ minOrderTotal: "500" }));
      await expect(service.validate("SAVE10", 100)).rejects.toThrow(/minimum order/);
    });

    it("rejects when usedCount has already reached maxUses", async () => {
      prisma.coupon.findUnique.mockResolvedValue(makeCoupon({ maxUses: 5, usedCount: 5 }));
      await expect(service.validate("SAVE10", 1000)).rejects.toThrow(/usage limit/);
    });
  });

  describe("applyWithinTransaction", () => {
    function mockTx(coupon: any, updateManyCount = 1) {
      return {
        coupon: {
          findUnique: jest.fn().mockResolvedValue(coupon),
          update: jest.fn().mockResolvedValue(coupon),
          updateMany: jest.fn().mockResolvedValue({ count: updateManyCount }),
        },
      };
    }

    it("increments usedCount and returns the discount for a coupon with room left", async () => {
      const coupon = makeCoupon({ maxUses: 5, usedCount: 2 });
      const tx = mockTx(coupon, 1);
      const result = await service.applyWithinTransaction(tx as any, "SAVE10", 1000);
      expect(result.discount).toBe(100);
      expect(result.couponId).toBe(coupon.id);
      expect(tx.coupon.updateMany).toHaveBeenCalledWith({
        where: { id: coupon.id, usedCount: { lt: 5 } },
        data: { usedCount: { increment: 1 } },
      });
    });

    it("throws if two concurrent checkouts both try to consume the last remaining use", async () => {
      // updateMany's WHERE clause (usedCount < maxUses) is what makes this
      // race-safe — if another request already consumed the last slot between
      // our read and our write, updateMany matches 0 rows, and we must treat
      // that as a hard failure rather than silently succeeding.
      const coupon = makeCoupon({ maxUses: 1, usedCount: 0 });
      const tx = mockTx(coupon, 0);
      await expect(service.applyWithinTransaction(tx as any, "SAVE10", 1000)).rejects.toThrow(/usage limit/);
    });

    it("uses a plain update (no race-check needed) for unlimited coupons", async () => {
      const coupon = makeCoupon({ maxUses: null, usedCount: 40 });
      const tx = mockTx(coupon);
      await service.applyWithinTransaction(tx as any, "SAVE10", 1000);
      expect(tx.coupon.updateMany).not.toHaveBeenCalled();
      expect(tx.coupon.update).toHaveBeenCalledWith({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    });
  });

  describe("create", () => {
    it("uppercases the code and rejects a duplicate", async () => {
      prisma.coupon.findUnique.mockResolvedValue(makeCoupon());
      await expect(
        service.create({ code: "save10", type: CouponType.PERCENTAGE, value: 10 } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("remove", () => {
    it("throws NotFoundException for a nonexistent coupon", async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      await expect(service.remove("missing-id")).rejects.toThrow(NotFoundException);
    });
  });
});
