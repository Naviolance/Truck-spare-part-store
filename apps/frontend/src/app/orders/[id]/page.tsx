"use client";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    apiFetch(`/orders/${id}`).then(async (res) => {
      if (res.ok) setOrder(await res.json());
      setLoading(false);
    });
  }, [id]);

  if (loading) return <main className="max-w-2xl mx-auto px-4 py-16 text-zinc-500">Loading…</main>;
  if (!order) return <main className="max-w-2xl mx-auto px-4 py-16 text-zinc-500">Order not found.</main>;

  const pendingCash = order.status === "PAYMENT_PENDING" && order.payments.some((p) => p.provider === "cash" && p.status === "PENDING");

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
        <p className="font-semibold text-emerald-800">Order placed successfully!</p>
        <p className="text-sm text-emerald-700">Order #{order.orderNumber}</p>
      </div>

      <h1 className="text-xl font-bold text-zinc-900 tracking-tight mb-4">Order details</h1>

      <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100 mb-6 bg-white">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between p-3 text-sm text-zinc-700">
            <span>{item.productName} × {item.quantity}</span>
            <span>{formatMoney(Number(item.unitPrice) * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between p-3 font-semibold text-zinc-900">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </div>

      {pendingCash && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-900">
          Pay <span className="font-semibold">{formatMoney(order.total)}</span> in cash when you pick up your order — no online payment needed.
        </div>
      )}

      <div className="text-sm text-zinc-600 space-y-1 mb-6">
        <p><span className="font-medium text-zinc-700">Status:</span> {pendingCash ? "Awaiting pickup & cash payment" : order.status}</p>
        <p><span className="font-medium text-zinc-700">Contact address:</span> {order.shippingAddress}, {order.shippingCity}</p>
        <p><span className="font-medium text-zinc-700">Phone:</span> {order.shippingPhone}</p>
      </div>

      <Link href="/products" className="text-zinc-900 underline text-sm transition-colors duration-200 hover:text-zinc-600">Continue shopping</Link>
    </main>
  );
}