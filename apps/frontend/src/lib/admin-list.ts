"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

// One page of an admin list, as the backend returns it (common/utils/paginate.ts).
export type Page<T> = { items: T[]; total: number; page: number; limit: number; totalPages: number };

// Paginated, searchable admin list. The server does the filtering and
// paging — the browser never holds more than one page, whatever the size
// of the catalog or order history.
//
// `filters` are extra query params (status, stock...). Changing the search
// or a filter goes back to page 1. The search is debounced so typing
// doesn't send a request per keystroke, and a slow, older response can never
// overwrite a newer one.
export function useAdminList<T, Extra = object>(path: string, filters: Record<string, string | undefined> = {}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<(Page<T> & Extra) | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filterKey = JSON.stringify(filters);
  const [lastKey, setLastKey] = useState(filterKey + debounced);
  if (lastKey !== filterKey + debounced) {
    // Search or filters changed: back to page 1 (React's "reset state when
    // inputs change" pattern — adjusts state during render, no extra effect).
    setLastKey(filterKey + debounced);
    setPage(1);
  }

  const reload = useCallback(async () => {
    const request = ++latest.current;
    const params = new URLSearchParams({ page: String(page) });
    if (debounced) params.set("search", debounced);
    for (const [key, value] of Object.entries(JSON.parse(filterKey) as Record<string, string | undefined>)) {
      if (value) params.set(key, value);
    }
    const res = await apiFetch(`${path}?${params}`);
    if (request !== latest.current) return; // a newer request is on its way
    if (res.ok) {
      const body = (await res.json()) as Page<T> & Extra;
      // e.g. the last item of the last page was just deleted
      if (body.items.length === 0 && body.page > body.totalPages) setPage(body.totalPages);
      else setData(body);
    }
    setLoading(false);
  }, [path, page, debounced, filterKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, items: data?.items ?? [], loading, search, setSearch, searching: debounced !== "", page, setPage, reload };
}
