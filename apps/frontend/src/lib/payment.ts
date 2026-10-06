"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export type PaymentOptions = { cash: boolean; online: boolean };

// Which payment methods the backend currently offers. Online is off until a
// payment provider is configured (PAYMENT_PROVIDER on the backend), so
// checkout and the order page must ask instead of assuming it exists.
export function usePaymentOptions(): PaymentOptions | null {
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  useEffect(() => {
    apiFetch("/orders/payment-options")
      .then((res) => (res.ok ? res.json() : { cash: true, online: false }))
      .then(setOptions)
      .catch(() => setOptions({ cash: true, online: false }));
  }, []);
  return options;
}

type PayResult = { ok: true } | { ok: false; error: string };

// Starts (or retries) payment for an existing unpaid order. Online redirects
// the browser to the provider's hosted page; cash just records the choice.
export async function payOrder(orderId: string, method: "online" | "cash"): Promise<PayResult> {
  const res = await apiFetch(`/orders/${orderId}/${method === "cash" ? "pay-cash" : "pay"}`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: err.message || "Could not start payment" };
  }
  if (method === "online") {
    const { checkoutUrl } = await res.json();
    window.location.href = checkoutUrl;
  }
  return { ok: true };
}
