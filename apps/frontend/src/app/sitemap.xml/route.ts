import { SITEMAP_HEADERS, sitemapIndexXml } from "@/lib/sitemap";

// Next requires a literal here; keep in step with SITEMAP_REVALIDATE.
export const revalidate = 3600;

// Sitemap index — see lib/sitemap.ts.
export async function GET() {
  return new Response(await sitemapIndexXml(), { headers: SITEMAP_HEADERS });
}
