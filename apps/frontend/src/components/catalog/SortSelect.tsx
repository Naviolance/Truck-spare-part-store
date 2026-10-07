"use client";
import { useLocale, useTranslations } from "next-intl";
import { useCatalogNav } from "./CatalogNav";
import { catalogHref, type CatalogQuery } from "@/lib/catalog";

// "Sort by", next to the results heading. Changes apply at once; without
// JavaScript it's a small GET form (hidden fields keep the other filters).
export function SortSelect({ basePath, query }: { basePath: string; query: CatalogQuery }) {
  const t = useTranslations("Catalog");
  const locale = useLocale();
  const { go } = useCatalogNav();
  const kept = Object.entries({ ...query, sort: undefined, page: undefined }).filter(([, v]) => v !== undefined && v !== "");

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const href = catalogHref(basePath, { ...query, sort: (e.target.value || undefined) as CatalogQuery["sort"], page: undefined });
    go(href);
  }

  return (
    <form method="get" action={`/${locale}${basePath}`} className="flex items-center gap-2">
      {kept.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={String(v)} />
      ))}
      <label htmlFor="catalog-sort" className="text-sm text-steel whitespace-nowrap">
        {t("sort")}
      </label>
      <select
        id="catalog-sort"
        name="sort"
        defaultValue={query.sort ?? ""}
        onChange={onChange}
        className="h-11 rounded-[10px] border border-[#BDB5A6] bg-card px-3 text-base text-ink focus:border-ink focus:outline-none"
      >
        {/* The default order: relevance when searching, newest otherwise. */}
        <option value="">{query.search ? t("sortRelevance") : t("sortNewest")}</option>
        <option value="price_asc">{t("sortPriceAsc")}</option>
        <option value="price_desc">{t("sortPriceDesc")}</option>
      </select>
      <noscript>
        <button type="submit" className="btn-outline h-11">{t("apply")}</button>
      </noscript>
    </form>
  );
}
