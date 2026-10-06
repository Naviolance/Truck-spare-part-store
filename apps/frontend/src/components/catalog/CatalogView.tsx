import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/ProductCard";
import { RequestProductForm } from "@/components/RequestProductForm";
import { JsonLd } from "@/components/JsonLd";
import { serverFetch } from "@/lib/server-api";
import { formatMoney } from "@/lib/money";
import { breadcrumbJsonLd } from "@/lib/seo";
import { apiProductsPath, catalogHref, categoryName, type CatalogOption, type CatalogQuery, type ProductList } from "@/lib/catalog";
import { CatalogFilters } from "./CatalogFilters";
import { SearchTracker } from "./SearchTracker";
import { SortSelect } from "./SortSelect";

type Crumb = { name: string; path: string }; // path without locale, "" for home

type Props = {
  basePath: string; // locale-less, e.g. "/products" or "/categories/brakes"
  query: CatalogQuery; // from the URL
  locked?: CatalogQuery; // fixed by the page (category/brand/truck landing pages)
  heading: string;
  intro?: ReactNode;
  hide?: ("categoryId" | "brandId")[];
  crumbs: Crumb[]; // Home → … → this page (visible trail + BreadcrumbList JSON-LD)
};

// Server-rendered catalog: the HTML arrives with the products and real
// pagination links already in it, so search engines can crawl every product
// and slow phones show results without waiting for JavaScript. Used by
// /products and every landing page. Layout = redesign step 2, option A:
// filter sidebar, removable "active filter" pills, numbered pages.
export async function CatalogView({ basePath, query, locked = {}, heading, intro, hide, crumbs }: Props) {
  const t = await getTranslations("Catalog");
  const tc = await getTranslations("Condition");
  const locale = await getLocale();
  const effective = { ...query, ...locked };

  const [list, categories, brands] = await Promise.all([
    serverFetch<ProductList>(apiProductsPath(effective), { revalidate: 60 }),
    serverFetch<CatalogOption[]>("/categories", { revalidate: 300 }),
    serverFetch<CatalogOption[]>("/brands", { revalidate: 300 }),
  ]);

  const page = list?.page ?? 1;
  // ?page=99 past the end is a real 404, not an indexable empty page.
  if (list && page > 1 && list.items.length === 0) notFound();
  const totalPages = list?.totalPages ?? 1;

  // One removable pill per filter the visitor chose (not the ones the page
  // itself fixes). Each is a plain link to the same URL without that filter.
  const without = (...keys: (keyof CatalogQuery)[]) =>
    catalogHref(basePath, { ...query, ...Object.fromEntries(keys.map((k) => [k, undefined])), page: undefined });
  const pills: { label: string; href: string }[] = [];
  if (query.search) pills.push({ label: `« ${query.search} »`, href: without("search") });
  const category = categories?.find((c) => c.id === query.categoryId);
  if (category && !hide?.includes("categoryId")) pills.push({ label: categoryName(category, locale), href: without("categoryId") });
  const brand = brands?.find((b) => b.id === query.brandId);
  if (brand && !hide?.includes("brandId")) pills.push({ label: brand.name, href: without("brandId") });
  if (query.condition) pills.push({ label: tc(query.condition), href: without("condition") });
  if (query.minPrice || query.maxPrice) {
    const label =
      query.minPrice && query.maxPrice
        ? `${formatMoney(query.minPrice)} – ${formatMoney(query.maxPrice)}`
        : query.minPrice
          ? t("priceFrom", { price: formatMoney(query.minPrice) })
          : t("priceUpTo", { price: formatMoney(query.maxPrice!) });
    pills.push({ label, href: without("minPrice", "maxPrice") });
  }
  if (query.inStock) pills.push({ label: t("inStock"), href: without("inStock") });
  // "Clear all" keeps the truck (Find My Part) — that's the page, not a filter.
  const clearAll = catalogHref(basePath, { manufacturer: query.manufacturer, model: query.model, vehicleId: query.vehicleId });

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 sm:py-10 flex flex-col gap-5">
      <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, path: `/${locale}${c.path}` })))} />
      <nav aria-label={t("breadcrumb")} className="text-sm text-steel">
        <ol className="flex flex-wrap items-center gap-1.5">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i < crumbs.length - 1 ? (
                <Link href={c.path || "/"} className="hover:text-ink underline-offset-2 hover:underline">
                  {c.name}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink">{c.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink tracking-tight">{heading}</h1>
          {list && list.total > 0 && (
            <p className="text-steel mt-1">
              {t("results", { count: list.total })}
              {!effective.inStock && <> · {t("inStockFirst")}</>}
            </p>
          )}
          {intro && <div className="text-steel max-w-3xl mt-3">{intro}</div>}
        </div>
        {list && list.total > 1 && <SortSelect key={JSON.stringify(query)} basePath={basePath} query={query} />}
      </div>

      {pills.length > 0 && (
        <ul aria-label={t("activeFilters")} className="flex flex-wrap items-center gap-2">
          {pills.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                scroll={false}
                aria-label={t("removeFilter", { name: p.label })}
                className="inline-flex items-center gap-2 rounded-full bg-ink py-1.5 pl-3.5 pr-1.5 text-sm font-semibold text-paper hover:bg-ink-soft"
              >
                {p.label}
                <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-soft">×</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={clearAll} scroll={false} className="px-1.5 py-2 text-sm font-semibold text-ink underline-offset-2 hover:underline">
              {t("clearAll")}
            </Link>
          </li>
        </ul>
      )}

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-7 items-start">
        <CatalogFilters
          key={JSON.stringify(query)}
          basePath={basePath}
          query={query}
          categories={categories ?? []}
          brands={brands ?? []}
          hide={hide}
          showSearch={basePath !== "/products"}
        />

        <section className="flex-1 min-w-0 w-full" aria-live="polite">
          {!list ? (
            <p className="text-steel" role="alert">{t("unavailable")}</p>
          ) : list.items.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-line bg-card p-6 sm:p-8 text-center">
              <p className="font-display font-bold text-xl text-ink">{t("noResultsTitle")}</p>
              <p className="text-steel text-sm mt-1 mb-4">{t("noResultsBody")}</p>
              <RequestProductForm startOpen prefillDescription={effective.search ?? ""} />
            </div>
          ) : (
            <>
              {list.fuzzy && effective.search && (
                <p className="mb-4 rounded-[10px] bg-sand px-4 py-2.5 text-sm text-ink">{t("fuzzy", { search: effective.search })}</p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {list.items.map((product, i) => (
                  <ProductCard key={product.id} product={product} eager={i < 4} />
                ))}
              </div>

              {totalPages > 1 && <Pagination basePath={basePath} query={query} page={page} totalPages={totalPages} />}

              {/* A sold-out or missing part is still a sale if we hear about it. */}
              <div className="mt-10 border-t border-line pt-6">
                <RequestProductForm prefillDescription={effective.search ?? ""} />
              </div>
            </>
          )}
          <SearchTracker search={effective.search} total={list?.total ?? 0} />
        </section>
      </div>
    </main>
  );
}

// 1 … 4 [5] 6 … 12 — first, last and the current page's neighbours, as real
// links (crawlable; rel=prev/next on the arrows).
function pageNumbers(page: number, total: number): (number | "gap")[] {
  const wanted = new Set([1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(n - sorted[i - 1] === 2 ? n - 1 : "gap");
    out.push(n);
  });
  return out;
}

async function Pagination({ basePath, query, page, totalPages }: { basePath: string; query: CatalogQuery; page: number; totalPages: number }) {
  const t = await getTranslations("Catalog");
  const box = "inline-flex h-11 min-w-11 items-center justify-center rounded-[10px] px-3 text-base font-semibold";
  const idle = `${box} border border-line bg-card text-ink hover:border-ink`;
  return (
    <nav aria-label={t("pagination")} className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={catalogHref(basePath, { ...query, page: page - 1 })} rel="prev" className={idle}>
          ← <span className="sr-only sm:not-sr-only sm:ml-1">{t("previous")}</span>
        </Link>
      )}
      {pageNumbers(page, totalPages).map((n, i) =>
        n === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-steel" aria-hidden="true">…</span>
        ) : n === page ? (
          <span key={n} aria-current="page" className={`${box} bg-ink text-paper`}>{n}</span>
        ) : (
          <Link key={n} href={catalogHref(basePath, { ...query, page: n })} aria-label={t("pageN", { page: n })} className={idle}>
            {n}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={catalogHref(basePath, { ...query, page: page + 1 })} rel="next" className={idle}>
          <span className="sr-only sm:not-sr-only sm:mr-1">{t("next")}</span> →
        </Link>
      )}
    </nav>
  );
}
