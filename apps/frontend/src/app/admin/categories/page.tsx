"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, readApiError } from "@/lib/api";
import { useApiError } from "@/lib/use-api-error";

type Category = { id: string; name: string; nameFr: string | null; slug: string; _count: { products: number } };

const inputClass = "admin-input";

export default function AdminCategoriesPage() {
  const t = useTranslations("AdminCategories");
  const tc = useTranslations("AdminCommon");
  const apiError = useApiError();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", nameFr: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string; nameFr: string } | null>(null);

  async function load() {
    const res = await apiFetch("/categories");
    if (res.ok) setCategories(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await apiFetch("/categories", { method: "POST", body: JSON.stringify({ name: form.name, nameFr: form.nameFr || undefined }) });
    setSubmitting(false);
    if (!res.ok) return setError(apiError(await readApiError(res), t("addFailed")));
    setForm({ name: "", nameFr: "" });
    await load();
  }

  async function handleSave() {
    if (!editing) return;
    setBusyId(editing.id);
    setError(null);
    const res = await apiFetch(`/categories/${editing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: editing.name, nameFr: editing.nameFr }),
    });
    setBusyId(null);
    if (!res.ok) return setError(apiError(await readApiError(res), t("saveFailed")));
    setEditing(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    setBusyId(id);
    setError(null);
    const res = await apiFetch(`/categories/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) return setError(apiError(await readApiError(res), t("deleteFailed")));
    await load();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="admin-title">{t("title")}</h1>
        <p className="text-steel">{t("intro")}</p>
      </div>
      <form onSubmit={handleAdd} className="admin-card flex flex-col gap-2 p-4 sm:flex-row">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("nameEn")} aria-label={t("nameEn")} className={`${inputClass} flex-1`} required />
        <input value={form.nameFr} onChange={(e) => setForm({ ...form, nameFr: e.target.value })} placeholder={t("nameFrPlaceholder")} aria-label={t("nameFr")} className={`${inputClass} flex-1`} />
        <button disabled={submitting} className="btn-primary h-11">{submitting ? tc("adding") : tc("add")}</button>
      </form>
      {error && <p role="alert" className="text-sm text-rust-dark">{error}</p>}
      <ul className="admin-card overflow-hidden divide-y divide-sand">
        {categories.map((c) =>
          editing?.id === c.id ? (
            <li key={c.id} className="flex flex-col gap-2 bg-[#F6E6C8] px-4 py-3 sm:flex-row">
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-label={t("nameEn")} className={`${inputClass} flex-1`} />
              <input value={editing.nameFr} onChange={(e) => setEditing({ ...editing, nameFr: e.target.value })} placeholder={t("nameFrPlaceholder")} aria-label={t("nameFr")} className={`${inputClass} flex-1`} />
              <div className="flex gap-2">
                <button type="button" onClick={handleSave} disabled={busyId === c.id} className="btn-primary h-11">{tc("save")}</button>
                <button type="button" onClick={() => setEditing(null)} className="admin-action">{tc("cancel")}</button>
              </div>
            </li>
          ) : (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="font-bold text-ink">{c.name}</span>
                {c.nameFr && <span className="text-steel"> / {c.nameFr}</span>}{" "}
                <span className="text-sm text-steel">{t("productCount", { count: c._count.products })}</span>
              </span>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditing({ id: c.id, name: c.name, nameFr: c.nameFr ?? "" })}
                  className="admin-action h-9"
                >
                  {tc("edit")}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  disabled={busyId === c.id}
                  className="link-danger"
                >
                  {tc("delete")}
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
