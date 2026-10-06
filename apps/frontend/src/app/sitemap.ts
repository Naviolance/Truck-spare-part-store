import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { serverFetch } from "@/lib/server-api";
import { getBrands, getCategories, getTruckCatalog, productCount } from "@/lib/landing";
import { SITE_URL } from "@/lib/site";

// Regenerated at most once an hour.
export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

// One entry per page per language, each listing its translations
// (hreflang), so search engines index /fr and /en as the same page in two
// languages rather than duplicates.
function localized(path: string, extra: Omit<Entry, "url" | "alternates"> = {}): Entry[] {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`]));
  return routing.locales.map((locale) => ({ url: `${SITE_URL}/${locale}${path}`, alternates: { languages }, ...extra }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, brands, trucks] = await Promise.all([
    serverFetch<{ slug: string; updatedAt: string }[]>("/products/sitemap", { revalidate: 3600 }),
    getCategories(),
    getBrands(),
    getTruckCatalog(),
  ]);

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

  const productPages = (products ?? []).flatMap((p) =>
    localized(`/products/${p.slug}`, { lastModified: p.updatedAt, changeFrequency: "weekly" }),
  );

  return [...staticPages, ...landing, ...productPages];
}
