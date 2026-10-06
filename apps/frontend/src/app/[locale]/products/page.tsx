import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { CatalogView } from "@/components/catalog/CatalogView";
import { catalogHref, isFilteredView, parseCatalogParams } from "@/lib/catalog";
import { localeAlternates } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const query = parseCatalogParams(await searchParams);
  const t = await getTranslations({ locale, namespace: "Catalog" });
  return {
    title: query.search ? t("searchResultsFor", { search: query.search }) : t("metaTitle"),
    description: t("metaDescription"),
    // Page 2+ is canonical to itself (pointing it at page 1 would hide deeper products).
    alternates: localeAlternates(catalogHref("/products", { page: query.page }), locale),
    // Searches and filter combinations: crawl the links, don't index the page.
    ...(isFilteredView(query) && { robots: { index: false, follow: true } }),
  };
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = parseCatalogParams(await searchParams);
  const t = await getTranslations("Catalog");
  const tl = await getTranslations("Landing");

  return (
    <CatalogView
      basePath="/products"
      crumbs={[{ name: tl("home"), path: "" }, { name: t("allParts"), path: "/products" }]}
      query={query}
      heading={query.search ? t("searchResultsFor", { search: query.search }) : t("allParts")}
      intro={query.search ? undefined : t("allPartsIntro")}
    />
  );
}
