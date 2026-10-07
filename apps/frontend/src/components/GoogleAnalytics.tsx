"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { CONSENT_EVENT, GA_ID, readConsent } from "@/lib/consent";

// Google Analytics 4, loaded only after the visitor clicked "Accepter" in
// the cookie banner (and only when NEXT_PUBLIC_GA_ID is set). Umami
// (components/Analytics.tsx) is cookieless and keeps running either way.
// Withdrawing consent stops it on the next page load.
export function GoogleAnalytics() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const sync = () => setGranted(readConsent() === "granted");
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!GA_ID || !granted) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
