"use client";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

// Switches to the same page in the other language (/fr/x <-> /en/x),
// keeping the query string. next-intl's middleware remembers the choice in
// the NEXT_LOCALE cookie for the next visit to "/".
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("LanguageSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    // Read at click time rather than via useSearchParams(), which would force
    // every page (this lives in the navbar) out of static rendering.
    const query = window.location.search.slice(1);
    startTransition(() => {
      router.replace(
        // pathname is the route without the locale, e.g. "/products/[slug]"
        // resolved with the current params.
        { pathname: query ? `${pathname}?${query}` : pathname, params } as never,
        { locale: next },
      );
    });
  }

  return (
    <div className={`flex items-center gap-1 text-xs font-mono ${className}`} aria-label="Language">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          disabled={isPending}
          aria-current={l === locale}
          lang={l}
          className={`px-1.5 py-0.5 border transition-colors duration-200 disabled:opacity-50 ${
            l === locale
              ? "border-amber text-amber"
              : "border-paper/30 text-paper/60 hover:text-paper hover:border-paper/60"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
      <span className="sr-only">{t("english")} / {t("french")}</span>
    </div>
  );
}
