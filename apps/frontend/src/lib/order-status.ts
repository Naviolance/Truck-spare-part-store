"use client";
import { useTranslations } from "next-intl";

type OrderLike = { status: string; payments: { provider: string; status: string }[] };

export function isAwaitingCash(order: OrderLike): boolean {
  return order.status === "PAYMENT_PENDING" && order.payments.some((p) => p.provider === "cash" && p.status === "PENDING");
}

// Customer-facing wording for an order's status (never the raw enum).
export function useOrderStatusLabel() {
  const t = useTranslations("OrderStatus");
  return (order: OrderLike) => {
    if (isAwaitingCash(order)) return t("AWAITING_CASH");
    return t.has(order.status) ? t(order.status as "PAID") : order.status;
  };
}

// Where an order is on the normal path (received → confirmed → ready →
// collected), as the index of the step in progress; 4 = all done. Orders
// off that path (expired, failed, cancelled, refunded, disputed) get no
// tracker — the order page explains those with its own message.
const STEP: Record<string, number> = { PAYMENT_PENDING: 1, PAID: 2, PROCESSING: 2, SHIPPED: 3, DELIVERED: 4 };

export function hasTracker(status: string): boolean {
  return status in STEP;
}

// The step in progress (1–3), 4 when collected, undefined off the path.
export function trackerStep(status: string): number | undefined {
  return STEP[status];
}
