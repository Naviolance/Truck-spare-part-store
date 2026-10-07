"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/context/CartContext";
import { apiFetch, readApiError } from "@/lib/api";
import { payOrder, usePaymentOptions } from "@/lib/payment";
import { track } from "@/lib/analytics";
import { useApiError } from "@/lib/use-api-error";

export type OrderForm = { shippingPhone: string; shippingCity: string; shippingAddress: string };
type Coupon = { code: string; discount: number };

// Everything the cart page needs to place an order (redesign step 4: the
// cart and checkout are one page). Moved from the old /checkout page; the
// one new rule is that quantities can now change after a promo code was
// applied, so the code is re-checked whenever the subtotal changes.
export function useCheckout(ready: boolean) {
  const t = useTranslations("Checkout");
  const apiError = useApiError();
  const router = useRouter();
  const { subtotal, refresh } = useCart();
  const paymentOptions = usePaymentOptions();

  const [form, setForm] = useState<OrderForm>({ shippingPhone: "", shippingCity: "", shippingAddress: "" });
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("cash");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const started = useRef(false);

  // Prefer online once we know a provider is configured; cash otherwise.
  useEffect(() => {
    if (paymentOptions?.online) setPaymentMethod("online");
  }, [paymentOptions?.online]);

  // Pre-fill from the saved profile.
  useEffect(() => {
    if (!ready) return;
    apiFetch("/users/me").then(async (res) => {
      if (!res.ok) return;
      const u = await res.json();
      setForm((f) => ({
        shippingAddress: f.shippingAddress || u.defaultShippingAddress || "",
        shippingCity: f.shippingCity || u.defaultShippingCity || "",
        shippingPhone: f.shippingPhone || u.defaultShippingPhone || u.phone || "",
      }));
    });
  }, [ready]);

  async function validateCoupon(code: string, forSubtotal: number): Promise<boolean> {
    const res = await apiFetch("/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code, subtotal: forSubtotal }),
    });
    if (!res.ok) {
      setCouponError(apiError(await readApiError(res), t("couponInvalid")));
      setCoupon(null);
      return false;
    }
    const data = await res.json();
    setCoupon({ code: data.code, discount: data.discount });
    setCouponError(null);
    return true;
  }

  // Quantities changed under an applied code: its discount (or eligibility)
  // may have changed too. The server recomputes it on the order anyway; this
  // keeps the total shown honest.
  const couponCode = coupon?.code;
  useEffect(() => {
    // Not while placing the order: the cart empties right after it.
    if (couponCode && subtotal > 0 && !submitting) validateCoupon(couponCode, subtotal);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-check on subtotal changes only
  }, [subtotal]);

  async function applyCoupon(code: string) {
    if (!code.trim()) return;
    setApplyingCoupon(true);
    await validateCoupon(code.trim(), subtotal);
    setApplyingCoupon(false);
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponError(null);
  }

  // "checkout_started" = the customer began filling in the order (it used
  // to be "opened /checkout"; opening the cart alone isn't that signal).
  function markStarted() {
    if (started.current) return;
    started.current = true;
    track("checkout_started");
  }

  const total = Math.max(0, subtotal - (coupon?.discount ?? 0));

  async function submit() {
    setError(null);
    setSubmitting(true);
    const res = await apiFetch("/orders", {
      method: "POST",
      body: JSON.stringify({ ...form, couponCode: coupon?.code }),
    });
    if (!res.ok) {
      setError(apiError(await readApiError(res), t("failed")));
      setSubmitting(false);
      return;
    }

    const order = await res.json();
    track("order_placed", { method: paymentMethod, total: Math.round(total) });
    await refresh(); // cart is now empty on the backend, sync frontend state

    // The order now exists with its stock reserved. If starting payment
    // fails (provider down, network), don't strand the customer on an empty
    // cart: their order page lets them retry or switch to cash.
    const paid = await payOrder(order.id, paymentMethod);
    if (!paid.ok || paymentMethod === "cash") router.push(`/orders/${order.id}`);
  }

  return {
    form,
    setField: (field: keyof OrderForm, value: string) => setForm((f) => ({ ...f, [field]: value })),
    paymentOptions,
    paymentMethod,
    setPaymentMethod,
    coupon,
    couponError,
    applyingCoupon,
    applyCoupon,
    removeCoupon,
    total,
    submit,
    submitting,
    error,
    markStarted,
  };
}
