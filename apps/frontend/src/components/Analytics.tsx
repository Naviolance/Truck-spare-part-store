import Script from "next/script";

// Umami: privacy-friendly, cookieless page analytics (no consent banner
// needed for it, no personal data). Off unless NEXT_PUBLIC_UMAMI_WEBSITE_ID
// is set. NEXT_PUBLIC_UMAMI_DOMAINS limits tracking to the real domain so
// local dev and preview deployments don't pollute the numbers.
const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const SRC = process.env.NEXT_PUBLIC_UMAMI_SRC || "https://cloud.umami.is/script.js";
const DOMAINS = process.env.NEXT_PUBLIC_UMAMI_DOMAINS;

export function Analytics() {
  if (!WEBSITE_ID) return null;
  return (
    <Script
      src={SRC}
      data-website-id={WEBSITE_ID}
      {...(DOMAINS && { "data-domains": DOMAINS })}
      strategy="afterInteractive"
    />
  );
}
