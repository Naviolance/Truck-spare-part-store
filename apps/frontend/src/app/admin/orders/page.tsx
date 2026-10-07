"use client";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch, readApiError } from "@/lib/api";
import { useApiError } from "@/lib/use-api-error";
import { useAdminList } from "@/lib/admin-list";
import { Pager, SearchBox } from "@/components/admin/ListControls";
import { formatMoney } from "@/lib/money";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  shippingPhone: string;
  user: { firstName: string; lastName: string; email: string };
  items: { id: string; productName: string; quantity: number }[];
  payments: { provider: string; status: string }[];
  // From the backend's state machine (orders/order-status.ts): the only
  // statuses this order may move to. The UI never offers anything else.
  nextStatuses: string[];
};

// CANCELLED and REFUNDED go through the t("cancelRefund") button (with a
// confirmation), not the dropdown.
const BUTTON_ONLY = ["CANCELLED", "REFUNDED"];

function canCancel(o: Order) {
  return o.nextStatuses.some((s) => BUTTON_ONLY.includes(s));
}

// The four tabs (backend ORDER_GROUPS): what needs the owner, under way,
// finished, ended without a sale.
const GROUPS = ["todo", "doing", "done", "closed"] as const;
type Group = (typeof GROUPS)[number];
const PILL: Record<Group, string> = {
  todo: "bg-[#F6E6C8] text-amber-dark",
  doing: "bg-[#E1E4E7] text-ink",
  done: "bg-stock-bg text-stock",
  closed: "bg-[#E1E4E7] text-steel",
};
const groupOf = (status: string): Group =>
  ["PAYMENT_PENDING", "DISPUTED"].includes(status) ? "todo"
  : ["PAID", "PROCESSING", "SHIPPED"].includes(status) ? "doing"
  : status === "DELIVERED" ? "done" : "closed";
const digits = (phone: string) => phone.replace(/\D/g, "");

// Orders (redesign step 6, option B): status tabs with counts, one card per
// order with the customer's phone (call / WhatsApp) and the next step as one
// button. The backend's state machine still decides every allowed move.
export default function AdminOrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersBoard />
    </Suspense>
  );
}

