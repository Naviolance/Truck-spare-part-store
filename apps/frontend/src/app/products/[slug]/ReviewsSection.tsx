"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { AuthModal } from "@/components/AuthModal";

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
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

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
      setAuthOpen(true);
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
      <h2 className="text-xl font-bold text-zinc-900 tracking-tight mb-4">Reviews</h2>

      {reviews.length > 0 && (
        <div className="space-y-4 mb-6">
          {reviews.map((r) => (
            <div key={r.id} className="border border-zinc-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-900">
                  ★ {r.rating}/5 {user?.id === r.userId && <span className="text-zinc-400 font-normal">(your review)</span>}
                </span>
                {user?.id === r.userId && canModify(r) && (
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => startEdit(r)} className="underline text-zinc-500 transition-colors duration-200 hover:text-zinc-800">Edit</button>
                    <button onClick={() => handleDelete(r.id)} className="underline text-red-600 transition-colors duration-200 hover:text-red-800">Delete</button>
                  </div>
                )}
              </div>
              {r.comment && <p className="text-sm text-zinc-700 mt-1">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {user && (!ownReview || isEditing) && (
        <form onSubmit={handleSubmit} className="border border-zinc-200 rounded-lg p-4 space-y-3 bg-white">
          <h3 className="text-sm font-semibold text-zinc-900">{isEditing ? "Edit your review" : "Write a review"}</h3>
          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-600">Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="border border-zinc-300 rounded-lg px-3 py-2 text-sm transition-colors duration-200 focus:outline-none focus:border-zinc-500"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} star{n !== 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-600">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm transition-colors duration-200 focus:outline-none focus:border-zinc-500"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-900 text-white px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:from-zinc-600 hover:to-zinc-800 hover:shadow-md disabled:opacity-50"
            >
              {submitting ? "Saving…" : isEditing ? "Save changes" : "Submit review"}
            </button>
            {isEditing && (
              <button type="button" onClick={cancelEdit} className="text-sm text-zinc-500 underline transition-colors duration-200 hover:text-zinc-700">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {!user && (
        <p className="text-sm text-zinc-500">
          <button onClick={() => setAuthOpen(true)} className="underline hover:text-zinc-700 transition-colors duration-200">Log in</button> to write a review.
        </p>
      )}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        message="Log in or create an account to write a review."
      />
    </div>
  );
}
