import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { AddToCartButton } from "./AddToCartButton";
import { FitChecker, type Fit, type MakeOption } from "./FitChecker";
import { ReviewsSection } from "./ReviewsSection";
import { ProductGallery } from "./ProductGallery";
import { productImageAlt } from "@/lib/image";
import { formatMoney } from "@/lib/money";
import { ConditionTag } from "@/components/ProductCard";
import { RequestProductForm } from "@/components/RequestProductForm";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { StickyActionBar } from "@/components/StickyActionBar";
import { JsonLd } from "@/components/JsonLd";
import { serverFetch, serverFetchOrMissing } from "@/lib/server-api";
import { categoryName } from "@/lib/catalog";
import { getTruckCatalog, type TruckMake } from "@/lib/landing";
import { breadcrumbJsonLd, localeAlternates, absoluteUrl, productJsonLd } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import { whatsappLink } from "@/lib/site";

// Product pages are rebuilt in the background at most once a minute
// (ISR): fast for shoppers and crawlers, and price/stock changes show up
// within a minute without an API call on every view.
export const revalidate = 60;

type Vehicle = { manufacturer: string; model: string; yearStart: number; yearEnd: number | null; engine: string | null };
type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  descriptionFr: string | null;
  price: string;
  quantity: number;
  condition: string;
  conditionNotes: string | null;
  partNumber: string | null;
  crossReference: string[];
  category: { name: string; nameFr: string | null; slug: string };
  brand: { name: string; slug: string } | null;
  images: { url: string; altText: string | null }[];
  compatibility: { vehicle: Vehicle }[];
  reviews: { id: string; rating: number; comment: string | null; userId: string; createdAt: string }[];
};

type Props = { params: Promise<{ locale: Locale; slug: string }> };

// A 404 from the API means the product is gone (render a real 404). Any
// other failure throws, so Next shows an error page instead — we must never
// tell search engines a product doesn't exist just because the API blinked.
async function getProduct(slug: string) {
  const { data, missing } = await serverFetchOrMissing<Product>(`/products/${encodeURIComponent(slug)}`, 60);
  if (missing || !data) notFound();
  return data;
}

function localizedDescription(product: Product, locale: string) {
  return locale === "fr" && product.descriptionFr ? product.descriptionFr : product.description;
}

