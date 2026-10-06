import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { ProductCard, ProductCardData } from "@/components/ProductCard";
import { HeroTruckFinder } from "@/components/HeroTruckFinder";
import { JsonLd } from "@/components/JsonLd";
import { serverFetch } from "@/lib/server-api";
import { getCategories, getTruckCatalog, productCount } from "@/lib/landing";
import { categoryName, type ProductList } from "@/lib/catalog";
import type { Metadata } from "next";
import { localeAlternates, storeJsonLd } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Rebuilt in the background at most once a minute (ISR).
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: localeAlternates("/", locale) };
}

const FAQ_KEYS = ["faq1", "faq2", "faq3", "faq4", "faq5"] as const;

function ProductSection({ title, viewAllHref, viewAllLabel, products }: { title: string; viewAllHref?: string; viewAllLabel: string; products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
        <h2 className="font-display font-bold text-2xl sm:text-[32px] text-ink">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-[15px] font-semibold text-ink transition-colors duration-200 hover:text-amber-dark">
            {viewAllLabel} →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-[18px]">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [latest, mostPurchased, mostSearched, trucks, categories, tHero, tValueProps, tHome] = await Promise.all([
    serverFetch<ProductList>("/products?limit=12&inStock=true"),
    serverFetch<ProductCardData[]>("/products/most-purchased?limit=6"),
    serverFetch<ProductCardData[]>("/products/most-searched?limit=6"),
    getTruckCatalog(),
    getCategories(),
    getTranslations("Hero"),
    getTranslations("ValueProps"),
    getTranslations("Home"),
  ]);
  const products = latest?.items ?? [];
  const faq = FAQ_KEYS.map((k) => ({ q: tHome(`${k}q`), a: tHome(`${k}a`) }));

  const valueProps = [
    { title: tValueProps("conditionTitle"), body: tValueProps("conditionBody") },
    { title: tValueProps("fitTitle"), body: tValueProps("fitBody") },
    { title: tValueProps("seeTitle"), body: tValueProps("seeBody") },
  ];

  return (
    <main className="flex-1">
      <JsonLd data={storeJsonLd()} />
      {/* WebSite + SearchAction: lets Google show a search box for the store in results. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          inLanguage: locale,
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/${locale}/products?search={search_term_string}` },
            "query-input": "required name=search_term_string",
          },
        }}
      />
      {/* Questions customers ask, as FAQPage: answer engines quote these. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
        }}
      />
      {/* Hero — redesign step 1: dark like the header, the pitch on the
          left, "What do you drive?" on the right (the fastest way in). */}
      <section className="bg-ink text-paper border-t border-ink-soft">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 grid gap-8 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-4">
            <h1 className="font-display font-bold text-4xl sm:text-[52px] leading-[1.02]">{tHero("title")}</h1>
            <p className="text-paper-dim text-base sm:text-lg leading-relaxed max-w-xl">{tHero("subtitle")}</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
              {[tValueProps("conditionTitle"), tValueProps("fitTitle")].map((point) => (
                <li key={point} className="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-amber" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l4 4 10-10" />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
            <Link href="/products" className="text-amber font-semibold hover:underline w-fit">
              {tHero("browseAll")} →
            </Link>
          </div>
          <HeroTruckFinder makes={(trucks ?? []).filter((m) => m.products > 0)} />
        </div>
      </section>

      {/* Value props — left accent bar reads as a spec sheet, not a card kit */}
      <section className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {valueProps.map((f) => (
          <div key={f.title} className="border-l-4 border-steel pl-4 py-1">
            <h3 className="font-display font-bold text-lg text-ink">{f.title}</h3>
            <p className="text-sm text-ink/60 mt-1">{f.body}</p>
          </div>
        ))}
      </section>

      {products.length === 0 ? (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="border-2 border-dashed border-steel-light p-8 text-center text-steel">
            <p className="font-medium">{tHome("noProductsTitle")}</p>
            <p className="text-sm mt-1">{tHome("noProductsBody")}</p>
          </div>
        </section>
      ) : (
        <>
          <ProductSection title={tHome("latestParts")} viewAllHref="/products" viewAllLabel={tHome("viewAll")} products={products} />
          <ProductSection title={tHome("mostPurchased")} viewAllHref="/products" viewAllLabel={tHome("viewAll")} products={mostPurchased ?? []} />
          <ProductSection title={tHome("mostSearched")} viewAllHref="/products" viewAllLabel={tHome("viewAll")} products={mostSearched ?? []} />
        </>
      )}

      {/* Internal links into the landing pages: how both shoppers and
          crawlers get from the homepage to "parts for my truck". */}
      {trucks && trucks.some((m) => m.products > 0) && (
        <section className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-baseline justify-between mb-6 pb-3 border-b-2 border-ink">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">{tHome("byTruck")}</h2>
            <Link href="/trucks" className="text-sm font-medium text-steel hover:text-ink">{tHome("allTrucks")}</Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {trucks.filter((m) => m.products > 0).map((m) => (
              <li key={m.slug}>
                <Link href={`/trucks/${m.slug}`} className="block bg-white border border-steel-light px-4 py-3 font-display font-bold text-ink hover:border-ink">
                  {m.manufacturer}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {categories && categories.some((c) => productCount(c) > 0) && (
        <section className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-baseline justify-between mb-6 pb-3 border-b-2 border-ink">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">{tHome("byCategory")}</h2>
            <Link href="/categories" className="text-sm font-medium text-steel hover:text-ink">{tHome("allCategories")}</Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.filter((c) => productCount(c) > 0).map((c) => (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="block bg-white border border-steel-light px-4 py-3 text-ink hover:border-ink">
                  {categoryName(c, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight mb-6">{tHome("faqTitle")}</h2>
        <div className="divide-y divide-steel-light border-y border-steel-light">
          {faq.map(({ q, a }) => (
            <details key={q} className="group py-4">
              <summary className="cursor-pointer list-none font-semibold text-ink flex justify-between gap-4">
                {q}
                <span aria-hidden="true" className="text-steel group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-steel mt-2 text-sm leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
