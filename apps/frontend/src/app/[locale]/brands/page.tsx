import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { LandingIndex } from "@/components/landing/LandingIndex";
import { getBrands, productCount } from "@/lib/landing";
import { localeAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });
  return { title: t("brandsTitle"), description: t("brandsIntro"), alternates: localeAlternates("/brands", locale) };
}

export default async function BrandsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const categories = (await getBrands()) ?? [];
  return (
    <LandingIndex
      locale={locale}
      path="/brands"
      heading={t("brandsTitle")}
      intro={t("brandsIntro")}
      items={categories.map((c) => ({ href: `/brands/${c.slug}`, name: c.name, count: productCount(c) }))}
    />
  );
}
