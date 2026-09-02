"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/money";

export default function CheckoutPage() {
  const { items, subtotal, refresh } = useCart();
  const router = useRouter();
  const [form, setForm] = useState({ shippingAddress: "", shippingCity: "", shippingPhone: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    apiFetch("/users/me").then(async (res) => {
      if (!res.ok) return;
      const u = await res.json();
      setForm((f) => ({
        shippingAddress: f.shippingAddress || u.defaultShippingAddress || "",
        shippingCity: f.shippingCity || u.defaultShippingCity || "",
        shippingPhone: f.shippingPhone || u.defaultShippingPhone || "",
      }));
    });
  }, []);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const total = Math.max(0, subtotal - (coupon?.discount ?? 0));

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    setCouponError(null);

    const res = await apiFetch("/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code: couponInput.trim(), subtotal }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setCouponError(err.message || "Invalid coupon code");
      setCoupon(null);
      setApplyingCoupon(false);
      return;
    }

    const data = await res.json();
    setCoupon({ code: data.code, discount: data.discount });
    setApplyingCoupon(false);
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponError(null);
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
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Checkout failed");
      setSubmitting(false);
      return;
    }

    const order = await res.json();
    await refresh(); // cart is now empty on the backend, sync frontend state

    // Order is created but not yet paid — now start the actual payment and
    // send the customer to Notch Pay's hosted checkout page.
    const payRes = await apiFetch(`/orders/${order.id}/pay`, { method: "POST" });

    if (!payRes.ok) {
      const err = await payRes.json().catch(() => ({}));
      setError(err.message || "Could not start payment");
      setSubmitting(false);
      return;
    }

    const { checkoutUrl } = await payRes.json();
    window.location.href = checkoutUrl; // full redirect to Notch Pay
  }

  if (items.length === 0) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-gray-500">Add something to your cart before checking out.</p>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-1">
            <span>{item.product.name} × {item.quantity}</span>
            <span>{formatMoney(Number(item.product.price) * item.quantity)}</span>
          </div>
        ))}
        {coupon && (
          <div className="flex justify-between text-sm py-1 text-green-700">
            <span>Coupon {coupon.code}</span>
            <span>−{formatMoney(coupon.discount)}</span>
          </div>
        )}
        <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatMoney(total)}</span>
        </div>
      </div>

      {coupon ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-6 text-sm">
          <span className="text-green-800">Coupon <strong>{coupon.code}</strong> applied</span>
          <button type="button" onClick={removeCoupon} className="text-red-600 underline">Remove</button>
        </div>
      ) : (
        <form onSubmit={applyCoupon} className="flex gap-2 mb-6">
          <input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            placeholder="Coupon code"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={applyingCoupon}
            className="border border-gray-300 rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {applyingCoupon ? "Checking…" : "Apply"}
          </button>
        </form>
      )}
      {couponError && <p className="text-red-600 text-sm -mt-4 mb-6">{couponError}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Contact address</label>
          <input
            required
            value={form.shippingAddress}
            onChange={(e) => update("shippingAddress", e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <input
            required
            value={form.shippingCity}
            onChange={(e) => update("shippingCity", e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contact phone number</label>
          <input
            required
            value={form.shippingPhone}
            onChange={(e) => update("shippingPhone", e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gray-900 text-white rounded py-3 font-medium disabled:opacity-50"
        >
          {submitting ? "Redirecting to payment…" : `Pay ${formatMoney(total)}`}
        </button>
      </form>
    </main>
  );
}