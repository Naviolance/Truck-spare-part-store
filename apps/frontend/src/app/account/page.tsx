"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const inputClass = "w-full border border-zinc-300 rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-zinc-500";
const labelClass = "block text-sm font-medium mb-1 text-zinc-700";

export default function AccountPage() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "",
    defaultShippingAddress: "", defaultShippingCity: "", defaultShippingPhone: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/users/me").then(async (res) => {
      if (res.ok) {
        const u = await res.json();
        setForm({
          firstName: u.firstName ?? "",
          lastName: u.lastName ?? "",
          phone: u.phone ?? "",
          defaultShippingAddress: u.defaultShippingAddress ?? "",
          defaultShippingCity: u.defaultShippingCity ?? "",
          defaultShippingPhone: u.defaultShippingPhone ?? "",
        });
      }
      setLoading(false);
    });
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify(form) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Could not save changes");
      setSaving(false);
      return;
    }
    setSaved(true);
    setSaving(false);
  }

  if (loading) return <main className="max-w-lg mx-auto px-4 py-16 text-zinc-500">Loading…</main>;

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-6">Your account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>First name</label>
            <input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Last name</label>
            <input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Contact address</label>
          <input value={form.defaultShippingAddress} onChange={(e) => update("defaultShippingAddress", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>City</label>
          <input value={form.defaultShippingCity} onChange={(e) => update("defaultShippingCity", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Contact phone (for orders)</label>
          <input value={form.defaultShippingPhone} onChange={(e) => update("defaultShippingPhone", e.target.value)} className={inputClass} />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {saved && <p className="text-emerald-600 text-sm">Saved.</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 text-white py-2 font-medium shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800 hover:shadow-md disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </main>
  );
}
