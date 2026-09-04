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
  payments: { provider: string; status: string }[];
};

// CANCELLED and REFUNDED aren't in this list on purpose — those only happen
// through the dedicated "Cancel & refund" button, which also restores stock
// and marks the payment refunded. Setting them from this raw dropdown would
// skip both of those.
const STATUS_OPTIONS = [
  "PAYMENT_PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "PAYMENT_FAILED",
  "PARTIALLY_REFUNDED",
  "DISPUTED",
];

const TERMINAL_STATUSES = ["CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"];

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-zinc-100 text-zinc-500",
  PAYMENT_FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-red-100 text-red-700",
  PARTIALLY_REFUNDED: "bg-orange-100 text-orange-700",
  DISPUTED: "bg-red-100 text-red-700",
  PAYMENT_PENDING: "bg-zinc-100 text-zinc-600",
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

  async function handleConfirmCash(order: Order) {
    if (!confirm(`Mark order #${order.orderNumber} as paid in cash?`)) return;
    setUpdatingId(order.id);
    await apiFetch(`/orders/${order.id}/confirm-cash`, { method: "POST" });
    await load();
    setUpdatingId(null);
  }

  async function handleCancel(order: Order) {
    if (!confirm(`Cancel order #${order.orderNumber}? This restores stock for its items${order.status === "PAID" || order.status === "PROCESSING" || order.status === "SHIPPED" || order.status === "DELIVERED" ? " and marks the payment as refunded (you still need to actually send the refund via Notch Pay)" : ""}.`)) {
      return;
    }
    setUpdatingId(order.id);
    await apiFetch(`/orders/${order.id}/cancel`, { method: "POST" });
    await load();
    setUpdatingId(null);
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-6">Orders</h1>

      {orders.length === 0 ? (
        <p className="text-zinc-500">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <thead className="bg-zinc-50 text-left">
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
            {orders.map((o) => {
              const pendingCash = o.status === "PAYMENT_PENDING" && o.payments.some((p) => p.provider === "cash" && p.status === "PENDING");
              return (
              <tr key={o.id} className="border-t border-zinc-100">
                <td className="p-3 font-medium">#{o.orderNumber}</td>
                <td className="p-3">
                  {o.user.firstName} {o.user.lastName}
                  <div className="text-xs text-zinc-400">{o.user.email}</div>
                </td>
                <td className="p-3 text-zinc-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="p-3 font-medium">{formatMoney(o.total)}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || "bg-zinc-100"}`}>
                    {o.status}
                  </span>
                  {pendingCash && (
                    <span className="block text-xs text-amber-600 mt-1">Cash — awaiting pickup</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={o.status}
                      disabled={updatingId === o.id || TERMINAL_STATUSES.includes(o.status)}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      className="border border-zinc-300 rounded-lg px-2 py-1 text-xs"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {pendingCash && (
                      <button
                        onClick={() => handleConfirmCash(o)}
                        disabled={updatingId === o.id}
                        className="text-xs text-emerald-700 underline disabled:opacity-50"
                      >
                        Mark paid (cash)
                      </button>
                    )}
                    {!TERMINAL_STATUSES.includes(o.status) && (
                      <button
                        onClick={() => handleCancel(o)}
                        disabled={updatingId === o.id}
                        className="text-xs text-red-600 underline disabled:opacity-50"
                      >
                        Cancel &amp; refund
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}