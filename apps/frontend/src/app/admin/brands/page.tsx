"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, readApiError } from "@/lib/api";
import { useApiError } from "@/lib/use-api-error";

type Brand = { id: string; name: string; _count: { products: number } };

export default function AdminBrandsPage() {
  const t = useTranslations("AdminBrands");
  const tc = useTranslations("AdminCommon");
  const apiError = useApiError();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/brands");
    if (res.ok) setBrands(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await apiFetch("/brands", { method: "POST", body: JSON.stringify({ name }) });
    if (!res.ok) {
      setError(apiError(await readApiError(res), t("addFailed")));
      setSubmitting(false);
      return;
    }
    setName("");
    await load();
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    setDeletingId(id);
    await apiFetch(`/brands/${id}`, { method: "DELETE" });
    await load();
    setDeletingId(null);
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <h1 className="admin-title">{t("title")}</h1>
      <form onSubmit={handleAdd} className="admin-card flex flex-col gap-2 p-4 sm:flex-row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} aria-label={t("namePlaceholder")} className="admin-input flex-1" required />
        <button disabled={submitting} className="btn-primary h-11">{submitting ? tc("adding") : tc("add")}</button>
      </form>
      {error && <p role="alert" className="text-sm text-rust-dark">{error}</p>}
      <ul className="admin-card overflow-hidden divide-y divide-sand">
        {brands.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="font-bold text-ink">{b.name}</span>{" "}
              <span className="text-sm text-steel">{t("productCount", { count: b._count.products })}</span>
            </span>
            <button
              type="button"
              onClick={() => handleDelete(b.id)}
              disabled={deletingId === b.id}
              className="link-danger shrink-0"
            >
              {deletingId === b.id ? tc("deleting") : tc("delete")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}