"use client";
import { useEffect, useState } from "react";
import { apiFetch, readError } from "@/lib/api";

type Category = { id: string; name: string; nameFr: string | null; slug: string; _count: { products: number } };

const inputClass = "border border-steel-light rounded-lg px-3 py-2 text-sm";

export default function AdminCategoriesPage() {
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
    if (!res.ok) return setError(await readError(res, "Failed to add category"));
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
    if (!res.ok) return setError(await readError(res, "Failed to save category"));
    setEditing(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    setBusyId(id);
    setError(null);
    const res = await apiFetch(`/categories/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) return setError(await readError(res, "Failed to delete category"));
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-2">Categories</h1>
      <p className="text-sm text-steel mb-6">
        The French name is shown on the French site (e.g. &ldquo;Freinage&rdquo; for &ldquo;Brakes&rdquo;). Renaming keeps the page address, so existing links keep working.
      </p>
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-6">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name (English)" aria-label="Name (English)" className={`${inputClass} flex-1`} required />
        <input value={form.nameFr} onChange={(e) => setForm({ ...form, nameFr: e.target.value })} placeholder="Nom (français)" aria-label="Name (French)" className={`${inputClass} flex-1`} />
        <button disabled={submitting} className="bg-ink text-white rounded-lg px-4 py-2 disabled:opacity-50">{submitting ? "Adding…" : "Add"}</button>
      </form>
      {error && <p role="alert" className="text-red-600 text-sm mb-4">{error}</p>}
      <ul className="bg-white border border-steel-light rounded-lg divide-y divide-steel-light">
        {categories.map((c) =>
          editing?.id === c.id ? (
            <li key={c.id} className="flex flex-col sm:flex-row gap-2 p-3 text-sm">
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-label="Name (English)" className={`${inputClass} flex-1`} />
              <input value={editing.nameFr} onChange={(e) => setEditing({ ...editing, nameFr: e.target.value })} placeholder="Nom (français)" aria-label="Name (French)" className={`${inputClass} flex-1`} />
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={busyId === c.id} className="bg-ink text-white rounded-lg px-3 py-1.5 text-xs disabled:opacity-50">Save</button>
                <button onClick={() => setEditing(null)} className="border border-steel-light rounded-lg px-3 py-1.5 text-xs">Cancel</button>
              </div>
            </li>
          ) : (
            <li key={c.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span>
                {c.name}
                {c.nameFr && <span className="text-steel"> / {c.nameFr}</span>}{" "}
                <span className="text-steel">({c._count.products} products)</span>
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditing({ id: c.id, name: c.name, nameFr: c.nameFr ?? "" })}
                  className="border border-steel-light rounded-lg px-3 py-1.5 text-xs hover:border-ink"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={busyId === c.id}
                  className="border border-red-200 bg-red-50 text-red-600 rounded-lg px-3 py-1.5 text-xs transition-colors duration-200 hover:bg-red-100 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
