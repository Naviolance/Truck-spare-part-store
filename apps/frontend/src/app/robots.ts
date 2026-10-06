import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Private and transactional pages are kept out of crawling; they're also
// noindex in their own metadata. Everything public (catalog, landing pages,
// products) is open — including to AI answer engines, which is how a
// question like "where to buy an Actros clutch disc in Cameroon" can lead here.
export default function robots(): MetadataRoute.Robots {
  // Vercel sets VERCEL_ENV=preview on preview deployments: those must never
  // be indexed (duplicate content). Production — whatever its domain, even
  // a *.vercel.app one — and non-Vercel hosts are crawlable.
  const isPreview = process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development";
  return {
    rules: {
      userAgent: "*",
      // Preview/staging deployments must never be indexed.
      ...(!isPreview
        ? {
            allow: "/",
            disallow: ["/admin", "/api/", "/*/cart", "/*/checkout", "/*/orders", "/*/account", "/*/login", "/*/register", "/*/forgot-password", "/*/reset-password"],
          }
        : { disallow: "/" }),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
