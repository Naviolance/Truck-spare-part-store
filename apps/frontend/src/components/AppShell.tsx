import { Inter, Big_Shoulders, IBM_Plex_Mono } from "next/font/google";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "../app/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import { PageTransition } from "@/components/PageTransition";
import { NavigationProgress } from "@/components/NavigationProgress";
import { Analytics } from "@/components/Analytics";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-body" });
// Condensed, steel-beam letterforms for headlines - deliberately not the
// same neutral grotesk as the body copy (see Footer/Navbar/hero usage).
const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
  // Next 15 has no fallback metrics for the merged "Big Shoulders" family.
  adjustFontFallback: false,
  variable: "--font-display",
});
// Used narrowly for part numbers/SKUs/spec rows - real parts-catalog
// convention (unambiguous characters, tabular alignment), not decoration.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
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
  const clientMessages = Object.fromEntries(
    Object.entries(messages).filter(([namespace]) => !SERVER_ONLY_NAMESPACES.has(namespace)),
  );

  return (
    <html lang={locale}>
      <body
        className={`${inter.variable} ${bigShoulders.variable} ${plexMono.variable} font-sans min-h-screen bg-paper text-ink flex flex-col`}
      >
        <NextIntlClientProvider locale={locale} messages={clientMessages}>
          {/* Suspense boundary isolated here (not around the whole app) so
              useSearchParams() inside only de-opts this one component to
              client rendering, not every static page in the tree. */}
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <AuthProvider>
            <CartProvider>
              <Navbar />
              <div className="flex-1">
                <PageTransition>{children}</PageTransition>
              </div>
              <Footer />
            </CartProvider>
          </AuthProvider>
          <CookieBanner />
          {storefront && <FloatingWhatsApp />}
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
