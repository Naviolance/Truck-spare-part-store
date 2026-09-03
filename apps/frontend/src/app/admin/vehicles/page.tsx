"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Vehicle = {
  id: string; manufacturer: string; model: string; yearStart: number; yearEnd: number | null; engine: string | null;
  _count: { compatibilities: number };
};

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState({ manufacturer: "", model: "", yearStart: "", yearEnd: "", engine: "" });
  const [error, setError] = useState<string | null>(null);

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
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Failed to add vehicle");
      return;
    }
    setForm({ manufacturer: "", model: "", yearStart: "", yearEnd: "", engine: "" });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vehicle configuration?")) return;
    await apiFetch(`/vehicles/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Vehicles</h1>

      <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3 mb-6 bg-white border border-zinc-200 rounded-lg p-4">
        <div>
          <label className="block text-xs font-medium mb-1">Manufacturer</label>
          <input required value={form.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Model</label>
          <input required value={form.model} onChange={(e) => update("model", e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Year start</label>
          <input required type="number" value={form.yearStart} onChange={(e) => update("yearStart", e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Year end (optional)</label>
          <input type="number" value={form.yearEnd} onChange={(e) => update("yearEnd", e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1">Engine (optional)</label>
          <input value={form.engine} onChange={(e) => update("engine", e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        {error && <p className="col-span-2 text-red-600 text-sm">{error}</p>}
        <button className="col-span-2 bg-zinc-900 text-white rounded-lg py-2 text-sm">Add vehicle</button>
      </form>

      <ul className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
        {vehicles.map((v) => (
          <li key={v.id} className="flex items-center justify-between p-3 text-sm">
            <span>
              {v.manufacturer} {v.model} ({v.yearStart}{v.yearEnd ? `–${v.yearEnd}` : "+"})
              {v.engine && ` · ${v.engine}`}
              <span className="text-zinc-400"> — {v._count.compatibilities} products</span>
            </span>
            <button onClick={() => handleDelete(v.id)} className="text-red-600 underline">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}