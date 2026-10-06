"use client";
import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/context/CartContext";
import { apiFetch, readError } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { payOrder, usePaymentOptions } from "@/lib/payment";
import { useRequireAuth } from "@/lib/use-require-auth";
import { track } from "@/lib/analytics";

const inputClass = "w-full border border-steel-light rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-steel";
const labelClass = "block text-sm font-medium mb-1 text-steel";

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const tc = useTranslations("Common");
  const id = useId();
  // Ordering needs an account (to track the order); browsing doesn't.
  const { ready } = useRequireAuth();
  const { items, subtotal, refresh, loading: cartLoading } = useCart();
  const router = useRouter();
  const paymentOptions = usePaymentOptions();

  const [form, setForm] = useState({ shippingAddress: "", shippingCity: "", shippingPhone: "" });
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("cash");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Prefer online once we know a provider is configured; cash otherwise.
  useEffect(() => {
    if (paymentOptions?.online) setPaymentMethod("online");
  }, [paymentOptions?.online]);

  // Pre-fill from the saved profile.
  useEffect(() => {
    if (!ready) return;
    track("checkout_started");
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

  const total = Math.max(0, subtotal - (coupon?.discount ?? 0));
  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    setCouponError(null);
    const res = await apiFetch("/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code: couponInput.trim(), subtotal }),
    });
    setApplyingCoupon(false);
    if (!res.ok) {
      setCouponError(await readError(res, t("couponInvalid")));
      setCoupon(null);
      return;
    }
    const data = await res.json();
    setCoupon({ code: data.code, discount: data.discount });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await apiFetch("/orders", {
      method: "POST",
      body: JSON.stringify({ ...form, couponCode: coupon?.code }),
    });
    if (!res.ok) {
      setError(await readError(res, t("failed")));
      setSubmitting(false);
      return;
    }

    const order = await res.json();
    track("order_placed", { method: paymentMethod, total: Math.round(total) });
    await refresh(); // cart is now empty on the backend, sync frontend state

    // The order now exists with its stock reserved. If starting payment
    // fails (provider down, network), don't strand the customer on an empty
    // checkout: their order page lets them retry or switch to cash.
    const paid = await payOrder(order.id, paymentMethod);
    if (!paid.ok || paymentMethod === "cash") router.push(`/orders/${order.id}`);
  }

  if (!ready || cartLoading) return <main className="max-w-lg mx-auto px-4 py-16 text-steel">{tc("loading")}</main>;

  if (items.length === 0 && !submitting) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-2">{t("emptyTitle")}</h1>
        <p className="text-steel">{t("emptyBody")}</p>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10 relative">
      {submitting && (
        <div className="fixed inset-0 bg-white/80 flex flex-col items-center justify-center gap-3 z-50" role="status">
          <div className="w-10 h-10 border-4 border-steel-light border-t-ink rounded-full animate-spin" />
          <p className="text-sm text-steel">{paymentMethod === "cash" ? t("placing") : t("redirecting")}</p>
        </div>
      )}

      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">{t("title")}</h1>

      <section aria-label={t("items")} className="bg-paper border border-steel-light rounded-lg p-4 mb-6">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between gap-3 text-sm py-1 text-steel">
            <span>{item.product.name} × {item.quantity}</span>
            <span className="shrink-0">{formatMoney(Number(item.product.price) * item.quantity)}</span>
          </div>
        ))}
        {coupon && (
          <div className="flex justify-between text-sm py-1 text-emerald-700">
            <span>{t("discount")} ({coupon.code})</span>
            <span>−{formatMoney(coupon.discount)}</span>
          </div>
        )}
        <div className="border-t border-steel-light mt-2 pt-2 flex justify-between font-semibold text-ink">
          <span>{t("total")}</span>
          <span>{formatMoney(total)}</span>
        </div>
      </section>

      {coupon ? (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-6 text-sm">
          <span className="text-emerald-800">{t("couponApplied", { code: coupon.code, discount: formatMoney(coupon.discount) })}</span>
          <button
            type="button"
            onClick={() => {
              setCoupon(null);
              setCouponInput("");
              setCouponError(null);
            }}
            className="text-red-600 underline transition-colors duration-200 hover:text-red-800"
          >
            {t("removeCoupon")}
          </button>
        </div>
      ) : (
        <form onSubmit={applyCoupon} className="flex gap-2 mb-6">
          <label htmlFor={`${id}-coupon`} className="sr-only">{t("coupon")}</label>
          <input
            id={`${id}-coupon`}
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            placeholder={t("coupon")}
            autoComplete="off"
            className={`flex-1 ${inputClass}`}
          />
          <button
            type="submit"
            disabled={applyingCoupon}
            className="border border-steel-light rounded-lg px-4 py-2 text-sm transition-colors duration-200 hover:border-steel hover:bg-paper disabled:opacity-50"
          >
            {applyingCoupon ? t("applying") : t("applyCoupon")}
          </button>
        </form>
      )}
      {couponError && <p role="alert" className="text-red-600 text-sm -mt-4 mb-6">{couponError}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor={`${id}-phone`} className={labelClass}>{t("phone")}</label>
          <input
            id={`${id}-phone`}
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-describedby={`${id}-phone-why`}
            value={form.shippingPhone}
            onChange={update("shippingPhone")}
            className={inputClass}
          />
          <p id={`${id}-phone-why`} className="text-xs text-steel mt-1">{t("phoneWhy")}</p>
        </div>
        <div>
          <label htmlFor={`${id}-address`} className={labelClass}>{t("address")}</label>
          <input
            id={`${id}-address`}
            required
            minLength={5}
            autoComplete="street-address"
            aria-describedby={`${id}-address-hint`}
            value={form.shippingAddress}
            onChange={update("shippingAddress")}
            className={inputClass}
          />
          <p id={`${id}-address-hint`} className="text-xs text-steel mt-1">{t("addressHint")}</p>
        </div>
        <div>
          <label htmlFor={`${id}-city`} className={labelClass}>{t("city")}</label>
          <input
            id={`${id}-city`}
            required
            minLength={2}
            autoComplete="address-level2"
            value={form.shippingCity}
            onChange={update("shippingCity")}
            className={inputClass}
          />
        </div>

        <fieldset>
          <legend className={labelClass}>{t("paymentMethod")}</legend>
          <div className={`grid gap-3 ${paymentOptions?.online ? "grid-cols-2" : "grid-cols-1"}`}>
            {paymentOptions?.online && (
              <button
                type="button"
                onClick={() => setPaymentMethod("online")}
                aria-pressed={paymentMethod === "online"}
                className={`rounded-lg border-2 px-3 py-2 text-sm text-left transition-colors duration-200 ${
                  paymentMethod === "online" ? "border-ink bg-steel-light" : "border-steel-light hover:border-steel"
                }`}
              >
                <span className="block font-medium text-ink">{t("online")}</span>
                <span className="block text-xs text-steel mt-0.5">{t("onlineHint")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              aria-pressed={paymentMethod === "cash"}
              className={`rounded-lg border-2 px-3 py-2 text-sm text-left transition-colors duration-200 ${
                paymentMethod === "cash" ? "border-ink bg-steel-light" : "border-steel-light hover:border-steel"
              }`}
            >
              <span className="block font-medium text-ink">{t("cash")}</span>
              <span className="block text-xs text-steel mt-0.5">{t("cashHint")}</span>
            </button>
          </div>
        </fieldset>

        {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-amber text-ink py-3 font-medium transition-colors duration-150 hover:bg-amber-dark disabled:opacity-50"
        >
          {paymentMethod === "cash" ? t("placeCash", { total: formatMoney(total) }) : t("payOnline", { total: formatMoney(total) })}
        </button>
      </form>
    </main>
  );
}
