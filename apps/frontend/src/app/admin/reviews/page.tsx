"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string };
  user: { firstName: string; lastName: string; email: string };
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/reviews/admin/all");
    if (res.ok) setReviews(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this review?")) return;
    setDeletingId(id);
    await apiFetch(`/reviews/admin/${id}`, { method: "DELETE" });
    await load();
    setDeletingId(null);
  }

  if (loading) return <p className="text-steel">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-6">Reviews</h1>
      {reviews.length === 0 ? (
        <p className="text-steel">No reviews yet.</p>
      ) : (
        <>
        <div className="sm:hidden space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-steel-light rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-ink truncate">{r.product.name}</p>
                <span className="shrink-0 text-sm text-amber-dark">★ {r.rating}/5</span>
              </div>
              <p className="text-xs text-steel mt-1">{r.user.firstName} {r.user.lastName} · {r.user.email}</p>
              {r.comment && <p className="text-sm text-ink mt-2">{r.comment}</p>}
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-steel">{new Date(r.createdAt).toLocaleDateString()}</p>
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={deletingId === r.id}
                  className="border border-red-200 bg-red-50 text-red-600 rounded-lg px-3 py-1.5 text-xs transition-colors duration-200 hover:bg-red-100 disabled:opacity-50"
                >
                  {deletingId === r.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm bg-white border border-steel-light rounded-lg overflow-hidden">
          <thead className="bg-paper text-left">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Comment</th>
              <th className="p-3">Date</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="border-t border-steel-light">
                <td className="p-3">{r.product.name}</td>
                <td className="p-3">
                  {r.user.firstName} {r.user.lastName}
                  <div className="text-xs text-steel">{r.user.email}</div>
                </td>
                <td className="p-3">★ {r.rating}/5</td>
                <td className="p-3 max-w-xs truncate">{r.comment}</td>
                <td className="p-3 text-steel">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="border border-red-200 bg-red-50 text-red-600 rounded-lg px-3 py-1.5 text-xs transition-colors duration-200 hover:bg-red-100 disabled:opacity-50"
                  >
                    {deletingId === r.id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        </>
      )}
    </div>
  );
}
