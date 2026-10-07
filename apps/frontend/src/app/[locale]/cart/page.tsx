"use client";
import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/money";
import { useRequireAuth } from "@/lib/use-require-auth";
import { StickyActionBar } from "@/components/StickyActionBar";
import { CartLine } from "./CartLine";
import { RelatedProducts } from "./RelatedProducts";
import { useCheckout } from "./use-checkout";

const input =
  "h-12 w-full rounded-[10px] border border-[#BDB5A6] bg-white px-3.5 text-base text-ink focus:border-ink focus:outline-none";
const card = "rounded-[14px] border border-line bg-card";

// Cart and checkout on one page (redesign step 4, option B): review the
// items, say how to reach you, pick how to pay, place the order — no second
// page. /checkout redirects here. The order form is one <form>; the submit
// buttons in the summary and the phone bar point at it with form="…", so the
// browser's own "required" checks run whichever one is pressed.
export default function CartPage() {
  const t = useTranslations("Cart");
  const tk = useTranslations("Checkout");
  const tc = useTranslations("Common");
  const id = useId();
  const formId = `${id}-order`;
  const { ready } = useRequireAuth();
  const { items, subtotal, loading, updateQuantity, removeItem } = useCart();
  const checkout = useCheckout(ready);
  const [couponInput, setCouponInput] = useState("");

  if (!ready || loading) return <main className="max-w-3xl mx-auto px-4 py-16 text-steel">{tc("loading")}</main>;

  if (items.length === 0 && !checkout.submitting) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold text-ink mb-2">{t("emptyTitle")}</h1>
        <p className="text-steel mb-6">{t("emptyBody")}</p>
        <Link href="/products" className="btn-primary">{tc("continueShopping")}</Link>
      </main>
    );
  }

  const count = items.reduce((n, item) => n + item.quantity, 0);
  const cash = checkout.paymentMethod === "cash";
  const cta = cash ? tk("placeCash", { total: formatMoney(checkout.total) }) : tk("payOnline", { total: formatMoney(checkout.total) });
  const methods = [
    ...(checkout.paymentOptions?.online ? [{ value: "online" as const, label: tk("online"), hint: tk("onlineHint") }] : []),
    { value: "cash" as const, label: tk("cash"), hint: tk("cashHint") },
  ];
  const submitButton = (size: "box" | "bar") => (
    <button
      type="submit"
      form={formId}
      disabled={checkout.submitting}
      className={`rounded-[10px] bg-amber px-4 py-2 font-bold text-ink transition-colors hover:bg-amber-dark disabled:opacity-50 ${
        size === "box" ? "min-h-[56px] text-[17px]" : "min-h-[52px] text-base"
      }`}
    >
      {cta}
    </button>
  );

  return (
    // Bottom padding on phones: room for the pinned order bar.
    <main className="max-w-6xl mx-auto px-4 pt-8 pb-40 lg:pb-14">
      {checkout.submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-paper/90" role="status">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-ink" />
          <p className="text-steel">{cash ? tk("placing") : tk("redirecting")}</p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-display text-3xl sm:text-[40px] font-bold text-ink">{t("title")}</h1>
        <span className="text-steel">{t("itemCount", { count })}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-7">
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-label={tk("items")} className={`${card} px-4 sm:px-5`}>
            <ul className="divide-y divide-sand">
              {items.map((item) => (
                <CartLine
                  key={item.id}
                  item={item}
                  onQuantity={(q) => updateQuantity(item.id, Math.max(1, q))}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </ul>
          </section>

          <form
            id={formId}
            onSubmit={(e) => {
              e.preventDefault();
              checkout.submit();
            }}
            onFocus={checkout.markStarted}
            className="flex flex-col gap-4"
          >
            <section aria-labelledby={`${id}-contact`} className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
              <h2 id={`${id}-contact`} className="font-display text-2xl font-bold text-ink">{t("contactTitle")}</h2>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${id}-phone`} className="font-semibold text-ink">{tk("phone")}</label>
                  <input
                    id={`${id}-phone`}
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    aria-describedby={`${id}-phone-why`}
                    value={checkout.form.shippingPhone}
                    onChange={(e) => checkout.setField("shippingPhone", e.target.value)}
                    className={`${input} text-[17px]`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${id}-city`} className="font-semibold text-ink">{tk("city")}</label>
                  <input
                    id={`${id}-city`}
                    required
                    minLength={2}
                    autoComplete="address-level2"
                    value={checkout.form.shippingCity}
                    onChange={(e) => checkout.setField("shippingCity", e.target.value)}
                    className={input}
                  />
                </div>
              </div>
              <p id={`${id}-phone-why`} className="text-sm text-steel">{tk("phoneWhy")}</p>
              {/* Optional since parts are picked up in store; opens by itself
                  when the profile already has one. */}
              <details open={Boolean(checkout.form.shippingAddress) || undefined} className="border-t border-sand pt-2">
                <summary className="cursor-pointer py-1.5 font-semibold text-ink">{t("addAddress")}</summary>
                <div className="mt-2 flex flex-col gap-1.5">
                  <label htmlFor={`${id}-address`} className="text-sm text-steel">{tk("address")}</label>
                  <input
                    id={`${id}-address`}
                    autoComplete="street-address"
                    maxLength={300}
                    aria-describedby={`${id}-address-hint`}
                    value={checkout.form.shippingAddress}
                    onChange={(e) => checkout.setField("shippingAddress", e.target.value)}
                    className={input}
                  />
                  <p id={`${id}-address-hint`} className="text-sm text-steel">{tk("addressHint")}</p>
                </div>
              </details>
            </section>

            <fieldset className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
              <legend className="float-left mb-3 w-full font-display text-2xl font-bold text-ink">{t("payTitle")}</legend>
              <div className={`clear-both grid gap-3 ${methods.length > 1 ? "sm:grid-cols-2" : ""}`}>
                {methods.map((m) => (
                  <label key={m.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={m.value}
                      checked={checkout.paymentMethod === m.value}
                      onChange={() => checkout.setPaymentMethod(m.value)}
                      className="peer sr-only"
                    />
                    <span className="flex h-full flex-col gap-0.5 rounded-xl border border-[#BDB5A6] bg-white p-4 transition-colors peer-checked:border-2 peer-checked:border-ink peer-checked:bg-[#F6E6C8] peer-checked:p-[15px] peer-focus-visible:ring-2 peer-focus-visible:ring-amber">
                      <strong className="text-[17px] text-ink">{m.label}</strong>
                      <span className="text-sm text-steel">{m.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </form>
        </div>

        <aside aria-label={tk("total")} className={`${card} flex flex-col gap-4 self-start p-5 sm:p-6 lg:sticky lg:top-[136px]`}>
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5">
            <dt className="text-steel">{t("subtotalCount", { count })}</dt>
            <dd>{formatMoney(subtotal)}</dd>
            {checkout.coupon && (
              <>
                <dt className="text-stock">{tk("discount")} ({checkout.coupon.code})</dt>
                <dd className="text-stock">−{formatMoney(checkout.coupon.discount)}</dd>
              </>
            )}
          </dl>

          {checkout.coupon ? (
            <div className="flex items-center justify-between gap-3 rounded-[10px] bg-stock-bg px-3 py-2 text-sm">
              <span className="text-stock">{tk("couponApplied", { code: checkout.coupon.code, discount: formatMoney(checkout.coupon.discount) })}</span>
              <button
                type="button"
                onClick={() => {
                  checkout.removeCoupon();
                  setCouponInput("");
                }}
                className="text-[#8A3821] underline underline-offset-2"
              >
                {tk("removeCoupon")}
              </button>
            </div>
          ) : (
            <details open={Boolean(checkout.couponError) || undefined}>
              <summary className="cursor-pointer py-1 font-semibold text-ink">{t("haveCoupon")}</summary>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  checkout.applyCoupon(couponInput);
                }}
                className="mt-2 flex gap-2"
              >
                <label htmlFor={`${id}-coupon`} className="sr-only">{tk("coupon")}</label>
                <input
                  id={`${id}-coupon`}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  autoComplete="off"
                  className={`${input} h-11 min-w-0 flex-1`}
                />
                <button type="submit" disabled={checkout.applyingCoupon} className="btn-outline h-11">
                  {checkout.applyingCoupon ? tk("applying") : tk("applyCoupon")}
                </button>
              </form>
            </details>
          )}
          {checkout.couponError && <p role="alert" className="-mt-2 text-sm text-[#8A3821]">{checkout.couponError}</p>}

          {/* What StickyActionBar watches on phones. */}
          <div id="order-actions" className="flex flex-col gap-3 border-t border-sand pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-lg font-bold text-ink">{tk("total")}</span>
              <span className="text-[28px] font-bold leading-none text-ink">{formatMoney(checkout.total)}</span>
            </div>
            {checkout.error && <p role="alert" className="text-sm text-[#8A3821]">{checkout.error}</p>}
            {submitButton("box")}
          </div>
          <p className="text-sm text-steel">{t("pickupNote")}</p>
        </aside>
      </div>

      <RelatedProducts
        categoryIds={Array.from(new Set(items.map((item) => item.product.categoryId)))}
        excludeProductIds={items.map((item) => item.product.id)}
      />

      <StickyActionBar targetId="order-actions">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-steel">{tk("total")} · {t("itemCount", { count })}</span>
            <span className="text-xl font-bold text-ink">{formatMoney(checkout.total)}</span>
          </div>
          {submitButton("bar")}
        </div>
      </StickyActionBar>
    </main>
  );
}
