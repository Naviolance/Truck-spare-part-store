import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { CatalogView } from "@/components/catalog/CatalogView";
import { JsonLd } from "@/components/JsonLd";
import { catalogHref, parseCatalogParams } from "@/lib/catalog";
import { getTruckCatalog } from "@/lib/landing";
import { breadcrumbJsonLd, landingMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: Locale; make: string; model: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function findModel(makeSlug: string, modelSlug: string) {
  const make = (await getTruckCatalog())?.find((m) => m.slug === makeSlug);
  const model = make?.models.find((m) => m.slug === modelSlug);
  return make && model ? { make, model } : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, make: makeSlug, model: modelSlug } = await params;
  const found = await findModel(makeSlug, modelSlug);
  if (!found) return {};
  const t = await getTranslations({ locale, namespace: "Landing" });
  const names = { make: found.make.manufacturer, model: found.model.model };
  const query = parseCatalogParams(await searchParams);
  return landingMetadata({
    locale,
    path: catalogHref(`/trucks/${makeSlug}/${modelSlug}`, { page: query.page }),
    title: t("modelHeading", names),
    description: t("modelIntro", names),
    productCount: found.model.products,
  });
}

export default async function TruckModelPage({ params, searchParams }: Props) {
  const { locale, make: makeSlug, model: modelSlug } = await params;
  setRequestLocale(locale);
  const found = await findModel(makeSlug, modelSlug);
  if (!found) notFound();
  const t = await getTranslations("Landing");
  const names = { make: found.make.manufacturer, model: found.model.model };

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("home"), path: `/${locale}` },
          { name: t("trucks"), path: `/${locale}/trucks` },
          { name: names.make, path: `/${locale}/trucks/${makeSlug}` },
          { name: names.model, path: `/${locale}/trucks/${makeSlug}/${modelSlug}` },
        ])}
      />
      <CatalogView
        basePath={`/trucks/${makeSlug}/${modelSlug}`}
        query={parseCatalogParams(await searchParams)}
        locked={{ manufacturer: names.make, model: names.model }}
        heading={t("modelHeading", names)}
        intro={
          <>
            <p>{t("modelIntro", names)}</p>
            <p className="mt-3">
              <Link
                href={`/find-my-part?manufacturer=${encodeURIComponent(names.make)}&model=${encodeURIComponent(names.model)}`}
                className="text-sm font-medium text-ink underline underline-offset-2"
              >
                {t("findMyPart")}
              </Link>
            </p>
          </>
        }
      />
    </>
  );
}
