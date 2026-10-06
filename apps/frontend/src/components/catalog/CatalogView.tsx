import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/ProductCard";
import { RequestProductForm } from "@/components/RequestProductForm";
import { serverFetch } from "@/lib/server-api";
import { apiProductsPath, catalogHref, type CatalogOption, type CatalogQuery, type ProductList } from "@/lib/catalog";
import { CatalogFilters } from "./CatalogFilters";
import { SearchTracker } from "./SearchTracker";

type Props = {
  basePath: string; // locale-less, e.g. "/products" or "/categories/brakes"
  query: CatalogQuery; // from the URL
  locked?: CatalogQuery; // fixed by the page (category/brand/truck landing pages)
  heading: string;
  intro?: ReactNode;
  hide?: ("categoryId" | "brandId")[];
};

// Server-rendered catalog: the HTML arrives with the products and real
// pagination links already in it, so search engines can crawl every product
// and slow phones show results without waiting for JavaScript. Used by
// /products and every landing page.
export async function CatalogView({ basePath, query, locked = {}, heading, intro, hide }: Props) {
  const t = await getTranslations("Catalog");
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

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6 pb-3 border-b-2 border-ink">
        <h1 className="font-display font-bold text-3xl text-ink tracking-tight">{heading}</h1>
        {intro && <div className="text-steel mt-2 max-w-3xl">{intro}</div>}
      </div>

      <div className="flex flex-col sm:flex-row gap-8">
        <CatalogFilters
          key={JSON.stringify(query)}
          basePath={basePath}
          query={query}
          categories={categories ?? []}
          brands={brands ?? []}
          hide={hide}
        />

        <section className="flex-1" aria-live="polite">
          {!list ? (
            <p className="text-steel" role="alert">{t("unavailable")}</p>
          ) : list.items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-steel-light p-6 sm:p-8 text-center">
              <p className="font-display font-bold text-xl text-ink">{t("noResultsTitle")}</p>
              <p className="text-steel text-sm mt-1 mb-4">{t("noResultsBody")}</p>
              <RequestProductForm startOpen prefillDescription={effective.search ?? ""} />
            </div>
          ) : (
            <>
              <p className="text-sm text-steel mb-4">
                {t("results", { count: list.total })}
                {list.fuzzy && effective.search && <> — {t("fuzzy", { search: effective.search })}</>}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {list.items.map((product, i) => (
                  <ProductCard key={product.id} product={product} eager={i < 4} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav aria-label="Pagination" className="flex items-center justify-center gap-4 mt-8">
                  {page > 1 ? (
                    <Link href={catalogHref(basePath, { ...query, page: page - 1 })} rel="prev" className="text-sm px-3 py-1.5 border border-steel-light hover:border-ink">
                      {t("previous")}
                    </Link>
                  ) : (
                    <span className="text-sm px-3 py-1.5 border border-steel-light opacity-40">{t("previous")}</span>
                  )}
                  <span className="text-sm text-steel">{t("pageOf", { page, total: totalPages })}</span>
                  {page < totalPages ? (
                    <Link href={catalogHref(basePath, { ...query, page: page + 1 })} rel="next" className="text-sm px-3 py-1.5 border border-steel-light hover:border-ink">
                      {t("next")}
                    </Link>
                  ) : (
                    <span className="text-sm px-3 py-1.5 border border-steel-light opacity-40">{t("next")}</span>
                  )}
                </nav>
              )}

              {/* A sold-out or missing part is still a sale if we hear about it. */}
              <div className="mt-10 border-t border-steel-light pt-6">
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
