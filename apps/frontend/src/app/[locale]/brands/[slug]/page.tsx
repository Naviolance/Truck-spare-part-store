import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { CatalogView } from "@/components/catalog/CatalogView";
import { catalogHref, parseCatalogParams } from "@/lib/catalog";
import { getBrands, productCount } from "@/lib/landing";
import { landingMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function findBrand(slug: string) {
  return (await getBrands())?.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const brand = await findBrand(slug);
  if (!brand) return {};
  const t = await getTranslations({ locale, namespace: "Landing" });
  const query = parseCatalogParams(await searchParams);
  return landingMetadata({
    locale,
    path: catalogHref(`/brands/${slug}`, { page: query.page }),
    title: t("brandHeading", { name: brand.name }),
    description: t("brandIntro", { name: brand.name }),
    productCount: productCount(brand),
  });
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const brand = await findBrand(slug);
  if (!brand) notFound();
  const t = await getTranslations("Landing");
  const heading = t("brandHeading", { name: brand.name });

  return (
    <>
      <CatalogView
        crumbs={[{ name: t("home"), path: "" }, { name: t("brands"), path: "/brands" }, { name: brand.name, path: `/brands/${slug}` }]}
        basePath={`/brands/${slug}`}
        query={parseCatalogParams(await searchParams)}
        locked={{ brandId: brand.id }}
        hide={["brandId"]}
        heading={heading}
        intro={t("brandIntro", { name: brand.name })}
      />
    </>
  );
}