function OrdersBoard() {
  const t = useTranslations("AdminOrders");
  const tc = useTranslations("AdminCommon");
  const ts = useTranslations("OrderStatus");
  const locale = useLocale();
  const apiError = useApiError();
  const router = useRouter();
  const pathname = usePathname();
  const statusLabel = (s: string) => (ts.has(s) ? ts(s as "PAID") : s);
  const requested = useSearchParams().get("group");
  const group: Group = GROUPS.find((g) => g === requested) ?? "todo";
  const list = useAdminList<Order>("/orders/admin/all", { group });
  const { items: orders, data, reload } = list;
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<Group, number> | null>(null);

  // Tab counts; refreshed whenever an order moves.
  const loadCounts = () =>
    apiFetch("/admin/stats").then(async (res) => {
      if (res.ok) setCounts((await res.json()).orderGroups);
    });
  useEffect(() => {
    loadCounts();
  }, []);
  async function load() {
    await Promise.all([reload(), loadCounts()]);
  }

  async function handleStatusChange(orderId: string, status: string) {
    setUpdatingId(orderId);
    const res = await apiFetch(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      alert(apiError(await readApiError(res), t("updateFailed")));
    }
    await load();
    setUpdatingId(null);
  }

  async function handleConfirmCash(order: Order) {
    if (!confirm(t("markPaidConfirm", { number: order.orderNumber }))) return;
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
      unpaid ? t("cancelConfirm.cancel", { number: order.orderNumber }) : t("cancelConfirm.refund", { number: order.orderNumber }),
      stillInStore ? t("cancelConfirm.restock") : t("cancelConfirm.noRestock"),
      unpaid ? "" : t("cancelConfirm.refundNote"),
    ].join(" ");
    if (!confirm(message)) return;
    setUpdatingId(order.id);
    const res = await apiFetch(`/orders/${order.id}/cancel`, { method: "POST" });
    if (!res.ok) alert(apiError(await readApiError(res), t("cancelFailed")));
    await load();
    setUpdatingId(null);
  }

  const rows = orders.map((o) => ({
    ...o,
    pendingCash: o.status === "PAYMENT_PENDING" && o.payments.some((p) => p.provider === "cash" && p.status === "PENDING"),
    next: o.nextStatuses.filter((s) => !BUTTON_ONLY.includes(s)),
  }));
  const tabClass = (on: boolean) =>
    `inline-flex h-11 items-center gap-1.5 rounded-full px-4 font-bold ${on ? "bg-ink text-paper" : "border border-[#BDB5A6] bg-card text-ink hover:border-ink"}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl sm:text-[38px] font-bold text-ink">{t("title")}</h1>
        <div className="w-full sm:w-80">
          <SearchBox value={list.search} onChange={list.setSearch} placeholder={t("searchPlaceholder")} />
        </div>
      </div>

      <div role="tablist" aria-label={tc("status")} className="flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={g === group}
            onClick={() => router.replace(`${pathname}?group=${g}`, { scroll: false })}
            className={tabClass(g === group)}
          >
            {t(`groups.${g}`)}
            {counts && (
              <span className={`rounded-full px-1.5 text-[13px] leading-5 ${g === group ? "bg-amber text-ink" : "bg-sand text-ink"}`}>
                {counts[g].toLocaleString(locale)}
              </span>
            )}
          </button>
        ))}
      </div>

      {list.loading ? (
        <p className="text-steel">{tc("loading")}</p>
      ) : orders.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line bg-card p-6 text-center text-steel">
          {list.searching ? t("noMatch") : t(`groupEmpty.${group}`)}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((o) => {
            const busy = updatingId === o.id;
            const [primary, ...others] = o.next;
            return (
              <li key={o.id} className="flex flex-col gap-3.5 rounded-[14px] border border-line bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-lg font-bold text-ink">{o.user.firstName} {o.user.lastName}</span>
                    <span className="text-sm text-steel">
                      <span className="font-mono">{o.orderNumber}</span> ·{" "}
                      {new Date(o.createdAt).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-ink">{o.items.map((i) => `${i.productName} × ${i.quantity}`).join(" · ")}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xl font-bold text-ink">{formatMoney(o.total)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold ${PILL[groupOf(o.status)]}`}>
                      {o.pendingCash ? t("cashAwaitingPickup") : statusLabel(o.status)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-sand pt-3.5">
                  <a href={`tel:${o.shippingPhone}`} className="inline-flex h-11 items-center rounded-[10px] border border-[#BDB5A6] px-3.5 font-bold text-ink hover:border-ink">
                    {t("call", { phone: o.shippingPhone })}
                  </a>
                  <a
                    href={`https://wa.me/${digits(o.shippingPhone)}?text=${encodeURIComponent(t("whatsappMessage", { name: o.user.firstName, number: o.orderNumber }))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center rounded-[10px] border-2 border-[#1E7B45] px-3.5 font-bold text-[#1E7B45] hover:bg-emerald-50"
                  >
                    WhatsApp
                  </a>
                  {canCancel(o) && (
                    <button type="button" onClick={() => handleCancel(o)} disabled={busy} className="px-2 text-sm font-semibold text-[#8A3821] underline underline-offset-2 disabled:opacity-50">
                      {t("cancelRefund")}
                    </button>
                  )}
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    {others.length > 0 && (
                      <select
                        aria-label={t("otherStatus")}
                        value=""
                        disabled={busy}
                        onChange={(e) => e.target.value && handleStatusChange(o.id, e.target.value)}
                        className="h-11 rounded-[10px] border border-[#BDB5A6] bg-white px-2 text-sm"
                      >
                        <option value="">{t("otherStatus")}</option>
                        {others.map((s) => (
                          <option key={s} value={s}>{statusLabel(s)}</option>
                        ))}
                      </select>
                    )}
                    {o.pendingCash ? (
                      <button type="button" onClick={() => handleConfirmCash(o)} disabled={busy} className="h-11 rounded-[10px] bg-amber px-4 font-bold text-ink hover:bg-amber-dark disabled:opacity-50">
                        {busy ? "…" : t("markPaidCash")}
                      </button>
                    ) : (
                      primary && (
                        <button type="button" onClick={() => handleStatusChange(o.id, primary)} disabled={busy} className="h-11 rounded-[10px] bg-amber px-4 font-bold text-ink hover:bg-amber-dark disabled:opacity-50">
                          {busy ? "…" : t("moveTo", { status: statusLabel(primary) })}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={list.setPage} />}
    </div>
  );
}
