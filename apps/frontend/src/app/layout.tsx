import type { Metadata } from "next";
import { Inter, Big_Shoulders_Display, IBM_Plex_Mono } from "next/font/google";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { NavigationProgress } from "@/components/NavigationProgress";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-body" });
// Condensed, steel-beam letterforms for headlines - deliberately not the
// same neutral grotesk as the body copy (see Footer/Navbar/hero usage).
const bigShoulders = Big_Shoulders_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_NAME = "TruckParts";
const SITE_DESCRIPTION = "Quality new and used truck spare parts, with vehicle compatibility lookup.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Truck Spare Parts Store`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Truck Spare Parts Store`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Truck Spare Parts Store`,
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${inter.variable} ${bigShoulders.variable} ${plexMono.variable} font-sans min-h-screen bg-paper text-ink flex flex-col`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}