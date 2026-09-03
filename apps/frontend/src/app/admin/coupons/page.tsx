"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
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
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", type: "PERCENTAGE", value: "", minOrderTotal: "", maxUses: "", expiresAt: "" });

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
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Failed to create coupon");
      return;
    }
    setForm({ code: "", type: "PERCENTAGE", value: "", minOrderTotal: "", maxUses: "", expiresAt: "" });
    load();
  }

  async function toggleActive(coupon: Coupon) {
    await apiFetch(`/coupons/${coupon.id}`, { method: "PATCH", body: JSON.stringify({ active: !coupon.active }) });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this coupon?")) return;
    await apiFetch(`/coupons/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-6">Coupons</h1>

      <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 mb-6 bg-white border border-zinc-200 rounded-lg p-4">
        <div>
          <label className="block text-xs font-medium mb-1">Code</label>
          <input required value={form.code} onChange={(e) => update("code", e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Type</label>
          <select value={form.type} onChange={(e) => update("type", e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm">
            <option value="PERCENTAGE">Percentage off</option>
            <option value="FIXED">Fixed amount off (FCFA)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Value</label>
          <input required type="number" min="0" value={form.value} onChange={(e) => update("value", e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Min. order total (optional)</label>
          <input type="number" min="0" value={form.minOrderTotal} onChange={(e) => update("minOrderTotal", e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Max uses (optional)</label>
          <input type="number" min="1" value={form.maxUses} onChange={(e) => update("maxUses", e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Expires (optional)</label>
          <input type="date" value={form.expiresAt} onChange={(e) => update("expiresAt", e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        {error && <p className="col-span-2 text-red-600 text-sm">{error}</p>}
        <button className="col-span-2 bg-zinc-900 text-white rounded-lg py-2 text-sm">Create coupon</button>
      </form>

      {coupons.length === 0 ? (
        <p className="text-zinc-500">No coupons yet.</p>
      ) : (
        <table className="w-full text-sm bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Discount</th>
              <th className="p-3">Min. order</th>
              <th className="p-3">Uses</th>
              <th className="p-3">Expires</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t border-zinc-100">
                <td className="p-3 font-mono">{c.code}</td>
                <td className="p-3">{c.type === "PERCENTAGE" ? `${c.value}%` : formatMoney(c.value)}</td>
                <td className="p-3">{c.minOrderTotal ? formatMoney(c.minOrderTotal) : "—"}</td>
                <td className="p-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                <td className="p-3">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}</td>
                <td className="p-3">
                  <button onClick={() => toggleActive(c)}
                    className={`text-xs px-2 py-1 rounded-full ${c.active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}`}>
                    {c.active ? "ACTIVE" : "INACTIVE"}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => remove(c.id)} className="text-red-600 underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
