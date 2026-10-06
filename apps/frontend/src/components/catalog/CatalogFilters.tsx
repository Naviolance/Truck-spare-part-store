"use client";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { announceNavigation } from "@/lib/navigation-events";
import { catalogHref, categoryName, type CatalogOption, type CatalogQuery } from "@/lib/catalog";

const fieldClass =
  "h-10 w-full rounded-[10px] border border-[#BDB5A6] bg-white px-3 text-base text-ink focus:border-ink focus:outline-none";
const legendClass = "font-display font-bold text-lg text-ink mb-2";

// Options shown before "Show all (n)" — keeps the sidebar short when the
// catalog has dozens of brands.
const VISIBLE_OPTIONS = 6;

type Props = {
  basePath: string;
  query: CatalogQuery;
  categories: CatalogOption[];
  brands: CatalogOption[];
  // Filters fixed by the page (e.g. the category on a category page) aren't shown.
  hide?: ("categoryId" | "brandId")[];
  // /products is searched from the header; landing pages keep their own
  // "search within" field.
  showSearch: boolean;
};

// The filter sidebar (redesign step 2, option A). A plain GET form, so
// filtering works before JavaScript loads (slow mobile connections); once
// it has, choices navigate at once without a full reload. The URL is the
// single source of truth — the server renders results and the active
// filter pills from it.
export function CatalogFilters({ basePath, query, categories, brands, hide = [], showSearch }: Props) {
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
    const href = catalogHref(basePath, { ...next, manufacturer: query.manufacturer, model: query.model, vehicleId: query.vehicleId });
    announceNavigation(`/${locale}${href}`);
    router.push(href, { scroll: false });
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate();
  };
  const activeCount = [query.categoryId, query.brandId, query.condition, query.minPrice || query.maxPrice, query.inStock].filter(Boolean).length;

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="catalog-filters"
        className="lg:hidden flex h-11 w-full items-center justify-between rounded-xl border border-line bg-card px-4 text-base font-semibold text-ink"
      >
        <span className="flex items-center gap-2">
          <FilterIcon />
          {t("filters")}
          {activeCount > 0 && (
            <span className="rounded-full bg-ink px-2 text-xs leading-5 text-paper">{activeCount}</span>
          )}
        </span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      <form
        id="catalog-filters"
        ref={formRef}
        method="get"
        action={`/${locale}${basePath}`}
        onSubmit={onSubmit}
        className={`${open ? "flex" : "hidden"} lg:flex mt-3 lg:mt-0 flex-col gap-5 rounded-[14px] border border-line bg-card p-[18px]`}
        aria-label={t("filters")}
      >
        {/* Carried through every filter change; edited elsewhere on the page. */}
        {query.sort && <input type="hidden" name="sort" value={query.sort} />}
        {showSearch ? (
          <div>
            <label htmlFor="f-search" className={`block ${legendClass}`}>{t("searchWithin")}</label>
            <input id="f-search" name="search" type="search" defaultValue={query.search} placeholder={t("searchPlaceholder")} className={fieldClass} />
          </div>
        ) : (
          query.search && <input type="hidden" name="search" value={query.search} />
        )}

        {!hide.includes("categoryId") && (
          <OptionList
            legend={t("category")}
            name="categoryId"
            allLabel={t("allCategories")}
            selected={query.categoryId}
            options={categories.map((c) => ({ id: c.id, label: categoryName(c, locale) }))}
            showAllLabel={(count) => t("showAll", { count })}
            onChange={navigate}
          />
        )}

        {!hide.includes("brandId") && (
          <OptionList
            legend={t("brand")}
            name="brandId"
            allLabel={t("allBrands")}
            selected={query.brandId}
            options={brands.map((b) => ({ id: b.id, label: b.name }))}
            showAllLabel={(count) => t("showAll", { count })}
            onChange={navigate}
          />
        )}

        <fieldset>
          <legend className={legendClass}>{t("condition")}</legend>
          <div className="flex flex-wrap gap-1.5">
            {(["", "NEW", "USED", "RECONDITIONED"] as const).map((c) => (
              <label key={c || "any"} className="cursor-pointer">
                <input
                  type="radio"
                  name="condition"
                  value={c}
                  defaultChecked={(query.condition ?? "") === c}
                  onChange={navigate}
                  className="peer sr-only"
                />
                <span className="inline-block rounded-full border border-[#BDB5A6] bg-white px-3 py-1.5 text-sm text-ink transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-amber">
                  {c ? tc(c) : t("anyConditionShort")}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legendClass}>{t("price")}</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm text-steel">
              {t("min")}
              <input name="minPrice" type="number" inputMode="numeric" min="0" placeholder="0" defaultValue={query.minPrice} className={`${fieldClass} mt-1`} />
            </label>
            <label className="text-sm text-steel">
              {t("max")}
              <input name="maxPrice" type="number" inputMode="numeric" min="0" placeholder="500 000" defaultValue={query.maxPrice} className={`${fieldClass} mt-1`} />
            </label>
          </div>
        </fieldset>

        <label className="flex items-center gap-2.5 text-base font-semibold text-ink">
          <input type="checkbox" name="inStock" value="true" defaultChecked={query.inStock === "true"} onChange={navigate} className="h-5 w-5 accent-ink" />
          {t("inStockOnly")}
        </label>

        {/* Prices are typed, so they need an explicit apply; everything
            else applies on change (and this button is the no-JS path). */}
        <button type="submit" className="btn-secondary h-11 text-base">
          {t("apply")}
        </button>
      </form>
    </aside>
  );
}

type Option = { id: string; label: string };

// Single-choice list (the API filters one category / one brand at a time).
// Past VISIBLE_OPTIONS the rest sit in a <details> — no JS needed — which
// starts open when the selected option is among them.
function OptionList({
  legend,
  name,
  allLabel,
  selected,
  options,
  showAllLabel,
  onChange,
}: {
  legend: string;
  name: string;
  allLabel: string;
  selected?: string;
  options: Option[];
  showAllLabel: (count: number) => string;
  onChange: () => void;
}) {
  const first = options.slice(0, VISIBLE_OPTIONS);
  const rest = options.slice(VISIBLE_OPTIONS);
  const radio = (o: Option) => (
    <label key={o.id || "all"} className="flex min-h-8 cursor-pointer items-center gap-2.5 text-base text-ink">
      <input type="radio" name={name} value={o.id} defaultChecked={(selected ?? "") === o.id} onChange={onChange} className="h-4 w-4 shrink-0 accent-ink" />
      <span className="min-w-0 truncate">{o.label}</span>
    </label>
  );
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className={legendClass}>{legend}</legend>
      {radio({ id: "", label: allLabel })}
      {first.map(radio)}
      {rest.length > 0 && (
        <details open={rest.some((o) => o.id === selected)} className="group">
          <summary className="cursor-pointer py-1 text-sm font-semibold text-ink underline underline-offset-2 group-open:hidden">
            {showAllLabel(options.length)}
          </summary>
          <div className="flex flex-col gap-1">{rest.map(radio)}</div>
        </details>
      )}
    </fieldset>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}
