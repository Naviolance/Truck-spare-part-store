"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { useAdminList } from "@/lib/admin-list";
import { Pager, SearchBox } from "@/components/admin/ListControls";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string };
  user: { firstName: string; lastName: string; email: string };
};

// One card per review (same markup on phone and desktop): the stars and the
// comment are what the admin reads, so they lead; delete is a quiet link.
export default function AdminReviewsPage() {
  const t = useTranslations("AdminReviews");
  const tc = useTranslations("AdminCommon");
  const locale = useLocale();
  const list = useAdminList<Review>("/reviews/admin/all");
  const { items: reviews, data, reload: load } = list;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    setDeletingId(id);
    await apiFetch(`/reviews/admin/${id}`, { method: "DELETE" });
    await load();
    setDeletingId(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="admin-title">{t("title")}</h1>
        <div className="w-full sm:w-80">
          <SearchBox value={list.search} onChange={list.setSearch} placeholder={t("searchPlaceholder")} />
        </div>
      </div>
      {list.loading ? (
        <p className="text-steel">{tc("loading")}</p>
      ) : reviews.length === 0 ? (
        <p className="admin-empty">{list.searching ? t("noMatch") : t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="admin-card flex flex-col gap-2 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <span className="min-w-0 text-lg font-bold text-ink">{r.product.name}</span>
                <span className="shrink-0 text-lg tracking-wider text-amber" aria-label={`${t("colRating")} ${r.rating}/5`}>
                  {"★".repeat(r.rating)}
                  <span className="text-line">{"★".repeat(Math.max(0, 5 - r.rating))}</span>
                </span>
              </div>
              {r.comment && <p className="text-ink">{r.comment}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-3 text-sm text-steel">
                <span>
                  <span className="font-semibold text-ink">{r.user.firstName} {r.user.lastName}</span> · {r.user.email} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString(locale)}
                </span>
                <button type="button" onClick={() => handleDelete(r.id)} disabled={deletingId === r.id} className="link-danger">
                  {deletingId === r.id ? tc("deleting") : tc("delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={list.setPage} />}
    </div>
  );
}
