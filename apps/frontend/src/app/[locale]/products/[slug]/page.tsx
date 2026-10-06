import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { AddToCartButton } from "./AddToCartButton";
import { ReviewsSection } from "./ReviewsSection";
import { ProductGallery } from "./ProductGallery";
import { formatMoney } from "@/lib/money";
import { ConditionTag } from "@/components/ProductCard";
import { RequestProductForm } from "@/components/RequestProductForm";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { JsonLd } from "@/components/JsonLd";
import { serverFetch, serverFetchOrMissing } from "@/lib/server-api";
import { categoryName } from "@/lib/catalog";
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
  const [product, t, tc, payment] = await Promise.all([
    getProduct(slug),
    getTranslations("Product"),
    getTranslations("Catalog"),
    serverFetch<{ online: boolean }>("/payments/options", { revalidate: 300 }),
  ]);

  const description = localizedDescription(product, locale);
  const category = categoryName(product.category, locale);
  const inStock = product.quantity > 0;
  const url = absoluteUrl(`/${locale}/products/${slug}`);
  const whatsapp = whatsappLink(
    t("whatsappMessage", { name: product.name, ref: product.partNumber ? ` (${product.partNumber})` : "", url }),
  );
  const vehicles = product.compatibility.map((c) => c.vehicle);

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <JsonLd data={productJsonLd(product, url)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("breadcrumbAll"), path: `/${locale}/products` },
          { name: category, path: `/${locale}/categories/${product.category.slug}` },
          { name: product.name, path: `/${locale}/products/${slug}` },
        ])}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-steel">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/products" className="hover:text-ink">{t("breadcrumbAll")}</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={`/categories/${product.category.slug}`} className="hover:text-ink">{category}</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink truncate max-w-[60vw]">{product.name}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-6">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          <p className="text-sm text-steel">
            {product.brand ? (
              <Link href={`/brands/${product.brand.slug}`} className="hover:text-ink underline-offset-2 hover:underline">{product.brand.name}</Link>
            ) : (
              tc("unbranded")
            )}
          </p>
          <h1 className="text-2xl font-sans font-bold mt-1 text-ink tracking-tight">{product.name}</h1>
          {product.partNumber && (
            <p className="text-sm text-steel mt-1">
              {t("partNumber")}: <span className="font-mono text-ink">{product.partNumber}</span>
            </p>
          )}

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="text-2xl font-mono font-semibold text-ink">{formatMoney(product.price)}</span>
            <ConditionTag condition={product.condition} />
          </div>

          <p className={`text-sm mt-2 font-medium ${inStock ? "text-emerald-700" : "text-red-700"}`}>
            {inStock ? t("inStockCount", { count: product.quantity }) : t("outOfStock")}
          </p>

          {product.conditionNotes && (
            <div className="mt-4 bg-amber/10 border-l-4 border-amber p-3 text-sm text-ink">
              <span className="font-medium">{t("conditionNotes")}: </span>
              {product.conditionNotes}
            </div>
          )}

          {/* Buy, or — when it's sold out — turn the visit into a lead. */}
          <div className="mt-6 space-y-3">
            {inStock ? (
              <>
                <AddToCartButton productId={product.id} slug={product.slug} inStock />
                <WhatsAppButton href={whatsapp} label={t("askWhatsapp")} source="product" variant="outline" className="w-full" />
                <p className="text-xs text-steel">{payment?.online ? t("cashNote") : t("cashOnlyNote")}</p>
              </>
            ) : (
              <div className="border border-steel-light bg-white p-4">
                <p className="font-semibold text-ink">{t("outOfStockTitle")}</p>
                <p className="text-sm text-steel mt-1 mb-3">{t("outOfStockBody")}</p>
                <WhatsAppButton href={whatsapp} label={t("askWhatsapp")} source="product_out_of_stock" className="w-full mb-4" />
                <RequestProductForm
                  startOpen
                  prefillDescription={`${product.name}${product.partNumber ? ` (${product.partNumber})` : ""}`}
                />
              </div>
            )}
          </div>

          {/* Plain, labelled facts: what shoppers scan for and what answer
              engines extract. */}
          <section className="mt-8">
            <h2 className="font-display font-semibold mb-2 text-ink">{t("keyFacts")}</h2>
            <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              {product.partNumber && (
                <>
                  <dt className="text-steel">{t("partNumber")}</dt>
                  <dd className="font-mono text-ink">{product.partNumber}</dd>
                </>
              )}
              {product.crossReference.length > 0 && (
                <>
                  <dt className="text-steel">{t("crossReference")}</dt>
                  <dd className="font-mono text-ink">{product.crossReference.join(", ")}</dd>
                </>
              )}
              <dt className="text-steel">{t("condition")}</dt>
              <dd className="text-ink"><ConditionTag condition={product.condition} /></dd>
              {product.brand && (
                <>
                  <dt className="text-steel">{t("brand")}</dt>
                  <dd className="text-ink">{product.brand.name}</dd>
                </>
              )}
              <dt className="text-steel">{t("category")}</dt>
              <dd className="text-ink">
                <Link href={`/categories/${product.category.slug}`} className="underline-offset-2 hover:underline">{category}</Link>
              </dd>
              <dt className="text-steel">{t("availability")}</dt>
              <dd className="text-ink">{inStock ? t("inStockCount", { count: product.quantity }) : t("outOfStock")}</dd>
            </dl>
          </section>

          <section className="mt-6">
            <h2 className="font-display font-semibold mb-2 text-ink">{t("fits")}</h2>
            {vehicles.length > 0 ? (
              <ul className="text-sm space-y-1">
                {vehicles.map((v, i) => (
                  <li key={i} className="border-b border-steel-light pb-1">
                    <Link href={`/trucks/${slugify(v.manufacturer)}/${slugify(v.model)}`} className="text-ink hover:underline underline-offset-2">
                      {v.manufacturer} {v.model}
                    </Link>{" "}
                    <span className="text-steel">
                      ({years(v)}){v.engine && ` · ${v.engine}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-steel mt-2">{t("fitsUnknown")}</p>
          </section>

          <section className="mt-6">
            <h2 className="font-display font-semibold mb-2 text-ink">{t("description")}</h2>
            <p className="text-steel whitespace-pre-line leading-relaxed">{description}</p>
          </section>
        </div>
      </div>

      <ReviewsSection productId={product.id} initialReviews={product.reviews} />
    </main>
  );
}
