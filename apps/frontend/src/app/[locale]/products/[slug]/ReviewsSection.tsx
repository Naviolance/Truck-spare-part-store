"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
import { apiFetch, readError } from "@/lib/api";
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
  const t = useTranslations("Product");
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
      setError(await readError(res, t("genericError")));
      setSubmitting(false);
      return;
    }

    const saved = await res.json();
    setReviews((rs) => (isEditing ? rs.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...rs]));
    setSubmitting(false);
    cancelEdit();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    const res = await apiFetch(`/reviews/${id}`, { method: "DELETE" });
    if (res.ok) setReviews((rs) => rs.filter((r) => r.id !== id));
  }

  return (
    <div className="mt-16 max-w-2xl">
      <h2 className="text-xl font-display font-bold text-ink tracking-tight mb-4">{t("reviews")}</h2>

      {reviews.length === 0 && <p className="text-sm text-steel mb-4">{t("noReviews")}</p>}
      {reviews.length > 0 && (
        <div className="space-y-4 mb-6">
          {reviews.map((r) => (
            <div key={r.id} className="border border-steel-light rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">
                  <span aria-label={t("stars", { count: r.rating })}>★ {r.rating}/5</span>
                </span>
                {user?.id === r.userId && canModify(r) && (
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => startEdit(r)} className="underline text-steel transition-colors duration-200 hover:text-ink">{t("edit")}</button>
                    <button onClick={() => handleDelete(r.id)} className="underline text-red-600 transition-colors duration-200 hover:text-red-800">{t("delete")}</button>
                  </div>
                )}
              </div>
              {r.comment && <p className="text-sm text-steel mt-1">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {user && (!ownReview || isEditing) && (
        <form onSubmit={handleSubmit} className="border border-steel-light rounded-lg p-4 space-y-3 bg-white">
          <h3 className="text-sm font-display font-semibold text-ink">{isEditing ? t("editReview") : t("writeReview")}</h3>
          <p className="text-xs text-steel">{t("verifiedOnly")}</p>
          <div>
            <label htmlFor="review-rating" className="block text-xs font-medium mb-1 text-steel">{t("rating")}</label>
            <select
              id="review-rating"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="border border-steel-light rounded-lg px-3 py-2 text-sm transition-colors duration-200 focus:outline-none focus:border-steel"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{t("stars", { count: n })}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="review-comment" className="block text-xs font-medium mb-1 text-steel">{t("comment")}</label>
            <textarea
              id="review-comment"
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full border border-steel-light rounded-lg px-3 py-2 text-sm transition-colors duration-200 focus:outline-none focus:border-steel"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-amber text-ink px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-amber-dark disabled:opacity-50"
            >
              {submitting ? t("saving") : isEditing ? t("saveChanges") : t("submitReview")}
            </button>
            {isEditing && (
              <button type="button" onClick={cancelEdit} className="text-sm text-steel underline transition-colors duration-200 hover:text-steel">
                {t("cancel")}
              </button>
            )}
          </div>
        </form>
      )}

      {!user && (
        <p className="text-sm text-steel">
          {t.rich("loginToReview", {
            link: (chunks) => (
              <button onClick={() => setAuthOpen(true)} className="underline hover:text-ink transition-colors duration-200">{chunks}</button>
            ),
          })}
        </p>
      )}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        message={t("loginToReviewModal")}
      />
    </div>
  );
}
