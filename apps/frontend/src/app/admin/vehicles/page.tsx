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
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Failed to add vehicle");
      setSubmitting(false);
      return;
    }
    setForm({ manufacturer: "", model: "", yearStart: "", yearEnd: "", engine: "" });
    await load();
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vehicle configuration?")) return;
    setDeletingId(id);
    await apiFetch(`/vehicles/${id}`, { method: "DELETE" });
    await load();
    setDeletingId(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">Vehicles</h1>

      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 bg-white border border-steel-light rounded-lg p-4">
        <div>
          <label className="block text-xs font-medium mb-1">Manufacturer</label>
          <input required value={form.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} className="w-full border border-steel-light rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Model</label>
          <input required value={form.model} onChange={(e) => update("model", e.target.value)} className="w-full border border-steel-light rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Year start</label>
          <input required type="number" value={form.yearStart} onChange={(e) => update("yearStart", e.target.value)} className="w-full border border-steel-light rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Year end (optional)</label>
          <input type="number" value={form.yearEnd} onChange={(e) => update("yearEnd", e.target.value)} className="w-full border border-steel-light rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Engine (optional)</label>
          <input value={form.engine} onChange={(e) => update("engine", e.target.value)} className="w-full border border-steel-light rounded-lg px-3 py-2 text-sm" />
        </div>
        {error && <p className="sm:col-span-2 text-red-600 text-sm">{error}</p>}
        <button disabled={submitting} className="sm:col-span-2 bg-ink text-white rounded-lg py-2 text-sm disabled:opacity-50">{submitting ? "Adding…" : "Add vehicle"}</button>
      </form>

      <ul className="bg-white border border-steel-light rounded-lg divide-y divide-steel-light">
        {vehicles.map((v) => (
          <li key={v.id} className="flex items-center justify-between p-3 text-sm">
            <span>
              {v.manufacturer} {v.model} ({v.yearStart}{v.yearEnd ? `–${v.yearEnd}` : "+"})
              {v.engine && ` · ${v.engine}`}
              <span className="text-steel"> — {v._count.compatibilities} products</span>
            </span>
            <button
              onClick={() => handleDelete(v.id)}
              disabled={deletingId === v.id}
              className="shrink-0 border border-red-200 bg-red-50 text-red-600 rounded-lg px-3 py-1.5 text-xs transition-colors duration-200 hover:bg-red-100 disabled:opacity-50"
            >
              {deletingId === v.id ? "Deleting…" : "Delete"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}