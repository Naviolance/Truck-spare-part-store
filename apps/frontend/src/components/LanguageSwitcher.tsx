"use client";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { routing, type Locale } from "@/i18n/routing";
import { announceNavigation } from "@/lib/navigation-events";

// The same page in the other language (/fr/x <-> /en/x, query kept).
// next-intl's middleware remembers the choice (NEXT_LOCALE cookie).
//
// Why it feels instant: every word on the page changes, so the server must
// render the page again — ~1.5 s if it starts on click. Instead we prefetch
// the other language as soon as the pointer/finger/keyboard focus reaches
// the switch ("full" = the page's data too, not just its code), the pill
// flips immediately on click, and NavigationSkeleton covers any remaining
// wait instead of a frozen page.
function otherLocaleHref(next: Locale) {
  const { pathname, search } = window.location;
  const rest = pathname.replace(/^\/(fr|en)(?=\/|$)/, "");
  return `/${next}${rest}${search}`;
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("LanguageSwitcher");
  const router = useRouter();
  const [chosen, setChosen] = useState<Locale | null>(null);
  const [isPending, startTransition] = useTransition();
  const shown = isPending && chosen ? chosen : locale;

  const prefetch = () => {
    for (const l of routing.locales) {
      // "full": also fetch the page's data (Next's default only prefetches
      // the code for dynamic pages, which is what made the switch slow).
      if (l !== locale) router.prefetch(otherLocaleHref(l), { kind: "full" } as never);
    }
  };

  function switchTo(next: Locale) {
    if (next === locale) return;
    const href = otherLocaleHref(next);
    setChosen(next);
    announceNavigation(href);
    startTransition(() => router.replace(href, { scroll: false }));
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
      className={`inline-flex items-center gap-0.5 rounded-full border border-[#4A4540] p-[3px] ${className}`}
    >
      <svg viewBox="0 0 24 24" className="mx-1.5 h-[18px] w-[18px] text-paper-dim" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          onClick={() => switchTo(l)}
          aria-pressed={shown === l}
          title={l === "fr" ? t("french") : t("english")}
          className={`h-9 min-w-11 rounded-full px-2 text-sm font-bold transition-colors duration-150 ${
            shown === l ? "bg-amber text-ink" : "text-paper-dim hover:text-paper"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
