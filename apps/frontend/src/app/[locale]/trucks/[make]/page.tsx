import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { CatalogView } from "@/components/catalog/CatalogView";
import { catalogHref, parseCatalogParams } from "@/lib/catalog";
import { getTruckCatalog } from "@/lib/landing";
import { landingMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: Locale; make: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function findMake(slug: string) {
  return (await getTruckCatalog())?.find((m) => m.slug === slug) ?? null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, make: slug } = await params;
  const make = await findMake(slug);
  if (!make) return {};
  const t = await getTranslations({ locale, namespace: "Landing" });
  const query = parseCatalogParams(await searchParams);
  return landingMetadata({
    locale,
    path: catalogHref(`/trucks/${slug}`, { page: query.page }),
    title: t("makeHeading", { make: make.manufacturer }),
    description: t("makeIntro", { make: make.manufacturer }),
    productCount: make.products,
  });
}

export default async function TruckMakePage({ params, searchParams }: Props) {
  const { locale, make: slug } = await params;
  setRequestLocale(locale);
  const make = await findMake(slug);
  if (!make) notFound();
  const t = await getTranslations("Landing");

  return (
    <>
      <CatalogView
        crumbs={[{ name: t("home"), path: "" }, { name: t("trucks"), path: "/trucks" }, { name: make.manufacturer, path: `/trucks/${slug}` }]}
        basePath={`/trucks/${slug}`}
        query={parseCatalogParams(await searchParams)}
        locked={{ manufacturer: make.manufacturer }}
        heading={t("makeHeading", { make: make.manufacturer })}
        intro={
          <>
            <p>{t("makeIntro", { make: make.manufacturer })}</p>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-ink">{t("models")}:</span>
              {make.models.map((m) => (
                <Link key={m.slug} href={`/trucks/${slug}/${m.slug}`} className="border border-steel-light px-2 py-1 hover:border-ink hover:text-ink">
                  {m.model} ({m.products})
                </Link>
              ))}
            </p>
          </>
        }
      />
    </>
  );
}
