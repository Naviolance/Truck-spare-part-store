import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { CatalogView } from "@/components/catalog/CatalogView";
import { TruckSelector } from "@/components/TruckSelector";
import { RequestProductForm } from "@/components/RequestProductForm";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { serverFetch } from "@/lib/server-api";
import { parseCatalogParams } from "@/lib/catalog";
import { localeAlternates } from "@/lib/seo";
import { whatsappLink } from "@/lib/site";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
type Config = { id: string; yearStart: number; yearEnd: number | null; engine: string | null };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const query = parseCatalogParams(await searchParams);
  const t = await getTranslations({ locale, namespace: "FindMyPart" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: localeAlternates("/find-my-part", locale),
    // A chosen truck is a filter view; the /trucks pages are its indexable version.
    ...(query.manufacturer && { robots: { index: false, follow: true } }),
  };
}

export default async function FindMyPartPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("FindMyPart");
  const tl = await getTranslations("Landing");
  const query = parseCatalogParams(await searchParams);
  const { manufacturer, model, vehicleId } = query;

  const enc = encodeURIComponent;
  const [manufacturers, models, configs] = await Promise.all([
    serverFetch<string[]>("/vehicles/manufacturers", { revalidate: 300 }),
    manufacturer ? serverFetch<string[]>(`/vehicles/models?manufacturer=${enc(manufacturer)}`, { revalidate: 300 }) : null,
    manufacturer && model
      ? serverFetch<Config[]>(`/vehicles/configs?manufacturer=${enc(manufacturer)}&model=${enc(model)}`, { revalidate: 300 })
      : null,
  ]);

  const config = configs?.find((c) => c.id === vehicleId);
  const truck = [manufacturer, model, config && `${config.yearStart}${config.yearEnd ? `–${config.yearEnd}` : "+"}`]
    .filter(Boolean)
    .join(" ");

  const selector = (
    <TruckSelector
      manufacturers={manufacturers ?? []}
      models={models ?? []}
      configs={configs ?? []}
      current={{ manufacturer, model, vehicleId }}
    />
  );

  // "I don't know what it's called" is the most common dead end — give it a
  // way forward on every state of this page.
  const unsure = (
    <section className="mt-10 border border-steel-light bg-white p-5 sm:p-6">
      <h2 className="font-display font-bold text-xl text-ink">{t("unsureTitle")}</h2>
      <p className="text-sm text-steel mt-1 mb-4">{t("unsureBody")}</p>
      <WhatsAppButton
        href={whatsappLink(t("photoMessage", { truck: truck || t("truckUnknown") }))}
        label={t("sendPhoto")}
        source="find_my_part_photo"
        className="mb-5"
      />
      <p className="text-xs text-steel mb-3">{t("notListed")}</p>
      <RequestProductForm prefillVehicle={truck} />
    </section>
  );

  if (!manufacturer) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-display font-bold text-ink tracking-tight mb-1">{t("title")}</h1>
        <p className="text-steel mb-6">{t("intro")}</p>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-sm">
          {[t("step1"), t("step2"), t("step3")].map((step, i) => (
            <li key={step} className="border-l-4 border-amber pl-3 py-1">
              <span className="font-mono text-steel mr-1">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
        {selector}
        {unsure}
      </main>
    );
  }

  return (
    <>
      <CatalogView
        basePath="/find-my-part"
        crumbs={[{ name: tl("home"), path: "" }, { name: t("title"), path: "/find-my-part" }]}
        query={query}
        locked={{ manufacturer, model, vehicleId }}
        heading={t("resultsFor", { truck })}
        intro={<div className="mt-4">{selector}</div>}
      />
      <div className="max-w-6xl mx-auto px-4 pb-10">{unsure}</div>
    </>
  );
}
