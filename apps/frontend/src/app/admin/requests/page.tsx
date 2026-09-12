"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type ProductRequest = {
  id: string;
  description: string;
  partNumber: string | null;
  vehicleInfo: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
};

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "FULFILLED", "DECLINED"];

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-steel-light text-steel",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  FULFILLED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/product-requests/admin/all");
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id);
    await apiFetch(`/product-requests/admin/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await load();
    setUpdatingId(null);
  }

  async function handleNoteBlur(id: string, adminNote: string) {
    await apiFetch(`/product-requests/admin/${id}`, { method: "PATCH", body: JSON.stringify({ adminNote }) });
  }

  if (loading) return <p className="text-steel">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">Product requests</h1>

      {requests.length === 0 ? (
        <p className="text-steel">No requests yet.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="bg-white border border-steel-light rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-ink">{r.description}</p>
                  {r.partNumber && <p className="text-xs text-steel mt-1">Part number: {r.partNumber}</p>}
                  {r.vehicleInfo && <p className="text-xs text-steel">Vehicle: {r.vehicleInfo}</p>}
                  <p className="text-xs text-steel mt-1">
                    {r.user.firstName} {r.user.lastName} ({r.user.email}) · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[r.status] || "bg-steel-light"}`}>
                    {r.status.replace("_", " ")}
                  </span>
                  <select
                    value={r.status}
                    disabled={updatingId === r.id}
                    onChange={(e) => handleStatusChange(r.id, e.target.value)}
                    className="border border-steel-light rounded-lg px-2 py-1 text-xs"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                defaultValue={r.adminNote ?? ""}
                onBlur={(e) => handleNoteBlur(r.id, e.target.value)}
                placeholder="Internal note…"
                rows={2}
                className="w-full mt-3 border border-steel-light rounded-lg px-3 py-2 text-sm text-steel transition-colors duration-200 focus:outline-none focus:border-steel"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
