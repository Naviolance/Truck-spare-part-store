"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/money";

type Order = {
  id: string; orderNumber: string; status: string; total: string; createdAt: string;
  payments: { provider: string; status: string }[];
};

function statusLabel(order: Order) {
  const pendingCash = order.status === "PAYMENT_PENDING" && order.payments.some((p) => p.provider === "cash" && p.status === "PENDING");
  return pendingCash ? "Awaiting pickup & cash payment" : order.status;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/orders").then(async (res) => {
      if (res.ok) setOrders(await res.json());
      setLoading(false);
    });
  }, []);

  if (loading) return <main className="max-w-2xl mx-auto px-4 py-16 text-steel">Loading…</main>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">Your orders</h1>
      {orders.length === 0 ? (
        <p className="text-steel">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between border border-steel-light rounded-lg p-4 bg-white transition-all duration-200 hover:shadow-sm hover:border-steel-light"
            >
              <div>
                <p className="font-medium text-ink">#{o.orderNumber}</p>
                <p className="text-xs text-steel">{new Date(o.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-ink">{formatMoney(o.total)}</p>
                <p className="text-xs text-steel">{statusLabel(o)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}