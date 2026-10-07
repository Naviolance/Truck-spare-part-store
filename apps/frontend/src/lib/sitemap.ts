import { routing } from "@/i18n/routing";
import { serverFetch } from "@/lib/server-api";
import { getBrands, getCategories, getTruckCatalog, productCount } from "@/lib/landing";
import { SITE_URL } from "@/lib/site";
import { absoluteUrl } from "@/lib/seo";

// Sitemaps, split so every product is listed however big the catalog gets
// (Google reads at most 50,000 URLs per file):
//
//   /sitemap.xml                 index: lists the files below (robots.txt points here)
//   /sitemaps/pages.xml          home, static pages, category / brand / truck landing pages
//   /sitemaps/products-<n>.xml   20,000 products each (x2 languages = 40,000 URLs)
//
// Route handlers rather than Next's generateSitemaps(): that one fixes the
// number of files at build time, so a catalog that grows through imports
// would need a redeploy before its new products were listed.

export const SITEMAP_REVALIDATE = 3600; // regenerated at most once an hour

export const SITEMAP_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": `public, max-age=0, s-maxage=${SITEMAP_REVALIDATE}, stale-while-revalidate=86400`,
};

type Entry = { url: string; languages: Record<string, string>; lastModified?: string; changeFrequency?: string; images?: string[] };

// One entry per page per language, each listing its translations
// (hreflang), so search engines index /fr and /en as the same page in two
// languages rather than duplicates.
function localized(path: string, extra: Omit<Entry, "url" | "languages"> = {}): Entry[] {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`]));
  return routing.locales.map((locale) => ({ url: `${SITE_URL}/${locale}${path}`, languages, ...extra }));
}

const xmlEscape = (value: string) =>
  value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export function urlsetXml(entries: Entry[]): string {
  const urls = entries.map((e) =>
    [
      "<url>",
      `<loc>${xmlEscape(e.url)}</loc>`,
      ...Object.entries(e.languages).map(
        ([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${xmlEscape(href)}"/>`,
      ),
      e.lastModified ? `<lastmod>${new Date(e.lastModified).toISOString()}</lastmod>` : "",
      e.changeFrequency ? `<changefreq>${e.changeFrequency}</changefreq>` : "",
      // Image sitemap: tells search engines which photos belong to this page.
      ...(e.images ?? []).map((src) => `<image:image><image:loc>${xmlEscape(src)}</image:loc></image:image>`),
      "</url>",
    ].join(""),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>\n`;
}

export async function sitemapIndexXml(): Promise<string> {
  const info = await serverFetch<{ chunks: number }>("/products/sitemap/info", { revalidate: SITEMAP_REVALIDATE });
  const files = ["pages", ...Array.from({ length: info?.chunks ?? 0 }, (_, n) => `products-${n}`)];
  const items = files.map((f) => `<sitemap><loc>${SITE_URL}/sitemaps/${f}.xml</loc></sitemap>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("\n")}\n</sitemapindex>\n`;
}

export async function pageEntries(): Promise<Entry[]> {
  const [categories, brands, trucks] = await Promise.all([getCategories(), getBrands(), getTruckCatalog()]);

  const staticPages = ["", "/products", "/find-my-part", "/categories", "/brands", "/trucks", "/about", "/privacy"].flatMap((p) =>
    localized(p, { changeFrequency: p === "" || p === "/products" ? "daily" : "weekly" }),
  );

  // Landing pages only when they have products — empty ones are noindex.
  const landing = [
    ...(categories ?? []).filter((c) => productCount(c) > 0).map((c) => `/categories/${c.slug}`),
    ...(brands ?? []).filter((b) => productCount(b) > 0).map((b) => `/brands/${b.slug}`),
    ...(trucks ?? []).flatMap((m) => [
      ...(m.products > 0 ? [`/trucks/${m.slug}`] : []),
      ...m.models.filter((x) => x.products > 0).map((x) => `/trucks/${m.slug}/${x.slug}`),
    ]),
  ].flatMap((p) => localized(p, { changeFrequency: "daily" }));

  return [...staticPages, ...landing];
}

export async function productEntries(chunk: number): Promise<Entry[] | null> {
  const products = await serverFetch<{ slug: string; updatedAt: string; images?: { url: string }[] }[]>(`/products/sitemap?chunk=${chunk}`, {
    revalidate: SITEMAP_REVALIDATE,
  });
  if (!products || products.length === 0) return null;
  return products.flatMap((p) =>
    localized(`/products/${p.slug}`, {
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      images: (p.images ?? []).map((i) => absoluteUrl(i.url)),
    }),
  );
}
