"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

const EDIT_WINDOW_MS = 10 * 60 * 1000;

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  userId: string;
  createdAt: string;
};

export function ReviewsSection({ productId, initialReviews }: { productId: string; initialReviews: Review[] }) {
  const { user } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownReview = user ? reviews.find((r) => r.userId === user.id) : undefined;
  const isEditing = editingId !== null;

  function canModify(review: Review) {
    return Date.now() - new Date(review.createdAt).getTime() < EDIT_WINDOW_MS;
  }

  function startEdit(review: Review) {
    setEditingId(review.id);
    setRating(review.rating);
    setComment(review.comment || "");
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setRating(5);
    setComment("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = isEditing
      ? await apiFetch(`/reviews/${editingId}`, { method: "PATCH", body: JSON.stringify({ rating, comment }) })
      : await apiFetch("/reviews", { method: "POST", body: JSON.stringify({ productId, rating, comment }) });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Something went wrong");
      setSubmitting(false);
      return;
    }

    const saved = await res.json();
    setReviews((rs) => (isEditing ? rs.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...rs]));
    setSubmitting(false);
    cancelEdit();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete your review?")) return;
    const res = await apiFetch(`/reviews/${id}`, { method: "DELETE" });
    if (res.ok) setReviews((rs) => rs.filter((r) => r.id !== id));
  }

  return (
    <div className="mt-16 max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Reviews</h2>

      {reviews.length > 0 && (
        <div className="space-y-4 mb-6">
          {reviews.map((r) => (
            <div key={r.id} className="border border-gray-200 rounded p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  ★ {r.rating}/5 {user?.id === r.userId && <span className="text-gray-400">(your review)</span>}
                </span>
                {user?.id === r.userId && canModify(r) && (
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => startEdit(r)} className="underline text-gray-600">Edit</button>
                    <button onClick={() => handleDelete(r.id)} className="underline text-red-600">Delete</button>
                  </div>
                )}
              </div>
              {r.comment && <p className="text-sm text-gray-700 mt-1">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {user && (!ownReview || isEditing) && (
        <form onSubmit={handleSubmit} className="border border-gray-200 rounded p-4 space-y-3">
          <h3 className="text-sm font-semibold">{isEditing ? "Edit your review" : "Write a review"}</h3>
          <div>
            <label className="block text-xs font-medium mb-1">Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} star{n !== 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-gray-900 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
            >
              {submitting ? "Saving…" : isEditing ? "Save changes" : "Submit review"}
            </button>
            {isEditing && (
              <button type="button" onClick={cancelEdit} className="text-sm text-gray-500 underline">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {!user && (
        <p className="text-sm text-gray-500">
          <button onClick={() => router.push("/login")} className="underline">Log in</button> to write a review.
        </p>
      )}
    </div>
  );
}
