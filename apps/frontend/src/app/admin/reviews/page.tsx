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

  async function load() {
    const res = await apiFetch("/reviews/admin/all");
    if (res.ok) setReviews(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this review?")) return;
    await apiFetch(`/reviews/admin/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-6">Reviews</h1>
      {reviews.length === 0 ? (
        <p className="text-zinc-500">No reviews yet.</p>
      ) : (
        <table className="w-full text-sm bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <thead className="bg-zinc-50 text-left">
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
              <tr key={r.id} className="border-t border-zinc-100">
                <td className="p-3">{r.product.name}</td>
                <td className="p-3">
                  {r.user.firstName} {r.user.lastName}
                  <div className="text-xs text-zinc-400">{r.user.email}</div>
                </td>
                <td className="p-3">★ {r.rating}/5</td>
                <td className="p-3 max-w-xs truncate">{r.comment}</td>
                <td className="p-3 text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(r.id)} className="text-red-600 underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
