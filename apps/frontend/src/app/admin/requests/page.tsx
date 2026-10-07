"use client";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { useAdminList } from "@/lib/admin-list";
import { Pager, SearchBox } from "@/components/admin/ListControls";

type ProductRequest = {
  id: string;
  description: string;
  partNumber: string | null;
  vehicleInfo: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  // Null for guest requests — contact details below are what matter.
  user: { firstName: string; lastName: string; email: string } | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactViaWhatsApp: boolean;
};

const digits = (phone: string) => phone.replace(/\D/g, "");

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "FULFILLED", "DECLINED"];

const PILL: Record<string, string> = {
  OPEN: "bg-[#F6E6C8] text-amber-dark",
  IN_PROGRESS: "bg-[#E1E4E7] text-ink",
  FULFILLED: "bg-stock-bg text-stock",
  DECLINED: "bg-[#F1DCD5] text-rust-dark",
};

// Part requests in the admin's step 6 style: status tabs (from ?status=, so
// the dashboard's "open requests" card lands on the right one), one card per
// request with call / WhatsApp buttons and the status change on the card.
export default function AdminRequestsPage() {
  return (
    <Suspense fallback={null}>
      <RequestsBoard />
    </Suspense>
  );
}

function RequestsBoard() {
  const t = useTranslations("AdminRequests");
  const tc = useTranslations("AdminCommon");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const fromUrl = useSearchParams().get("status") ?? "";
  const status = STATUS_OPTIONS.includes(fromUrl) ? fromUrl : "";
  const statusLabel = (s: string) => (tc.has(`requestStatus.${s}`) ? tc(`requestStatus.${s}` as "requestStatus.OPEN") : s);
  const list = useAdminList<ProductRequest>("/product-requests/admin/all", { status });
  const { items: requests, data, reload: load } = list;
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function pick(next: string) {
    router.replace(next ? `${pathname}?status=${next}` : pathname, { scroll: false });
  }

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id);
    await apiFetch(`/product-requests/admin/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await load();
    setUpdatingId(null);
  }

  async function handleNoteBlur(id: string, adminNote: string) {
    await apiFetch(`/product-requests/admin/${id}`, { method: "PATCH", body: JSON.stringify({ adminNote }) });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="admin-title">{t("title")}</h1>
        <div className="w-full sm:w-80">
          <SearchBox value={list.search} onChange={list.setSearch} placeholder={t("searchPlaceholder")} />
        </div>
      </div>

      <div role="tablist" aria-label={tc("status")} className="flex flex-wrap gap-2">
        {["", ...STATUS_OPTIONS].map((s) => (
          <button key={s || "all"} type="button" role="tab" aria-selected={s === status} onClick={() => pick(s)} className={s === status ? "admin-pill-on" : "admin-pill"}>
            {s ? statusLabel(s) : tc("allStatuses")}
          </button>
        ))}
      </div>

      {list.loading ? (
        <p className="text-steel">{tc("loading")}</p>
      ) : requests.length === 0 ? (
        <p className="admin-empty">{list.searching || status ? t("noMatch") : t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => {
            const name = r.contactName ?? (r.user ? `${r.user.firstName} ${r.user.lastName}` : "—");
            const email = r.contactEmail ?? r.user?.email;
            return (
              <li key={r.id} className="admin-card flex flex-col gap-3.5 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-lg font-bold text-ink">{r.description}</span>
                    {(r.partNumber || r.vehicleInfo) && (
                      <span className="text-sm text-steel">
                        {r.partNumber && <span className="font-mono">{t("partNumber", { partNumber: r.partNumber })}</span>}
                        {r.partNumber && r.vehicleInfo && " · "}
                        {r.vehicleInfo && t("vehicle", { vehicle: r.vehicleInfo })}
                      </span>
                    )}
                    <span className="text-sm text-steel">
                      <span className="font-semibold text-ink">{name}</span>
                      {!r.user && ` (${t("guest")})`}
                      {email && ` · ${email}`} · {new Date(r.createdAt).toLocaleDateString(locale)}
                    </span>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold ${PILL[r.status] ?? "bg-sand text-ink"}`}>{statusLabel(r.status)}</span>
                </div>

                <textarea
                  defaultValue={r.adminNote ?? ""}
                  onBlur={(e) => handleNoteBlur(r.id, e.target.value)}
                  placeholder={t("notePlaceholder")}
                  aria-label={t("noteLabel")}
                  rows={2}
                  className="w-full rounded-[10px] border border-[#BDB5A6] bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                />

                <div className="flex flex-wrap items-center gap-2 border-t border-sand pt-3.5">
                  {r.contactPhone && (
                    <>
                      <a href={`tel:${r.contactPhone}`} className="admin-action">
                        {t("call")} <span className="ml-1.5 font-mono font-medium">{r.contactPhone}</span>
                      </a>
                      <a
                        href={`https://wa.me/${digits(r.contactPhone)}?text=${encodeURIComponent(t("whatsappMessage", { name: r.contactName ?? "", description: r.description.slice(0, 80) }))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex h-11 items-center rounded-[10px] px-3.5 font-bold ${r.contactViaWhatsApp ? "bg-[#25D366] text-ink" : "border-2 border-[#1E7B45] text-[#1E7B45] hover:bg-emerald-50"}`}
                      >
                        {r.contactViaWhatsApp ? t("whatsappPreferred") : "WhatsApp"}
                      </a>
                    </>
                  )}
                  <label className="ml-auto flex items-center gap-2 text-sm font-semibold text-steel">
                    {tc("status")}
                    <select
                      value={r.status}
                      disabled={updatingId === r.id}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      className="admin-input w-auto disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{statusLabel(s)}</option>
                      ))}
                    </select>
                  </label>
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
