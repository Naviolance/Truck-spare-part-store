"use client";

// Search box + pager shared by the paginated admin lists (lib/admin-list.ts).

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full sm:w-72 border border-steel-light rounded-lg px-3 py-2 text-sm bg-white"
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
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="flex items-center justify-between gap-3 mt-4 text-sm text-steel">
      <span>
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            className="border border-steel-light rounded-lg px-3 py-1.5 disabled:opacity-40 hover:border-ink"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages}
            className="border border-steel-light rounded-lg px-3 py-1.5 disabled:opacity-40 hover:border-ink"
          >
            Next
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
      className="border border-steel-light rounded-lg px-3 py-2 text-sm bg-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
