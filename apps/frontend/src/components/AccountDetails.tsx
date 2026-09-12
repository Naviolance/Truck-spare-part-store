"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const inputClass = "w-full border border-steel-light rounded-lg px-3 py-2 transition-colors duration-200 focus:outline-none focus:border-steel";
const labelClass = "block text-sm font-medium mb-1 text-steel";

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

  if (loading) return <p className="text-steel">Loading…</p>;

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
        <div className="bg-white border border-steel-light rounded-lg divide-y divide-steel-light">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between p-3 text-sm">
              <span className="text-steel">{r.label}</span>
              <span className="text-ink font-medium">{r.value}</span>
            </div>
          ))}
        </div>
        <button
          onClick={startEdit}
          className="mt-4 bg-amber text-ink px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-amber-dark"
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
          className="flex-1 bg-amber text-ink py-2 font-medium transition-colors duration-150 hover:bg-amber-dark disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-steel-light px-4 py-2 text-sm font-medium text-steel transition-colors duration-200 hover:bg-paper"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
