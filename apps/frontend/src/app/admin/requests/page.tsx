"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { useAdminList } from "@/lib/admin-list";
import { FilterSelect, Pager, SearchBox } from "@/components/admin/ListControls";

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

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-steel-light text-steel",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  FULFILLED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
};

export default function AdminRequestsPage() {
  const t = useTranslations("AdminRequests");
  const tc = useTranslations("AdminCommon");
  const locale = useLocale();
  const statusLabel = (s: string) => (tc.has(`requestStatus.${s}`) ? tc(`requestStatus.${s}` as "requestStatus.OPEN") : s);
  const [status, setStatus] = useState("");
  const list = useAdminList<ProductRequest>("/product-requests/admin/all", { status });
  const { items: requests, data, reload: load } = list;
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id);
    await apiFetch(`/product-requests/admin/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await load();
    setUpdatingId(null);
  }

  async function handleNoteBlur(id: string, adminNote: string) {
    await apiFetch(`/product-requests/admin/${id}`, { method: "PATCH", body: JSON.stringify({ adminNote }) });
  }

  if (list.loading) return <p className="text-steel">{tc("loading")}</p>;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">{t("title")}</h1>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <SearchBox value={list.search} onChange={list.setSearch} placeholder={t("searchPlaceholder")} />
        <FilterSelect
          label={tc("status")}
          value={status}
          onChange={setStatus}
          options={[{ value: "", label: tc("allStatuses") }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: statusLabel(s) }))]}
        />
      </div>

      {requests.length === 0 ? (
        <p className="text-steel">{list.searching || status ? t("noMatch") : t("empty")}</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="bg-white border border-steel-light rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-ink">{r.description}</p>
                  {r.partNumber && <p className="text-xs text-steel mt-1">{t("partNumber", { partNumber: r.partNumber })}</p>}
                  {r.vehicleInfo && <p className="text-xs text-steel">{t("vehicle", { vehicle: r.vehicleInfo })}</p>}
                  <p className="text-xs text-steel mt-1">
                    {r.contactName ?? (r.user ? `${r.user.firstName} ${r.user.lastName}` : "—")}
                    {!r.user && ` (${t("guest")})`}
                    {(r.contactEmail ?? r.user?.email) && ` · ${r.contactEmail ?? r.user?.email}`} · {new Date(r.createdAt).toLocaleDateString(locale)}
                  </p>
                  {r.contactPhone && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-sm font-mono text-ink">{r.contactPhone}</span>
                      <a href={`tel:${r.contactPhone}`} className="text-xs border border-steel-light rounded-lg px-2 py-1 hover:border-ink">{t("call")}</a>
                      <a
                        href={`https://wa.me/${digits(r.contactPhone)}?text=${encodeURIComponent(t("whatsappMessage", { name: r.contactName ?? "", description: r.description.slice(0, 80) }))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs rounded-lg px-2 py-1 ${r.contactViaWhatsApp ? "bg-[#25D366] text-ink font-semibold" : "border border-steel-light hover:border-ink"}`}
                      >
                        {r.contactViaWhatsApp ? t("whatsappPreferred") : "WhatsApp"}
                      </a>
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[r.status] || "bg-steel-light"}`}>
                    {statusLabel(r.status)}
                  </span>
                  <select
                    value={r.status}
                    disabled={updatingId === r.id}
                    onChange={(e) => handleStatusChange(r.id, e.target.value)}
                    className="border border-steel-light rounded-lg px-2 py-1 text-xs"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{statusLabel(s)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                defaultValue={r.adminNote ?? ""}
                onBlur={(e) => handleNoteBlur(r.id, e.target.value)}
                placeholder={t("notePlaceholder")}
                aria-label={t("noteLabel")}
                rows={2}
                className="w-full mt-3 border border-steel-light rounded-lg px-3 py-2 text-sm text-steel transition-colors duration-200 focus:outline-none focus:border-steel"
              />
            </div>
          ))}
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={list.setPage} />}
    </div>
  );
}
