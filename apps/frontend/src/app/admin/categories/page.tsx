"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Category = { id: string; name: string; _count: { products: number } };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/categories");
    if (res.ok) setCategories(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await apiFetch("/categories", { method: "POST", body: JSON.stringify({ name }) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Failed to add category");
      return;
    }
    setName("");
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    await apiFetch(`/categories/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-6">Categories</h1>
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="border border-zinc-300 rounded-lg px-3 py-2 flex-1" required />
        <button className="bg-zinc-900 text-white rounded-lg px-4 py-2">Add</button>
      </form>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <ul className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between p-3 text-sm">
            <span>{c.name} <span className="text-zinc-400">({c._count.products} products)</span></span>
            <button onClick={() => handleDelete(c.id)} className="text-red-600 underline">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}