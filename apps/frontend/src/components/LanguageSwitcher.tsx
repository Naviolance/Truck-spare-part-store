"use client";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleCookie } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/locales";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("LanguageSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleCookie(next);
      router.refresh();
    });
  }

  return (
    <div className={`flex items-center gap-1 text-xs font-mono ${className}`} aria-label="Language">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          disabled={isPending}
          aria-current={l === locale}
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
