"use client";
import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useAdminList } from "@/lib/admin-list";
import { FilterSelect, Pager, SearchBox } from "@/components/admin/ListControls";
import { formatMoney } from "@/lib/money";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
  payments: { provider: string; status: string }[];
  // From the backend's state machine (orders/order-status.ts): the only
  // statuses this order may move to. The UI never offers anything else.
  nextStatuses: string[];
};

// CANCELLED and REFUNDED go through the "Cancel & refund" button (with a
// confirmation), not the dropdown.
const BUTTON_ONLY = ["CANCELLED", "REFUNDED"];

function dropdownOptions(o: Order) {
  return [o.status, ...o.nextStatuses.filter((s) => !BUTTON_ONLY.includes(s))];
}

function canCancel(o: Order) {
  return o.nextStatuses.some((s) => BUTTON_ONLY.includes(s));
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-steel-light text-steel",
  PAYMENT_FAILED: "bg-red-100 text-red-700",
  EXPIRED: "bg-steel-light text-steel",
  REFUNDED: "bg-red-100 text-red-700",
  PARTIALLY_REFUNDED: "bg-orange-100 text-orange-700",
  DISPUTED: "bg-red-100 text-red-700",
  PAYMENT_PENDING: "bg-steel-light text-steel",
};

export default function AdminOrdersPage() {
  const [status, setStatus] = useState("");
  const list = useAdminList<Order>("/orders/admin/all", { status });
  const { items: orders, data, reload: load } = list;
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleStatusChange(orderId: string, status: string) {
    setUpdatingId(orderId);
    const res = await apiFetch(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Could not update this order");
    }
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
    // Mirrors releasesStock() in the backend's order-status.ts: units come
    // back automatically only while they're still in the store.
    const unpaid = order.status === "PAYMENT_PENDING";
    const stillInStore = ["PAYMENT_PENDING", "PAID", "PROCESSING"].includes(order.status);
    const message = [
      `${unpaid ? "Cancel" : "Refund"} order #${order.orderNumber}?`,
      stillInStore
        ? "Its items will be put back in stock."
        : "Its items already left the store, so stock is NOT restored automatically — adjust it by hand if they come back.",
      unpaid ? "" : "This marks the payment refunded; you still need to send the money back yourself.",
    ].join(" ");
    if (!confirm(message)) return;
    setUpdatingId(order.id);
    const res = await apiFetch(`/orders/${order.id}/cancel`, { method: "POST" });
    if (!res.ok) alert((await res.json().catch(() => ({}))).message || "Could not cancel this order");
    await load();
    setUpdatingId(null);
  }

  if (list.loading) return <p className="text-steel">Loading…</p>;

  const rows = orders.map((o) => ({
    ...o,
    pendingCash: o.status === "PAYMENT_PENDING" && o.payments.some((p) => p.provider === "cash" && p.status === "PENDING"),
  }));

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">Orders</h1>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <SearchBox value={list.search} onChange={list.setSearch} placeholder="Order number, customer or phone" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[{ value: "", label: "All statuses" }, ...Object.keys(STATUS_COLORS).map((s) => ({ value: s, label: s.replace(/_/g, " ").toLowerCase() }))]}
        />
      </div>

      {orders.length === 0 ? (
        <p className="text-steel">{list.searching || status ? "No orders match." : "No orders yet."}</p>
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
                  disabled={updatingId === o.id || dropdownOptions(o).length === 1}
                  onChange={(e) => handleStatusChange(o.id, e.target.value)}
                  className="w-full border border-steel-light rounded-lg px-3 py-2.5 text-sm"
                >
                  {dropdownOptions(o).map((s) => (
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
                {canCancel(o) && (
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
                      disabled={updatingId === o.id || dropdownOptions(o).length === 1}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      className="border border-steel-light rounded-lg px-2 py-1 text-xs"
                    >
                      {dropdownOptions(o).map((s) => (
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
                    {canCancel(o) && (
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
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={list.setPage} />}
    </div>
  );
}