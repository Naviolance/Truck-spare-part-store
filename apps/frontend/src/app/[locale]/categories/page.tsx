import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { LandingIndex } from "@/components/landing/LandingIndex";
import { getCategories, productCount } from "@/lib/landing";
import { categoryName } from "@/lib/catalog";
import { localeAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });
  return { title: t("categoriesTitle"), description: t("categoriesIntro"), alternates: localeAlternates("/categories", locale) };
}

export default async function CategoriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const categories = (await getCategories()) ?? [];
  return (
    <LandingIndex
      locale={locale}
      path="/categories"
      heading={t("categoriesTitle")}
      intro={t("categoriesIntro")}
      items={categories.map((c) => ({ href: `/categories/${c.slug}`, name: categoryName(c, locale), count: productCount(c) }))}
    />
  );
}
