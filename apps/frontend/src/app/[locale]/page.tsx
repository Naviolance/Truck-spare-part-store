import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { ProductCard, ProductCardData } from "@/components/ProductCard";
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
      <div className="flex items-baseline justify-between mb-6 pb-3 border-b-2 border-ink">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-sm font-medium text-steel transition-colors duration-200 hover:text-ink">
            {viewAllLabel}
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
      {/* Hero — full-bleed background photo, text overlaid on a dark scrim */}
      <section className="relative min-h-[480px] sm:min-h-[560px] flex items-center text-paper border-b-4 border-amber overflow-hidden">
        <Image
          src="/hero-bg.jpg"
          alt="Truck parts on the shop floor"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/80 to-ink/40" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-20 w-full">
          <div className="max-w-xl">
            <h1 className="font-display font-black text-4xl sm:text-6xl leading-[0.95] tracking-tight">
              {tHero("title")}
            </h1>
            <p className="text-paper/70 mt-6 max-w-md text-base sm:text-lg">
              {tHero("subtitle")}
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/find-my-part" className="btn-primary">
                {tHero("findMyPart")}
              </Link>
              <Link href="/products" className="btn-outline border-paper/40 text-paper hover:bg-paper hover:text-ink">
                {tHero("browseAll")}
              </Link>
            </div>
          </div>
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
