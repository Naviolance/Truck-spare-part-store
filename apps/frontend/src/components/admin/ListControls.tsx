"use client";
import { useLocale, useTranslations } from "next-intl";

// Search box + pager shared by the paginated admin lists (lib/admin-list.ts).

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="admin-input sm:max-w-sm"
    />
  );
}

export function Pager({ page, totalPages, total, limit, onPage }: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPage: (page: number) => void;
}) {
  const t = useTranslations("AdminList");
  const locale = useLocale();
  if (total === 0) return null;
  const n = (value: number) => value.toLocaleString(locale);
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm text-steel">
      <span>
        {t("range", { from: n(from), to: n(to), total: n(total) })}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            className="admin-action disabled:opacity-40"
          >
            {t("previous")}
          </button>
          <span>{t("page", { page: n(page), pages: n(totalPages) })}</span>
          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages}
            className="admin-action disabled:opacity-40"
          >
            {t("next")}
          </button>
        </div>
      )}
    </div>
  );
}

export function FilterSelect({ value, onChange, options, label }: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="admin-input w-auto"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
