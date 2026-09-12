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
  CANCELLED: "bg-steel-light text-steel",
  PAYMENT_FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-red-100 text-red-700",
  PARTIALLY_REFUNDED: "bg-orange-100 text-orange-700",
  DISPUTED: "bg-red-100 text-red-700",
  PAYMENT_PENDING: "bg-steel-light text-steel",
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

  if (loading) return <p className="text-steel">Loading…</p>;

  const rows = orders.map((o) => ({
    ...o,
    pendingCash: o.status === "PAYMENT_PENDING" && o.payments.some((p) => p.provider === "cash" && p.status === "PENDING"),
  }));

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">Orders</h1>

      {orders.length === 0 ? (
        <p className="text-steel">No orders yet.</p>
      ) : (
        <>
        <div className="sm:hidden space-y-3">
          {rows.map((o) => (
            <div key={o.id} className="bg-white border border-steel-light rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">#{o.orderNumber}</p>
                  <p className="text-xs text-steel truncate">{o.user.firstName} {o.user.lastName}</p>
                  <p className="text-xs text-steel truncate">{o.user.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-ink">{formatMoney(o.total)}</p>
                  <p className="text-xs text-steel">{new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || "bg-steel-light"}`}>
                  {o.status}
                </span>
                {o.pendingCash && <span className="text-xs text-amber-dark">Cash — awaiting pickup</span>}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <select
                  value={o.status}
                  disabled={updatingId === o.id || TERMINAL_STATUSES.includes(o.status)}
                  onChange={(e) => handleStatusChange(o.id, e.target.value)}
                  className="w-full border border-steel-light rounded-lg px-3 py-2.5 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {o.pendingCash && (
                  <button
                    onClick={() => handleConfirmCash(o)}
                    disabled={updatingId === o.id}
                    className="w-full text-sm font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-lg py-2.5 transition-colors duration-200 hover:bg-emerald-100 disabled:opacity-50 disabled:hover:bg-emerald-50"
                  >
                    {updatingId === o.id ? "…" : "Mark paid (cash)"}
                  </button>
                )}
                {!TERMINAL_STATUSES.includes(o.status) && (
                  <button
                    onClick={() => handleCancel(o)}
                    disabled={updatingId === o.id}
                    className="w-full text-sm font-medium text-red-600 border border-red-200 bg-red-50 rounded-lg py-2.5 transition-colors duration-200 hover:bg-red-100 disabled:opacity-50 disabled:hover:bg-red-50"
                  >
                    {updatingId === o.id ? "…" : "Cancel & refund"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm bg-white border border-steel-light rounded-lg overflow-hidden">
          <thead className="bg-paper text-left">
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
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-steel-light">
                <td className="p-3 font-medium">#{o.orderNumber}</td>
                <td className="p-3">
                  {o.user.firstName} {o.user.lastName}
                  <div className="text-xs text-steel">{o.user.email}</div>
                </td>
                <td className="p-3 text-steel">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="p-3 font-medium">{formatMoney(o.total)}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || "bg-steel-light"}`}>
                    {o.status}
                  </span>
                  {o.pendingCash && (
                    <span className="block text-xs text-amber-dark mt-1">Cash — awaiting pickup</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={o.status}
                      disabled={updatingId === o.id || TERMINAL_STATUSES.includes(o.status)}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      className="border border-steel-light rounded-lg px-2 py-1 text-xs"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {o.pendingCash && (
                      <button
                        onClick={() => handleConfirmCash(o)}
                        disabled={updatingId === o.id}
                        className="text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-lg px-2.5 py-1 transition-colors duration-200 hover:bg-emerald-100 disabled:opacity-50 disabled:hover:bg-emerald-50"
                      >
                        {updatingId === o.id ? "…" : "Mark paid (cash)"}
                      </button>
                    )}
                    {!TERMINAL_STATUSES.includes(o.status) && (
                      <button
                        onClick={() => handleCancel(o)}
                        disabled={updatingId === o.id}
                        className="text-xs font-medium text-red-600 border border-red-200 bg-red-50 rounded-lg px-2.5 py-1 transition-colors duration-200 hover:bg-red-100 disabled:opacity-50 disabled:hover:bg-red-50"
                      >
                        {updatingId === o.id ? "…" : "Cancel & refund"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        </>
      )}
    </div>
  );
}