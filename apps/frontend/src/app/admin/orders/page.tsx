"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/money";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
};

const STATUS_OPTIONS = [
  "PAYMENT_PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "PAYMENT_FAILED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "DISPUTED",
];

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  PAYMENT_FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-red-100 text-red-700",
  PARTIALLY_REFUNDED: "bg-orange-100 text-orange-700",
  DISPUTED: "bg-red-100 text-red-700",
  PAYMENT_PENDING: "bg-gray-100 text-gray-600",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/orders/admin/all");
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStatusChange(orderId: string, status: string) {
    setUpdatingId(orderId);
    await apiFetch(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
    setUpdatingId(null);
  }

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      {orders.length === 0 ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <table className="w-full text-sm bg-white border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Date</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-gray-100">
                <td className="p-3 font-medium">#{o.orderNumber}</td>
                <td className="p-3">
                  {o.user.firstName} {o.user.lastName}
                  <div className="text-xs text-gray-400">{o.user.email}</div>
                </td>
                <td className="p-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="p-3 font-medium">{formatMoney(o.total)}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || "bg-gray-100"}`}>
                    {o.status}
                  </span>
                </td>
                <td className="p-3">
                  <select
                    value={o.status}
                    disabled={updatingId === o.id}
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}