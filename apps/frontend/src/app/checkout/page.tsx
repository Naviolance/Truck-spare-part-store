"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { apiFetch } from "@/lib/api";

export default function CheckoutPage() {
  const { items, subtotal, refresh } = useCart();
  const router = useRouter();
  const [form, setForm] = useState({ shippingAddress: "", shippingCity: "", shippingPhone: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await apiFetch("/orders", { method: "POST", body: JSON.stringify(form) });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Checkout failed");
      setSubmitting(false);
      return;
    }

    const order = await res.json();
    await refresh(); // cart is now empty on the backend, sync frontend state
    router.push(`/orders/${order.id}`);
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
            <span>${(Number(item.product.price) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Shipping address</label>
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
          <label className="block text-sm font-medium mb-1">Phone number</label>
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
          {submitting ? "Placing order…" : `Place order — $${subtotal.toFixed(2)}`}
        </button>
        <p className="text-xs text-gray-400 text-center">
          Payment provider integration coming next — orders are confirmed immediately for now.
        </p>
      </form>
    </main>
  );
}