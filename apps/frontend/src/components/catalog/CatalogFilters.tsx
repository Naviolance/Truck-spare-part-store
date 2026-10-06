"use client";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { catalogHref, type CatalogOption, type CatalogQuery } from "@/lib/catalog";

const fieldClass =
  "w-full border border-steel-light px-3 py-2 text-sm transition-colors duration-200 focus:outline-none focus:border-ink bg-white";
const labelClass = "block text-xs font-medium mb-1 text-steel";

type Props = {
  basePath: string;
  query: CatalogQuery;
  categories: CatalogOption[];
  brands: CatalogOption[];
  // Filters fixed by the page (e.g. the category on a category page) aren't shown.
  hide?: ("categoryId" | "brandId")[];
};

// A plain GET form, so filtering works even before JavaScript loads (slow
// mobile connections); once it has, changes navigate without a full reload.
// The URL is the single source of truth — the server renders the results.
export function CatalogFilters({ basePath, query, categories, brands, hide = [] }: Props) {
  const t = useTranslations("Catalog");
  const tc = useTranslations("Condition");
  const locale = useLocale();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);

  function navigate() {
    const data = new FormData(formRef.current!);
    const next: CatalogQuery = {};
    for (const [key, value] of data.entries()) {
      if (typeof value === "string" && value.trim()) (next as Record<string, string>)[key] = value.trim();
    }
    // Keep truck filters (Find My Part links) that have no visible field.
    router.push(catalogHref(basePath, { ...next, manufacturer: query.manufacturer, model: query.model, vehicleId: query.vehicleId }), {
      scroll: false,
    });
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate();
  };
  const autoSubmit = () => navigate();
  const active = Object.entries(query).some(([k, v]) => k !== "page" && v);

  return (
    <aside className="sm:w-56 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="sm:hidden w-full flex items-center justify-between text-sm text-ink border border-steel-light px-3 py-2 mb-3"
      >
        {t("filters")}
        {active ? " •" : ""}
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      <form
        ref={formRef}
        method="get"
        action={`/${locale}${basePath}`}
        onSubmit={onSubmit}
        className={`space-y-4 ${open ? "block" : "hidden"} sm:block`}
        role="search"
      >
        <div>
          <label htmlFor="f-search" className={labelClass}>{t("search")}</label>
          <div className="flex gap-1">
            <input id="f-search" name="search" type="search" defaultValue={query.search} placeholder={t("searchPlaceholder")} className={fieldClass} />
            <button type="submit" className="px-3 bg-ink text-paper text-sm" aria-label={t("searchButton")}>
              ⌕
            </button>
          </div>
        </div>

        {!hide.includes("categoryId") && (
          <div>
            <label htmlFor="f-category" className={labelClass}>{t("category")}</label>
            <select id="f-category" name="categoryId" defaultValue={query.categoryId ?? ""} onChange={autoSubmit} className={fieldClass}>
              <option value="">{t("allCategories")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {!hide.includes("brandId") && (
          <div>
            <label htmlFor="f-brand" className={labelClass}>{t("brand")}</label>
            <select id="f-brand" name="brandId" defaultValue={query.brandId ?? ""} onChange={autoSubmit} className={fieldClass}>
              <option value="">{t("allBrands")}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="f-condition" className={labelClass}>{t("condition")}</label>
          <select id="f-condition" name="condition" defaultValue={query.condition ?? ""} onChange={autoSubmit} className={fieldClass}>
            <option value="">{t("anyCondition")}</option>
            {(["NEW", "USED", "RECONDITIONED"] as const).map((c) => (
              <option key={c} value={c}>{tc(c)}</option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className={labelClass}>{t("price")}</legend>
          <div className="flex gap-2">
            <input name="minPrice" type="number" inputMode="numeric" min="0" placeholder={t("min")} aria-label={`${t("price")} ${t("min")}`} defaultValue={query.minPrice} className={fieldClass} />
            <input name="maxPrice" type="number" inputMode="numeric" min="0" placeholder={t("max")} aria-label={`${t("price")} ${t("max")}`} defaultValue={query.maxPrice} className={fieldClass} />
          </div>
        </fieldset>

        <div>
          <label htmlFor="f-sort" className={labelClass}>{t("sort")}</label>
          <select id="f-sort" name="sort" defaultValue={query.sort ?? ""} onChange={autoSubmit} className={fieldClass}>
            <option value="">{t("sortNewest")}</option>
            <option value="price_asc">{t("sortPriceAsc")}</option>
            <option value="price_desc">{t("sortPriceDesc")}</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="inStock" value="true" defaultChecked={query.inStock === "true"} onChange={autoSubmit} />
          {t("inStockOnly")}
        </label>

        <button type="submit" className="w-full border border-ink py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-ink hover:text-paper">
          {t("apply")}
        </button>

        {active && (
          <button
            type="button"
            onClick={() => router.push(basePath)}
            className="text-sm text-steel underline transition-colors duration-200 hover:text-ink"
          >
            {t("clear")}
          </button>
        )}
      </form>
    </aside>
  );
}
