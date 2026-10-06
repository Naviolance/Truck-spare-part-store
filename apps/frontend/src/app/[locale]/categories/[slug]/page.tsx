import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { CatalogView } from "@/components/catalog/CatalogView";
import { catalogHref, categoryName, parseCatalogParams } from "@/lib/catalog";
import { getCategories, productCount } from "@/lib/landing";
import { landingMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function findCategory(slug: string) {
  return (await getCategories())?.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await findCategory(slug);
  if (!category) return {};
  const t = await getTranslations({ locale, namespace: "Landing" });
  const query = parseCatalogParams(await searchParams);
  const name = categoryName(category, locale);
  return landingMetadata({
    locale,
    path: catalogHref(`/categories/${slug}`, { page: query.page }),
    title: t("categoryHeading", { name }),
    description: t("categoryIntro", { name }),
    productCount: productCount(category),
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const category = await findCategory(slug);
  if (!category) notFound();
  const t = await getTranslations("Landing");
  const name = categoryName(category, locale);
  const heading = t("categoryHeading", { name });

  return (
    <>
      <CatalogView
        crumbs={[{ name: t("home"), path: "" }, { name: t("categories"), path: "/categories" }, { name, path: `/categories/${slug}` }]}
        basePath={`/categories/${slug}`}
        query={parseCatalogParams(await searchParams)}
        locked={{ categoryId: category.id }}
        hide={["categoryId"]}
        heading={heading}
        intro={t("categoryIntro", { name })}
      />
    </>
  );
}
