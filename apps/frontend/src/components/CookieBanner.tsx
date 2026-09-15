"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const DISMISSED_KEY = "cookie-notice-dismissed";

// This is a notice, not a granular accept/reject control, on purpose: every
// cookie this site sets (session, CSRF, language) is either strictly
// necessary or a plain functional preference — there's no tracking or
// advertising cookie to actually opt out of. A "reject" button that didn't
// change any real behavior would be a fake control, which is worse than an
// honest notice.
export function CookieBanner() {
  const t = useTranslations("CookieBanner");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISSED_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable (private browsing, blocked) - just show it.
      setVisible(true);
    }
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

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-ink border-t border-paper/15 animate-fadeIn">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <p className="text-sm text-paper/80 flex-1">
          {t("text")}{" "}
          <Link href="/privacy" className="text-amber underline hover:text-amber-dark transition-colors duration-200">
            {t("learnMore")}
          </Link>
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 w-full sm:w-auto bg-amber text-ink font-medium text-sm px-5 py-2 rounded-lg transition-colors duration-150 hover:bg-amber-dark"
        >
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
