import { OrderStatus as S } from "@truckparts/prisma";
import { canTransition, nextStatusesForAdmin, releasesCoupon, releasesStock, reservesStock } from "./order-status";

describe("order state machine", () => {
  it("only the system can mark an order PAID", () => {
    expect(canTransition("system", S.PAYMENT_PENDING, S.PAID)).toBe(true);
    expect(canTransition("admin", S.PAYMENT_PENDING, S.PAID)).toBe(false);
    expect(nextStatusesForAdmin(S.PAYMENT_PENDING)).toEqual([S.CANCELLED]);
  });

  it("final statuses can't be changed by an admin", () => {
    for (const s of [S.CANCELLED, S.EXPIRED, S.REFUNDED, S.PAYMENT_FAILED]) {
      expect(nextStatusesForAdmin(s)).toEqual([]);
    }
  });

  it("can't go backwards from fulfilment to unpaid", () => {
    expect(canTransition("admin", S.SHIPPED, S.PAYMENT_PENDING)).toBe(false);
    expect(canTransition("admin", S.DELIVERED, S.PAID)).toBe(false);
  });

  it("restocks only when held units are released", () => {
    expect(releasesStock(S.PAYMENT_PENDING, S.EXPIRED)).toBe(true);
    expect(releasesStock(S.PAID, S.REFUNDED)).toBe(true);
    // the part already left the store: admin decides
    expect(releasesStock(S.DELIVERED, S.REFUNDED)).toBe(false);
    expect(releasesStock(S.SHIPPED, S.REFUNDED)).toBe(false);
  });

  it("re-reserves stock when a late payment revives an expired order", () => {
    expect(reservesStock(S.EXPIRED, S.PAID)).toBe(true);
    expect(reservesStock(S.PAYMENT_PENDING, S.PAID)).toBe(false);
  });

  it("gives the coupon use back only for never-paid orders", () => {
    expect(releasesCoupon(S.PAYMENT_PENDING, S.EXPIRED)).toBe(true);
    expect(releasesCoupon(S.PAID, S.REFUNDED)).toBe(false);
  });
});
