"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

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

  if (loading) return <main className="max-w-lg mx-auto px-4 py-16 text-gray-500">Loading…</main>;

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Your account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">First name</label>
            <input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last name</label>
            <input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contact address</label>
          <input value={form.defaultShippingAddress} onChange={(e) => update("defaultShippingAddress", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <input value={form.defaultShippingCity} onChange={(e) => update("defaultShippingCity", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contact phone (for orders)</label>
          <input value={form.defaultShippingPhone} onChange={(e) => update("defaultShippingPhone", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {saved && <p className="text-green-700 text-sm">Saved.</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gray-900 text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </main>
  );
}