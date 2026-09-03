"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const inputClass = "w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm transition-colors duration-200 focus:outline-none focus:border-zinc-500";

// Dropped into any "no results" state (search, filters, Find My Part) so a
// customer who can't find a part isn't stuck — this is a lead for the admin
// to source and list, not something that creates a product automatically.
export function RequestProductForm({ prefillDescription = "" }: { prefillDescription?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(prefillDescription);
  const [partNumber, setPartNumber] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <p className="text-sm text-zinc-500">
        Can&apos;t find what you&apos;re looking for? <a href="/login" className="underline">Log in</a> to request it.
      </p>
    );
  }

  if (done) {
    return <p className="text-sm text-emerald-700">Thanks — we&apos;ve got your request and will follow up.</p>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-zinc-700 underline transition-colors duration-200 hover:text-zinc-900">
        Can&apos;t find what you&apos;re looking for? Request it.
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) {
      setError("Please describe the part in a bit more detail (at least 10 characters).");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await apiFetch("/product-requests", {
      method: "POST",
      body: JSON.stringify({ description: description.trim(), partNumber: partNumber.trim() || undefined, vehicleInfo: vehicleInfo.trim() || undefined }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Could not send your request");
      setSubmitting(false);
      return;
    }
    setDone(true);
  }

  return (
    <form onSubmit={handleSubmit} className="text-left max-w-md mx-auto space-y-3 mt-4 bg-zinc-50 border border-zinc-200 rounded-lg p-4">
      <p className="text-sm font-medium text-zinc-900">Request a part</p>
      <div>
        <textarea
          required
          minLength={10}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the part you need"
          className={inputClass}
        />
      </div>
      <input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="Part number (optional)" className={inputClass} />
      <input value={vehicleInfo} onChange={(e) => setVehicleInfo(e.target.value)} placeholder="Vehicle make/model/year (optional)" className={inputClass} />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 text-white px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800 hover:shadow-md disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send request"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500 underline">Cancel</button>
      </div>
    </form>
  );
}
