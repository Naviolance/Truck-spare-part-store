import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Sends "/" and any un-prefixed path to /fr/... or /en/... (browser language,
// or the visitor's earlier manual choice, remembered in the NEXT_LOCALE cookie).
export default createMiddleware(routing);

export const config = {
  // Everything except: the API proxy, the admin (English-only, not indexed),
  // Next internals, and files with an extension (robots.txt, sitemap.xml,
  // images, llms.txt) or metadata routes (icon, opengraph-image).
  matcher: ["/((?!api|admin|_next|_vercel|icon|opengraph-image|.*\\..*).*)"],
};
