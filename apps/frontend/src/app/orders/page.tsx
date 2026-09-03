"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/money";

type Order = { id: string; orderNumber: string; status: string; total: string; createdAt: string };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/orders").then(async (res) => {
      if (res.ok) setOrders(await res.json());
      setLoading(false);
    });
  }, []);

  if (loading) return <main className="max-w-2xl mx-auto px-4 py-16 text-zinc-500">Loading…</main>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-6">Your orders</h1>
      {orders.length === 0 ? (
        <p className="text-zinc-500">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between border border-zinc-200 rounded-lg p-4 bg-white transition-all duration-200 hover:shadow-sm hover:border-zinc-300"
            >
              <div>
                <p className="font-medium text-zinc-900">#{o.orderNumber}</p>
                <p className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-zinc-900">{formatMoney(o.total)}</p>
                <p className="text-xs text-zinc-500">{o.status}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}