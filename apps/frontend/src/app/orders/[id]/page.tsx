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

  if (loading) return <main className="max-w-2xl mx-auto px-4 py-16 text-gray-500">Loading…</main>;
  if (!order) return <main className="max-w-2xl mx-auto px-4 py-16 text-gray-500">Order not found.</main>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="font-semibold text-green-800">Order placed successfully!</p>
        <p className="text-sm text-green-700">Order #{order.orderNumber}</p>
      </div>

      <h1 className="text-xl font-bold mb-4">Order details</h1>

      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 mb-6">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between p-3 text-sm">
            <span>{item.productName} × {item.quantity}</span>
            <span>{formatMoney(Number(item.unitPrice) * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between p-3 font-semibold">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </div>

      <div className="text-sm text-gray-600 space-y-1 mb-6">
        <p><span className="font-medium">Status:</span> {order.status}</p>
        <p><span className="font-medium">Ship to:</span> {order.shippingAddress}, {order.shippingCity}</p>
        <p><span className="font-medium">Phone:</span> {order.shippingPhone}</p>
      </div>

      <Link href="/" className="text-gray-900 underline text-sm">Continue shopping</Link>
    </main>
  );
}