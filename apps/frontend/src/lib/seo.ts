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
