import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const MAX_PAGES = 20; // safety cap — 20 * 60 = 1200 products

async function getAllProductSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const res = await fetch(`${API_URL}/products?limit=60&page=${page}`, { cache: "no-store" });
      if (!res.ok) break;
      const data = await res.json();
      slugs.push(...data.items.map((p: { slug: string }) => p.slug));
      if (page >= data.totalPages) break;
    } catch {
      break;
    }
  }
  return slugs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/find-my-part`, changeFrequency: "weekly", priority: 0.6 },
  ];

  const slugs = await getAllProductSlugs();
  const productRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${SITE_URL}/products/${slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
