import { OrderStatus } from "@truckparts/prisma";

// The order state machine — the single source of truth for which status
// changes are legal, and what each one does to stock. Everything that changes
// an order's status goes through OrdersService.transition(), which enforces
// this table server-side; the admin UI only renders `nextStatusesForAdmin()`.
//
// Two actors, because they're trusted with different things:
// - "system": payment results (webhook/reconciliation), cash confirmation,
//   the expiry job. Only the system can mark an order PAID — a human can't
//   click an online order into "paid" without money having arrived.
// - "admin":  fulfilment (processing, shipped, delivered), cancel, refund.

export type Actor = "system" | "admin";

const S = OrderStatus;

const ALLOWED: Record<Actor, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  system: {
    [S.PAYMENT_PENDING]: [S.PAID, S.EXPIRED, S.PAYMENT_FAILED],
    // A payment that succeeds after the order expired: revive it if the stock
    // can still be reserved, otherwise flag it for the admin to refund.
    [S.EXPIRED]: [S.PAID, S.DISPUTED],
    [S.PAYMENT_FAILED]: [S.DISPUTED],
    [S.CANCELLED]: [S.DISPUTED],
  },
  admin: {
    [S.PAYMENT_PENDING]: [S.CANCELLED],
    [S.PAID]: [S.PROCESSING, S.SHIPPED, S.DELIVERED, S.REFUNDED, S.DISPUTED],
    [S.PROCESSING]: [S.SHIPPED, S.DELIVERED, S.REFUNDED, S.DISPUTED],
    [S.SHIPPED]: [S.DELIVERED, S.REFUNDED, S.DISPUTED],
    [S.DELIVERED]: [S.REFUNDED, S.PARTIALLY_REFUNDED, S.DISPUTED],
    [S.PARTIALLY_REFUNDED]: [S.REFUNDED, S.DISPUTED],
    [S.DISPUTED]: [S.DELIVERED, S.REFUNDED, S.PARTIALLY_REFUNDED],
  },
};

// Statuses in which the order's units are still physically in the store and
// counted as reserved (decremented from Product.quantity at checkout).
const STOCK_HELD: OrderStatus[] = [S.PAYMENT_PENDING, S.PAID, S.PROCESSING];

// Statuses meaning "this sale isn't happening": units go back on the shelf.
const RELEASED: OrderStatus[] = [S.PAYMENT_FAILED, S.EXPIRED, S.CANCELLED, S.REFUNDED];

export function canTransition(actor: Actor, from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[actor][from]?.includes(to) ?? false;
}

export function nextStatusesForAdmin(from: OrderStatus): OrderStatus[] {
  return ALLOWED.admin[from] ?? [];
}

// Restock only when units were held AND the sale is now off. A refund after
// SHIPPED/DELIVERED does NOT restock automatically: the part left the store
// and may come back damaged or not at all — the admin adjusts stock by hand.
export function releasesStock(from: OrderStatus, to: OrderStatus): boolean {
  return STOCK_HELD.includes(from) && RELEASED.includes(to);
}

// The reverse: a late payment reviving an EXPIRED order must re-reserve units.
export function reservesStock(from: OrderStatus, to: OrderStatus): boolean {
  return RELEASED.includes(from) && STOCK_HELD.includes(to);
}

// A never-paid order giving up its coupon use, so a single-use coupon isn't
// burned by an abandoned checkout.
export function releasesCoupon(from: OrderStatus, to: OrderStatus): boolean {
  return from === S.PAYMENT_PENDING && RELEASED.includes(to);
}

// The admin's order tabs (redesign step 6): what still needs the owner, what
// is under way, what is finished, and what ended without a sale. Every
// status is in exactly one group (order-status.spec.ts checks it).
export const ORDER_GROUPS = {
  todo: [S.PAYMENT_PENDING, S.DISPUTED],
  doing: [S.PAID, S.PROCESSING, S.SHIPPED],
  done: [S.DELIVERED],
  closed: [S.EXPIRED, S.PAYMENT_FAILED, S.CANCELLED, S.REFUNDED, S.PARTIALLY_REFUNDED],
} satisfies Record<string, OrderStatus[]>;
export type OrderGroup = keyof typeof ORDER_GROUPS;
