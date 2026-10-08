import { Source_Sans_3, Barlow_Semi_Condensed, IBM_Plex_Mono } from "next/font/google";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "../app/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import { NavigationSkeleton } from "@/components/NavigationSkeleton";
import { getCategories, productCount } from "@/lib/landing";
import { categoryName } from "@/lib/catalog";
import { Analytics } from "@/components/Analytics";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";

// Redesign step 1: Source Sans 3 for reading (a variable font — one file
// covers every weight) and Barlow Semi Condensed for headings: condensed
// like road and truck signage, but cleaner than the old display face.
const sourceSans = Source_Sans_3({ subsets: ["latin"], display: "swap", variable: "--font-body" });
const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-display",
});
// Used narrowly for part numbers/SKUs/spec rows - real parts-catalog
// convention (unambiguous characters, tabular alignment), not decoration.
// Not preloaded: it only styles part numbers, and preloading it delayed the
// fonts the first screen needs (measured with Lighthouse, mobile).
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-mono",
});

const SERVER_ONLY_NAMESPACES = new Set(["Hero", "ValueProps", "Home", "Footer", "PrivacyPage", "Meta", "Landing", "About"]);

// The <html> document shared by the two root layouts: the storefront
// (app/[locale]/layout.tsx) and the admin (app/admin/layout.tsx).
export async function AppShell({
  locale,
  children,
  storefront = true,
}: {
  locale: string;
  children: React.ReactNode;
  // false for the admin: no customer chat button there.
  storefront?: boolean;
}) {
  // Explicit locale: never rely on the per-request locale here — the global
  // not-found page is rendered alongside every page and has no locale.
  const messages = await getMessages({ locale });
  // Namespaces only server components use never need to reach the browser
  // (~10 KB of text — the privacy policy, FAQ, landing intros). If a CLIENT
  // component starts using one of these, remove it from this list.
  // The header's browse row: the 6 categories with the most parts, cached
  // with the catalog (refreshed on admin edits). Storefront only.
  const navCategories = storefront
    ? ((await getCategories()) ?? [])
        .filter((c) => productCount(c) > 0)
        .sort((a, b) => productCount(b) - productCount(a))
        .slice(0, 6)
        .map((c) => ({ slug: c.slug, label: categoryName(c, locale) }))
    : [];
  const clientMessages = Object.fromEntries(
    Object.entries(messages).filter(([namespace]) => !SERVER_ONLY_NAMESPACES.has(namespace)),
  );

  return (
    <html lang={locale}>
      <body
        className={`${sourceSans.variable} ${barlow.variable} ${plexMono.variable} font-sans min-h-screen bg-paper text-ink flex flex-col`}
      >
        <NextIntlClientProvider locale={locale} messages={clientMessages}>
          <AuthProvider>
            <CartProvider>
              <Navbar categories={navCategories} />
              <div className="relative flex-1">
                {children}
                {/* Suspense isolated here (not around the whole app) so
                    useSearchParams() inside only de-opts this component to
                    client rendering, not every static page in the tree. */}
                {storefront && (
                  <Suspense fallback={null}>
                    <NavigationSkeleton />
                  </Suspense>
                )}
              </div>
              <Footer />
            </CartProvider>
          </AuthProvider>
          <CookieBanner />
          {storefront && <FloatingWhatsApp />}
        </NextIntlClientProvider>
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
