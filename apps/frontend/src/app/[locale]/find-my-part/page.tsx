import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { CatalogView } from "@/components/catalog/CatalogView";
import { JsonLd } from "@/components/JsonLd";
import { RequestProductForm } from "@/components/RequestProductForm";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { serverFetch } from "@/lib/server-api";
import { parseCatalogParams } from "@/lib/catalog";
import { breadcrumbJsonLd, localeAlternates } from "@/lib/seo";
import { getTruckCatalog } from "@/lib/landing";
import { TruckPicker, type MakeTile } from "./TruckPicker";
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
  const [catalog, configs] = await Promise.all([
    getTruckCatalog(),
    manufacturer && model
      ? serverFetch<Config[]>(`/vehicles/configs?manufacturer=${enc(manufacturer)}&model=${enc(model)}`, { revalidate: 300 })
      : null,
  ]);
  // Only trucks we actually have parts for get a tile.
  const makes: MakeTile[] = (catalog ?? [])
    .filter((m) => m.products > 0)
    .map((m) => ({
      manufacturer: m.manufacturer,
      products: m.products,
      models: m.models.filter((x) => x.products > 0).map((x) => ({ model: x.model, products: x.products })),
    }));

  const config = configs?.find((c) => c.id === vehicleId);
  const truck = [manufacturer, model, config && `${config.yearStart}${config.yearEnd ? `–${config.yearEnd}` : "+"}`]
    .filter(Boolean)
    .join(" ");
  const crumbs = [
    { name: tl("home"), path: `/${locale}` },
    { name: t("title"), path: `/${locale}/find-my-part` },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 sm:py-10 flex flex-col gap-8">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl sm:text-[44px] font-bold leading-tight text-ink">{t("whatDoYouDrive")}</h1>
        <p className="text-lg text-steel">{t("tilesIntro")}</p>
      </div>

      <TruckPicker makes={makes} configs={configs ?? []} current={{ manufacturer, model, vehicleId }}>
        {manufacturer && (
          <CatalogView
            embedded
            basePath="/find-my-part"
            query={query}
            locked={{ manufacturer, model, vehicleId }}
            heading={t("resultsFor", { truck })}
            crumbs={[]}
          />
        )}
      </TruckPicker>

      {/* "I don't know what it's called" is the most common dead end — give
          it a way forward on every state of this page. */}
      <section className="flex flex-col gap-3 rounded-[14px] bg-ink p-5 sm:p-6 text-paper">
        <h2 className="font-display text-2xl font-bold">{t("unsureTitle")}</h2>
        <p className="text-paper-dim">{t("unsureBody")}</p>
        <WhatsAppButton
          href={whatsappLink(t("photoMessage", { truck: truck || t("truckUnknown") }))}
          label={t("sendPhoto")}
          source="find_my_part_photo"
          className="self-start rounded-[10px] h-12 text-base"
        />
        <p className="text-sm text-paper-dim">{t("notListed")}</p>
        <div className="rounded-[10px] bg-card p-4 text-ink">
          <RequestProductForm prefillVehicle={truck} />
        </div>
      </section>
    </main>
  );
}
