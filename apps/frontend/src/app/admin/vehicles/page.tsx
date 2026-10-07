"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, readApiError } from "@/lib/api";
import { useApiError } from "@/lib/use-api-error";

type Vehicle = {
  id: string; manufacturer: string; model: string; yearStart: number; yearEnd: number | null; engine: string | null;
  _count: { compatibilities: number };
};

export default function AdminVehiclesPage() {
  const t = useTranslations("AdminVehicles");
  const tc = useTranslations("AdminCommon");
  const apiError = useApiError();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState({ manufacturer: "", model: "", yearStart: "", yearEnd: "", engine: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/vehicles/admin/all");
    if (res.ok) setVehicles(await res.json());
  }

  useEffect(() => { load(); }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await apiFetch("/vehicles", {
      method: "POST",
      body: JSON.stringify({
        manufacturer: form.manufacturer,
        model: form.model,
        yearStart: Number(form.yearStart),
        yearEnd: form.yearEnd ? Number(form.yearEnd) : undefined,
        engine: form.engine || undefined,
      }),
    });
    if (!res.ok) {
      setError(apiError(await readApiError(res), t("addFailed")));
      setSubmitting(false);
      return;
    }
    setForm({ manufacturer: "", model: "", yearStart: "", yearEnd: "", engine: "" });
    await load();
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    setDeletingId(id);
    await apiFetch(`/vehicles/${id}`, { method: "DELETE" });
    await load();
    setDeletingId(null);
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <h1 className="admin-title">{t("title")}</h1>

      <form onSubmit={handleAdd} className="admin-card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
        <label className="admin-label">
          {t("manufacturer")}
          <input required value={form.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} className="admin-input" />
        </label>
        <label className="admin-label">
          {t("model")}
          <input required value={form.model} onChange={(e) => update("model", e.target.value)} className="admin-input" />
        </label>
        <label className="admin-label">
          {t("yearStart")}
          <input required type="number" value={form.yearStart} onChange={(e) => update("yearStart", e.target.value)} className="admin-input" />
        </label>
        <label className="admin-label">
          {t("yearEnd")}
          <input type="number" value={form.yearEnd} onChange={(e) => update("yearEnd", e.target.value)} className="admin-input" />
        </label>
        <label className="admin-label sm:col-span-2">
          {t("engine")}
          <input value={form.engine} onChange={(e) => update("engine", e.target.value)} className="admin-input" />
        </label>
        {error && <p role="alert" className="sm:col-span-2 text-sm text-rust-dark">{error}</p>}
        <button disabled={submitting} className="btn-primary h-11 sm:col-span-2">{submitting ? tc("adding") : t("addVehicle")}</button>
      </form>

      <ul className="admin-card overflow-hidden divide-y divide-sand">
        {vehicles.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="font-bold text-ink">{v.manufacturer} {v.model}</span>{" "}
              <span className="text-steel">
                {v.yearStart}{v.yearEnd ? `–${v.yearEnd}` : "+"}
                {v.engine && ` · ${v.engine}`}
              </span>
              <span className="block text-sm text-steel">{t("productCount", { count: v._count.compatibilities })}</span>
            </span>
            <button
              type="button"
              onClick={() => handleDelete(v.id)}
              disabled={deletingId === v.id}
              className="link-danger shrink-0"
            >
              {deletingId === v.id ? tc("deleting") : tc("delete")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}