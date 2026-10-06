"use client";
import { reportError } from "@/lib/report-error";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// A page failed to render (e.g. the API was down): keep the site's header and
// footer, explain, and let the visitor retry — instead of a broken page.
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("Common");
  const tn = useTranslations("NotFound");
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-20 text-center">
      <div>
        <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-2">{t("genericError")}</h1>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button onClick={reset} className="bg-amber text-ink px-5 py-2.5 text-sm font-semibold hover:bg-amber-dark">
            {t("tryAgain")}
          </button>
          <Link href="/" className="border border-steel-light px-5 py-2.5 text-sm font-semibold text-steel hover:border-steel hover:text-ink">
            {tn("home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
