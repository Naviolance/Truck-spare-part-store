"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch, readApiError } from "@/lib/api";
import { useApiError } from "@/lib/use-api-error";
import { formatMoney } from "@/lib/money";

type Coupon = {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: string;
  active: boolean;
  minOrderTotal: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
};

export default function AdminCouponsPage() {
  const t = useTranslations("AdminCoupons");
  const tc = useTranslations("AdminCommon");
  const locale = useLocale();
  const apiError = useApiError();
  const uses = (c: Coupon) => `${c.usedCount.toLocaleString(locale)}${c.maxUses ? ` / ${c.maxUses.toLocaleString(locale)}` : ""}`;
  const expires = (c: Coupon) => (c.expiresAt ? new Date(c.expiresAt).toLocaleDateString(locale) : "—");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", type: "PERCENTAGE", value: "", minOrderTotal: "", maxUses: "", expiresAt: "" });
  const [submitting, setSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/coupons/admin/all");
    if (res.ok) setCoupons(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await apiFetch("/coupons", {
      method: "POST",
      body: JSON.stringify({
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minOrderTotal: form.minOrderTotal ? Number(form.minOrderTotal) : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      }),
    });
    if (!res.ok) {
      setError(apiError(await readApiError(res), t("createFailed")));
      setSubmitting(false);
      return;
    }
    setForm({ code: "", type: "PERCENTAGE", value: "", minOrderTotal: "", maxUses: "", expiresAt: "" });
    await load();
    setSubmitting(false);
  }

  async function toggleActive(coupon: Coupon) {
    setPendingId(coupon.id);
    await apiFetch(`/coupons/${coupon.id}`, { method: "PATCH", body: JSON.stringify({ active: !coupon.active }) });
    await load();
    setPendingId(null);
  }

  async function remove(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    setPendingId(id);
    await apiFetch(`/coupons/${id}`, { method: "DELETE" });
    await load();
    setPendingId(null);
  }

  if (loading) return <p className="text-steel">{tc("loading")}</p>;

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <h1 className="admin-title">{t("title")}</h1>

      <form onSubmit={handleCreate} className="admin-card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
        <label className="admin-label">
          {t("code")}
          <input required value={form.code} onChange={(e) => update("code", e.target.value)} className="admin-input" />
        </label>
        <label className="admin-label">
          {t("type")}
          <select value={form.type} onChange={(e) => update("type", e.target.value)} className="admin-input">
            <option value="PERCENTAGE">{t("typePercentage")}</option>
            <option value="FIXED">{t("typeFixed")}</option>
          </select>
        </label>
        <label className="admin-label">
          {t("value")}
          <input required type="number" min="0" value={form.value} onChange={(e) => update("value", e.target.value)} className="admin-input" />
        </label>
        <label className="admin-label">
          {t("minOrderTotal")}
          <input type="number" min="0" value={form.minOrderTotal} onChange={(e) => update("minOrderTotal", e.target.value)} className="admin-input" />
        </label>
        <label className="admin-label">
          {t("maxUses")}
          <input type="number" min="1" value={form.maxUses} onChange={(e) => update("maxUses", e.target.value)} className="admin-input" />
        </label>
        <label className="admin-label">
          {t("expiresAt")}
          <input type="date" value={form.expiresAt} onChange={(e) => update("expiresAt", e.target.value)} className="admin-input" />
        </label>
        {error && <p role="alert" className="sm:col-span-2 text-sm text-rust-dark">{error}</p>}
        <button disabled={submitting} className="btn-primary h-11 sm:col-span-2">{submitting ? t("creating") : t("create")}</button>
      </form>

      {coupons.length === 0 ? (
        <p className="admin-empty">{t("empty")}</p>
      ) : (
        <ul className="admin-card overflow-hidden divide-y divide-sand">
          {coupons.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-mono text-lg font-medium text-ink">{c.code}</span>
                <span className="font-bold text-ink">{t("off", { amount: c.type === "PERCENTAGE" ? `${c.value}%` : formatMoney(c.value) })}</span>
                <span className="text-sm text-steel">
                  {t("minOrderLine", { value: c.minOrderTotal ? formatMoney(c.minOrderTotal) : "—" })} · {t("usesLine", { value: uses(c) })} ·{" "}
                  {t("expiresLine", { value: expires(c) })}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => toggleActive(c)}
                  disabled={pendingId === c.id}
                  aria-pressed={c.active}
                  className={`h-9 rounded-full px-3.5 text-sm font-bold disabled:opacity-50 ${c.active ? "bg-stock-bg text-stock" : "bg-[#E1E4E7] text-steel"}`}
                >
                  {pendingId === c.id ? "…" : c.active ? t("active") : t("inactive")}
                </button>
                <button type="button" onClick={() => remove(c.id)} disabled={pendingId === c.id} className="link-danger">
                  {pendingId === c.id ? tc("deleting") : tc("delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
