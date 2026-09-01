"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

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

  if (loading) return <main className="max-w-2xl mx-auto px-4 py-16 text-gray-500">Loading…</main>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Your orders</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm"
            >
              <div>
                <p className="font-medium">#{o.orderNumber}</p>
                <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${o.total}</p>
                <p className="text-xs text-gray-500">{o.status}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}