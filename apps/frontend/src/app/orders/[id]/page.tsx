"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/money";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  total: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPhone: string;
  createdAt: string;
  items: { id: string; productName: string; unitPrice: string; quantity: number }[];
  payments: { provider: string; status: string }[];
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  // The backend's own reconciliation call to Notch Pay (see orders.service.ts)
  // can occasionally run long enough that a proxy or platform in front of it
  // cuts the connection — which makes this fetch *reject* rather than just
  // resolve slowly. Without a .catch(), that left the page stuck on
  // "Loading…" forever with no way to recover except a manual refresh.
  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    apiFetch(`/orders/${id}`)
      .then(async (res) => {
        if (res.ok) setOrder(await res.json());
        else setLoadError(true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const isOnlinePayment = order?.payments.some((p) => p.provider === "notchpay") ?? false;
  const awaitingConfirmation = order?.status === "PAYMENT_PENDING" && isOnlinePayment;

  // Notch Pay confirms payment via an async webhook that can land a few
  // seconds after the browser is redirected back here — so a customer who
  // just paid may briefly still see PAYMENT_PENDING. Poll until the webhook
  // catches up (or give up after a minute rather than polling forever).
  useEffect(() => {
    if (!awaitingConfirmation || pollTimedOut) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await apiFetch(`/orders/${id}`);
        if (res.ok) setOrder(await res.json());
      } catch {
        // Network hiccup — just try again on the next tick.
      }
      if (attempts >= 20) {
        clearInterval(interval);
        setPollTimedOut(true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [awaitingConfirmation, pollTimedOut, id]);

  if (loading) return <main className="max-w-2xl mx-auto px-4 py-16 text-steel">Loading…</main>;
  if (loadError) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-steel mb-4">Couldn't load this order — the request took too long or failed.</p>
        <button onClick={load} className="border border-steel-light rounded-lg px-4 py-2 text-sm transition-colors duration-200 hover:border-steel hover:bg-paper">
          Try again
        </button>
      </main>
    );
  }
  if (!order) return <main className="max-w-2xl mx-auto px-4 py-16 text-steel">Order not found.</main>;

  const pendingCash = order.status === "PAYMENT_PENDING" && order.payments.some((p) => p.provider === "cash" && p.status === "PENDING");

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {(pendingCash || order.status === "PAID") && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <p className="font-semibold text-emerald-800">{order.status === "PAID" ? "Payment confirmed!" : "Order placed successfully!"}</p>
          <p className="text-sm text-emerald-700">Order #{order.orderNumber}</p>
        </div>
      )}

      {awaitingConfirmation && (
        <div className="bg-paper border border-steel-light rounded-lg p-4 mb-6 flex items-center gap-3">
          {!pollTimedOut && <div className="w-5 h-5 border-2 border-steel-light border-t-ink rounded-full animate-spin shrink-0" />}
          <div>
            <p className="font-semibold text-ink">{pollTimedOut ? "Still confirming your payment" : "Confirming your payment…"}</p>
            <p className="text-sm text-steel">
              Order #{order.orderNumber} —{" "}
              {pollTimedOut
                ? "this is taking longer than usual. If you completed payment, it will confirm shortly — check My Orders later."
                : "this usually takes a few seconds."}
            </p>
          </div>
        </div>
      )}

      {order.status === "PAYMENT_FAILED" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="font-semibold text-red-800">Payment failed</p>
          <p className="text-sm text-red-700">
            Order #{order.orderNumber} — your items were released back to stock.{" "}
            <Link href="/cart" className="underline">Return to your cart</Link> to try again.
          </p>
        </div>
      )}

      <h1 className="text-xl font-display font-bold text-ink tracking-tight mb-4">Order details</h1>

      <div className="border border-steel-light rounded-lg divide-y divide-steel-light mb-6 bg-white">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between p-3 text-sm text-steel">
            <span>{item.productName} × {item.quantity}</span>
            <span>{formatMoney(Number(item.unitPrice) * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between p-3 font-semibold text-ink">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </div>

      {pendingCash && (
        <div className="bg-amber/10 border-l-4 border-amber p-4 mb-6 text-sm text-ink">
          Pay <span className="font-semibold">{formatMoney(order.total)}</span> in cash when you pick up your order — no online payment needed.
        </div>
      )}

      <div className="text-sm text-steel space-y-1 mb-6">
        <p><span className="font-medium text-steel">Status:</span> {pendingCash ? "Awaiting pickup & cash payment" : order.status}</p>
        <p><span className="font-medium text-steel">Contact address:</span> {order.shippingAddress}, {order.shippingCity}</p>
        <p><span className="font-medium text-steel">Phone:</span> {order.shippingPhone}</p>
      </div>

      <Link href="/products" className="text-ink underline text-sm transition-colors duration-200 hover:text-steel">Continue shopping</Link>
    </main>
  );
}