const years = (v: Vehicle) => `${v.yearStart}${v.yearEnd ? `–${v.yearEnd}` : "+"}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProduct(slug);
  const description = localizedDescription(product, locale).replace(/\s+/g, " ").slice(0, 160);
  // Part numbers are a big share of real searches ("filtre 51.05504-0107"),
  // so they go in the title.
  const title = product.partNumber ? `${product.name} — ${product.partNumber}` : product.name;
  const image = product.images[0]?.url;

  return {
    title,
    description,
    alternates: localeAlternates(`/products/${slug}`, locale),
    openGraph: { title, description, url: `/${locale}/products/${slug}`, images: image ? [image] : undefined },
    twitter: { title, description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [product, t, tc, tl, tf, payment, trucks] = await Promise.all([
    getProduct(slug),
    getTranslations("Product"),
    getTranslations("Catalog"),
    getTranslations("Landing"),
    getTranslations("Footer"),
    serverFetch<{ online: boolean }>("/payments/options", { revalidate: 300 }),
    getTruckCatalog(),
  ]);

  const description = localizedDescription(product, locale);
  const category = categoryName(product.category, locale);
  const inStock = product.quantity > 0;
  const url = absoluteUrl(`/${locale}/products/${slug}`);
  const productLabel = `${product.name}${product.partNumber ? ` (${product.partNumber})` : ""}`;
  const whatsapp = whatsappLink(
    t("whatsappMessage", { name: product.name, ref: product.partNumber ? ` (${product.partNumber})` : "", url }),
  );
  const vehicles = product.compatibility.map((c) => c.vehicle);
  const fits: Fit[] = vehicles.map((v) => ({
    manufacturer: v.manufacturer,
    model: v.model,
    years: years(v),
    engine: v.engine,
    href: `/trucks/${slugify(v.manufacturer)}/${slugify(v.model)}`,
  }));
  const makes = truckOptions(trucks ?? [], vehicles);
  const stock = inStock ? t("inStockCount", { count: product.quantity }) : t("outOfStock");
  const crumbs = [
    { name: tl("home"), path: "" },
    { name: t("breadcrumbAll"), path: "/products" },
    { name: category, path: `/categories/${product.category.slug}` },
    { name: product.name, path: `/products/${slug}` },
  ];

  return (
    // Bottom padding on phones: room for the pinned buy bar.
    <main className="max-w-6xl mx-auto px-4 pt-6 pb-28 sm:pt-8 lg:pb-14">
      <JsonLd data={productJsonLd(product, url)} />
      <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, path: `/${locale}${c.path}` })))} />

      <nav aria-label={tc("breadcrumb")} className="text-sm text-steel">
        <ol className="flex flex-wrap items-center gap-1.5">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i < crumbs.length - 1 ? (
                <Link href={c.path || "/"} className="hover:text-ink underline-offset-2 hover:underline">{c.name}</Link>
              ) : (
                <span aria-current="page" className="truncate max-w-[60vw] text-ink">{c.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Redesign step 3, option B. Desktop: content left, buy box right
          (sticky). Phones: one column — photo and title, buy box, then the
          fit check — with StickyActionBar once the buy box scrolls away. */}
      <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:col-start-1">
          <ProductGallery images={product.images} alt={productImageAlt(product)} />
          <div className="flex flex-col gap-3">
            <p className="text-[15px] font-semibold text-amber-dark">
              {product.brand ? (
                <Link href={`/brands/${product.brand.slug}`} className="hover:underline underline-offset-2">{product.brand.name}</Link>
              ) : (
                tc("unbranded")
              )}
              {" · "}
              <Link href={`/categories/${product.category.slug}`} className="hover:underline underline-offset-2">{category}</Link>
            </p>
            <h1 className="font-display text-3xl sm:text-[38px] font-bold leading-[1.05] text-ink">{product.name}</h1>

            {/* Plain, labelled facts: what shoppers scan for and what answer
                engines extract. */}
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[15px]">
              {product.partNumber && (
                <>
                  <dt className="text-steel">{t("partNumber")}</dt>
                  <dd className="font-mono text-ink">{product.partNumber}</dd>
                </>
              )}
              {product.crossReference.length > 0 && (
                <>
                  <dt className="text-steel">{t("crossReference")}</dt>
                  <dd className="font-mono text-ink">{product.crossReference.join(" · ")}</dd>
                </>
              )}
              <dt className="text-steel">{t("condition")}</dt>
              <dd><ConditionTag condition={product.condition} /></dd>
              {product.brand && (
                <>
                  <dt className="text-steel">{t("brand")}</dt>
                  <dd className="text-ink">{product.brand.name}</dd>
                </>
              )}
              <dt className="text-steel">{t("category")}</dt>
              <dd className="text-ink">{category}</dd>
            </dl>

            {product.conditionNotes && (
              <div className="rounded-[10px] bg-[#F6E6C8] px-3.5 py-3 text-sm text-ink">
                <span className="font-semibold">{t("conditionNotes")} : </span>
                {product.conditionNotes}
              </div>
            )}
          </div>
        </div>

        <aside
          id="buy-box"
          aria-label={t("buyBox")}
          className="flex flex-col gap-3.5 self-start rounded-[14px] border border-line bg-card p-5 sm:p-6 lg:sticky lg:top-[136px] lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          {/* Sticks below the pinned site header (119px on desktop) + 16px.
              Buy, or — when it's sold out — turn the visit into a lead.
              #buy-actions is what StickyActionBar watches: price and buttons,
              not the notes or form below them. */}
          <div id="buy-actions" className="flex flex-col gap-3.5">
            <span className="text-[34px] font-bold leading-none text-ink">{formatMoney(product.price)}</span>
            <span className={`self-start rounded-full px-3 py-1 text-sm font-bold ${inStock ? "bg-stock-bg text-stock" : "bg-[#F1DCD5] text-[#8A3821]"}`}>
              {stock}
            </span>
            {inStock ? (
              <>
                <AddToCartButton productId={product.id} slug={product.slug} inStock />
                <WhatsAppButton href={whatsapp} label={t("askWhatsapp")} source="product" variant="action" className="w-full" />
              </>
            ) : (
              <>
                <p className="font-semibold text-ink">{t("outOfStockTitle")}</p>
                <p className="text-sm text-steel">{t("outOfStockBody")}</p>
                <WhatsAppButton href={whatsapp} label={t("askWhatsapp")} source="product_out_of_stock" variant="action" className="w-full" />
              </>
            )}
          </div>
          {inStock ? (
            <ul className="flex flex-col gap-2 border-t border-sand pt-3.5 text-sm text-steel">
              <li>{payment?.online ? t("cashNote") : t("cashOnlyNote")}</li>
              <li>{tf("visitUsBody")}</li>
            </ul>
          ) : (
            <RequestProductForm startOpen prefillDescription={productLabel} />
          )}
        </aside>

        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1">
          <FitChecker fits={fits} makes={makes} productLabel={productLabel} productUrl={url} />

          <section>
            <h2 className="font-display text-2xl font-bold text-ink mb-2">{t("description")}</h2>
            <p className="text-[17px] leading-relaxed text-ink whitespace-pre-line">{description}</p>
          </section>

          <ReviewsSection productId={product.id} initialReviews={product.reviews} />
        </div>
      </div>

      <StickyActionBar targetId="buy-actions">
        <div className="flex items-center gap-2.5">
          <div className="flex min-w-0 flex-col">
            <span className="whitespace-nowrap text-xl font-bold text-ink">{formatMoney(product.price)}</span>
            <span className={`text-[13px] font-bold ${inStock ? "text-stock" : "text-[#8A3821]"}`}>{stock}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {inStock ? (
              <>
                <WhatsAppButton href={whatsapp} label={t("askWhatsapp")} source="product_bar" variant="square" />
                <AddToCartButton productId={product.id} slug={product.slug} inStock compact />
              </>
            ) : (
              <WhatsAppButton href={whatsapp} label={t("askWhatsapp")} source="product_bar_out_of_stock" variant="action" className="h-[50px] px-4 text-base" />
            )}
          </div>
        </div>
      </StickyActionBar>
    </main>
  );
}

// Makes and models for the fit check: every truck we know (so a shopper can
// pick theirs even when this part doesn't fit it), plus this part's own
// trucks in case the catalog call failed.
function truckOptions(trucks: TruckMake[], vehicles: Vehicle[]): MakeOption[] {
  const byMake = new Map<string, Set<string>>();
  for (const make of trucks) {
    byMake.set(make.manufacturer, new Set(make.models.map((m) => m.model)));
  }
  for (const v of vehicles) {
    if (!byMake.has(v.manufacturer)) byMake.set(v.manufacturer, new Set());
    byMake.get(v.manufacturer)!.add(v.model);
  }
  return [...byMake.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([manufacturer, models]) => ({ manufacturer, models: [...models].sort((a, b) => a.localeCompare(b)) }));
}
