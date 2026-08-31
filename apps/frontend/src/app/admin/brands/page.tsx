"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Brand = { id: string; name: string; _count: { products: number } };

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/brands");
    if (res.ok) setBrands(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await apiFetch("/brands", { method: "POST", body: JSON.stringify({ name }) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Failed to add brand");
      return;
    }
    setName("");
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this brand?")) return;
    await apiFetch(`/brands/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Brands</h1>
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New brand name" className="border border-gray-300 rounded px-3 py-2 flex-1" required />
        <button className="bg-gray-900 text-white rounded px-4 py-2">Add</button>
      </form>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {brands.map((b) => (
          <li key={b.id} className="flex items-center justify-between p-3 text-sm">
            <span>{b.name} <span className="text-gray-400">({b._count.products} products)</span></span>
            <button onClick={() => handleDelete(b.id)} className="text-red-600 underline">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}