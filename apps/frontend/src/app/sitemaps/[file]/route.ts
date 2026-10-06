import { notFound } from "next/navigation";
import { SITEMAP_HEADERS, pageEntries, productEntries, urlsetXml } from "@/lib/sitemap";

// /sitemaps/pages.xml and /sitemaps/products-<n>.xml — see lib/sitemap.ts.
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (file === "pages.xml") return new Response(urlsetXml(await pageEntries()), { headers: SITEMAP_HEADERS });

  const match = /^products-(\d{1,4})\.xml$/.exec(file);
  const entries = match ? await productEntries(Number(match[1])) : null;
  if (!entries) notFound();
  return new Response(urlsetXml(entries), { headers: SITEMAP_HEADERS });
}
