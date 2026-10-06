import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { LandingIndex } from "@/components/landing/LandingIndex";
import { getTruckCatalog } from "@/lib/landing";
import { localeAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });
  return { title: t("trucksTitle"), description: t("trucksIntro"), alternates: localeAlternates("/trucks", locale) };
}

export default async function TrucksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const makes = (await getTruckCatalog()) ?? [];
  return (
    <LandingIndex
      locale={locale}
      path="/trucks"
      heading={t("trucksTitle")}
      intro={t("trucksIntro")}
      items={makes.map((m) => ({
        href: `/trucks/${m.slug}`,
        name: m.manufacturer,
        count: m.products,
        children: m.models.map((model) => ({ href: `/trucks/${m.slug}/${model.slug}`, name: model.model, count: model.products })),
      }))}
    />
  );
}
