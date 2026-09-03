"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const inputClass = "w-full border border-zinc-300 rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-zinc-500";
const labelClass = "block text-sm font-medium mb-1 text-zinc-700";

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  defaultShippingAddress: string;
  defaultShippingCity: string;
  defaultShippingPhone: string;
};

const emptyForm: ProfileForm = {
  firstName: "", lastName: "", phone: "",
  defaultShippingAddress: "", defaultShippingCity: "", defaultShippingPhone: "",
};

export function AccountDetails({ variant }: { variant: "customer" | "admin" }) {
  const { user } = useAuth();
  const isAdmin = variant === "admin";

  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [editing, setEditing] = useState(false);
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

  function update(field: keyof ProfileForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  function startEdit() {
    setError(null);
    setSaved(false);
    setEditing(true);
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
    setEditing(false);
  }

  const addressLabel = isAdmin ? "Address" : "Contact address";
  const secondaryPhoneLabel = isAdmin ? "Secondary phone" : "Contact phone (for orders)";

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  if (!editing) {
    const rows = [
      { label: "Email", value: user?.email },
      { label: "Name", value: [form.firstName, form.lastName].filter(Boolean).join(" ") || "—" },
      { label: "Phone", value: form.phone || "—" },
      { label: addressLabel, value: form.defaultShippingAddress || "—" },
      { label: "City", value: form.defaultShippingCity || "—" },
      { label: secondaryPhoneLabel, value: form.defaultShippingPhone || "—" },
    ];

    return (
      <div>
        {saved && <p className="text-emerald-600 text-sm mb-4">Saved.</p>}
        <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between p-3 text-sm">
              <span className="text-zinc-500">{r.label}</span>
              <span className="text-zinc-900 font-medium">{r.value}</span>
            </div>
          ))}
        </div>
        <button
          onClick={startEdit}
          className="mt-4 rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 text-white px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800 hover:shadow-md"
        >
          Edit details
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>First name</label>
          <input required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Last name</label>
          <input required value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{addressLabel}</label>
        <input value={form.defaultShippingAddress} onChange={(e) => update("defaultShippingAddress", e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>City</label>
        <input value={form.defaultShippingCity} onChange={(e) => update("defaultShippingCity", e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{secondaryPhoneLabel}</label>
        <input value={form.defaultShippingPhone} onChange={(e) => update("defaultShippingPhone", e.target.value)} className={inputClass} />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 text-white py-2 font-medium shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800 hover:shadow-md disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors duration-200 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
