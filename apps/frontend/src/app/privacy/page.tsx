import { getTranslations, getLocale } from "next-intl/server";

// Support/contact address — replace with a real, monitored inbox before
// this page is treated as final. Same goes for the "last updated" date:
// bump it whenever this page's content actually changes.
const CONTACT_EMAIL = "privacy@truckparts.example";
const LAST_UPDATED = "2026-09-15";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-display font-semibold text-ink mb-2">{title}</h2>
      <div className="text-sm text-steel space-y-2">{children}</div>
    </section>
  );
}

export default async function PrivacyPage() {
  const t = await getTranslations("PrivacyPage");
  const locale = await getLocale();
  const updated = new Date(LAST_UPDATED).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">{t("title")}</h1>
      <p className="text-xs text-steel mb-8">{t("updated", { date: updated })}</p>

      <p className="text-sm text-ink mb-8">{t("intro")}</p>

      <Section title={t("dataTitle")}>
        <p>{t("dataBody")}</p>
      </Section>

      <Section title={t("useTitle")}>
        <p>{t("useBody")}</p>
      </Section>

      <Section title={t("paymentsTitle")}>
        <p>{t("paymentsBody")}</p>
      </Section>

      <Section title={t("cookiesTitle")}>
        <p>{t("cookiesIntro")}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t("cookieSession")}</li>
          <li>{t("cookieCsrf")}</li>
          <li>{t("cookieLocale")}</li>
        </ul>
      </Section>

      <Section title={t("sharingTitle")}>
        <p>{t("sharingBody")}</p>
      </Section>

      <Section title={t("rightsTitle")}>
        <p>{t("rightsBody")}</p>
      </Section>

      <Section title={t("contactTitle")}>
        <p>{t("contactBody", { email: CONTACT_EMAIL })}</p>
      </Section>
    </main>
  );
}
