import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";
import { SITE_NAME, SITE_URL, SOCIAL } from "./site";

// Canonical + hreflang for a page that exists in every locale. `path` is the
// locale-less path ("/products/brake-pad"). Search engines index each
// language separately and show the right one per searcher; x-default is the
// French version (the default locale).
export function localeAlternates(path: string, locale: Locale): Metadata["alternates"] {
  const clean = path === "/" ? "" : path;
  return {
    canonical: `/${locale}${clean}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${clean}`])),
      "x-default": `/${routing.defaultLocale}${clean}`,
    },
  };
}

export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

// The store as a business: an AutoPartsStore (a Schema.org LocalBusiness).
// Feeds Google's knowledge panel and answer engines. Only facts we actually
// have are included — never invented addresses or opening hours.
export function storeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    "@id": `${SITE_URL}/#store`,
    name: SITE_NAME,
    url: SITE_URL,
    image: `${SITE_URL}/opengraph-image`,
    currenciesAccepted: "XAF",
    paymentAccepted: "Cash",
    areaServed: { "@type": "Country", name: "Cameroon" },
    sameAs: [SOCIAL.facebook, SOCIAL.tiktok, SOCIAL.instagram].filter(Boolean),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

// <script type="application/ld+json"> body. "<" is escaped so a product
// name containing "</script>" can't break out of the tag.
export function jsonLdScript(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

// Metadata for a category/brand/truck landing page. An empty landing page is
// thin content: it stays reachable (with the part-request form) but is kept
// out of the index until it has parts.
export function landingMetadata({
  locale,
  path,
  title,
  description,
  productCount,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  productCount: number;
}): Metadata {
  return {
    title,
    description,
    alternates: localeAlternates(path, locale),
    openGraph: { title, description, url: `/${locale}${path}` },
    ...(productCount === 0 && { robots: { index: false, follow: true } }),
  };
}

const ITEM_CONDITION: Record<string, string> = {
  NEW: "https://schema.org/NewCondition",
  USED: "https://schema.org/UsedCondition",
  RECONDITIONED: "https://schema.org/RefurbishedCondition",
};

type ProductForJsonLd = {
  name: string;
  description: string;
  price: string;
  quantity: number;
  condition: string;
  partNumber: string | null;
  crossReference: string[];
  images: { url: string }[];
  brand: { name: string } | null;
  category: { name: string };
  compatibility: { vehicle: { manufacturer: string; model: string; yearStart: number; yearEnd: number | null } }[];
  reviews: { rating: number }[];
};

// Schema.org Product + Offer: what Google needs for price/availability rich
// results, and what answer engines use to say "X sells part Y for Z FCFA,
// in stock, fits an Actros". Every value is real data from the listing.
export function productJsonLd(product: ProductForJsonLd, url: string) {
  const ratings = product.reviews.map((r) => r.rating);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description.slice(0, 5000),
    url,
    image: product.images.map((i) => absoluteUrl(i.url)),
    category: product.category.name,
    ...(product.brand && { brand: { "@type": "Brand", name: product.brand.name } }),
    ...(product.partNumber && { sku: product.partNumber, mpn: product.partNumber }),
    ...(product.crossReference.length > 0 && {
      additionalProperty: product.crossReference.map((ref) => ({ "@type": "PropertyValue", name: "Cross reference", value: ref })),
    }),
    ...(product.compatibility.length > 0 && {
      isAccessoryOrSparePartFor: product.compatibility.map(({ vehicle: v }) => ({
        "@type": "Vehicle",
        name: `${v.manufacturer} ${v.model}`,
        manufacturer: { "@type": "Organization", name: v.manufacturer },
        model: v.model,
        vehicleModelDate: v.yearEnd ? `${v.yearStart}-${v.yearEnd}` : `${v.yearStart}`,
      })),
    }),
    offers: {
      "@type": "Offer",
      url,
      price: Math.round(Number(product.price)),
      priceCurrency: "XAF",
      availability: product.quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: ITEM_CONDITION[product.condition] ?? "https://schema.org/UsedCondition",
      seller: { "@type": "Organization", name: SITE_NAME, "@id": `${SITE_URL}/#store` },
    },
    ...(ratings.length > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1),
        reviewCount: ratings.length,
      },
    }),
  };
}
