"use client";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CONSENT_EVENT, GA_ID, readConsent, saveConsent } from "@/lib/consent";

const DISMISSED_KEY = "cookie-notice-dismissed";

// Two modes:
// - No analytics configured (no NEXT_PUBLIC_GA_ID): every cookie is strictly
//   necessary (session, CSRF, language), so it's an honest notice with one
//   "OK" button — a "refuse" button would change nothing.
// - Google Analytics configured: a real choice. Analytics only loads after
//   "Accepter" (components/GoogleAnalytics.tsx); "Refuser" is as easy as
//   accepting, and the privacy page can reopen the choice.
export function CookieBanner() {
  const t = useTranslations("CookieBanner");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const decide = () => {
      if (GA_ID) return setVisible(readConsent() === null);
      try {
        setVisible(!localStorage.getItem(DISMISSED_KEY));
      } catch {
        setVisible(true);
      }
    };
    decide();
    window.addEventListener(CONSENT_EVENT, decide);
    return () => window.removeEventListener(CONSENT_EVENT, decide);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to persist to - it'll just show again next visit.
    }
  }

  if (!visible) return null;

  const button = "shrink-0 w-full sm:w-auto font-medium text-sm px-5 py-2 rounded-lg transition-colors duration-150";
  return (
    <div role="region" aria-label={t("label")} className="fixed bottom-0 inset-x-0 z-50 bg-ink border-t border-paper/15 animate-fadeIn">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <p className="text-sm text-paper/80 flex-1">
          {GA_ID ? t("consentText") : t("text")}{" "}
          <Link href="/privacy" className="text-amber underline hover:text-amber-dark transition-colors duration-200">
            {t("learnMore")}
          </Link>
        </p>
        {GA_ID ? (
          <div className="flex w-full gap-2 sm:w-auto">
            <button onClick={() => saveConsent("denied")} className={`${button} border border-paper/40 text-paper hover:bg-ink-soft`}>
              {t("refuse")}
            </button>
            <button onClick={() => saveConsent("granted")} className={`${button} bg-amber text-ink hover:bg-amber-dark`}>
              {t("acceptAnalytics")}
            </button>
          </div>
        ) : (
          <button onClick={dismiss} className={`${button} bg-amber text-ink hover:bg-amber-dark`}>
            {t("accept")}
          </button>
        )}
      </div>
    </div>
  );
}

// "Change my cookie choice" (privacy page): clears it and reopens the banner.
export function CookieChoiceButton() {
  const t = useTranslations("CookieBanner");
  if (!GA_ID) return null;
  return (
    <button type="button" onClick={() => saveConsent(null)} className="font-semibold text-ink underline underline-offset-2">
      {t("change")}
    </button>
  );
}
