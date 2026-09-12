"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Brand = { id: string; name: string; _count: { products: number } };

export default function AdminBrandsPage() {
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
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Failed to add brand");
      setSubmitting(false);
      return;
    }
    setName("");
    await load();
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this brand?")) return;
    setDeletingId(id);
    await apiFetch(`/brands/${id}`, { method: "DELETE" });
    await load();
    setDeletingId(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">Brands</h1>
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New brand name" className="border border-steel-light rounded-lg px-3 py-2 flex-1" required />
        <button disabled={submitting} className="bg-ink text-white rounded-lg px-4 py-2 disabled:opacity-50">{submitting ? "Adding…" : "Add"}</button>
      </form>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <ul className="bg-white border border-steel-light rounded-lg divide-y divide-steel-light">
        {brands.map((b) => (
          <li key={b.id} className="flex items-center justify-between p-3 text-sm">
            <span>{b.name} <span className="text-steel">({b._count.products} products)</span></span>
            <button
              onClick={() => handleDelete(b.id)}
              disabled={deletingId === b.id}
              className="border border-red-200 bg-red-50 text-red-600 rounded-lg px-3 py-1.5 text-xs transition-colors duration-200 hover:bg-red-100 disabled:opacity-50"
            >
              {deletingId === b.id ? "Deleting…" : "Delete"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}