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
