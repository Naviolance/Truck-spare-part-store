import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AppShell } from "@/components/AppShell";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Meta" });

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
    // No canonical here: it would be inherited by every page that doesn't
    // set its own, making them all claim to be the homepage. Indexable
    // pages set alternates themselves; private ones are noindex.
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: locale === "fr" ? "fr_CM" : "en_CM",
      title: t("title"),
      description: t("description"),
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    // Paste the token from Google Search Console here (env) to verify ownership.
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && {
      verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
    }),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // Lets pages under this layout render statically/ISR with the right language.
  setRequestLocale(locale);

  return <AppShell locale={locale}>{children}</AppShell>;
}
