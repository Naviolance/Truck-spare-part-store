import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { localeAlternates } from "@/lib/seo";
import { SOCIAL } from "@/lib/site";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: localeAlternates("/about", locale) };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");

  const sections = [
    { title: t("howTitle"), body: t("howBody") },
    { title: t("pickupTitle"), body: t("pickupBody") },
    { title: t("gradingTitle"), body: t("gradingBody") },
  ];

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20">
          <p className="text-steel-light text-sm font-medium uppercase tracking-wide mb-3">{t("eyebrow")}</p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">{t("title")}</h1>
          <p className="text-steel-light mt-4 text-base sm:text-lg">{t("subtitle")}</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="text-xl font-display font-bold text-ink tracking-tight mb-2">{s.title}</h2>
            <p className="text-steel">{s.body}</p>
          </div>
        ))}

        <div className="rounded-lg border border-steel-light bg-white p-6 text-center">
          <h2 className="text-lg font-display font-bold text-ink tracking-tight mb-2">{t("ctaTitle")}</h2>
          <p className="text-steel text-sm mb-4">{t("ctaBody")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/find-my-part" className="inline-block bg-amber text-ink px-5 py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-amber-dark">
              {t("ctaButton")}
            </Link>
            <WhatsAppButton href={SOCIAL.whatsapp} label={t("ctaWhatsapp")} source="about" variant="outline" />
          </div>
        </div>
      </section>
    </main>
  );
}
