export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

// Picks the best supported locale out of a raw `Accept-Language` header
// value (e.g. "fr-CA,fr;q=0.9,en;q=0.8") - we only ever offer en/fr, so
// this just walks the header's preference order and takes the first match.
export function pickLocaleFromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;
  const preferred = header
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase().slice(0, 2));
  for (const lang of preferred) {
    if (isLocale(lang)) return lang;
  }
  return defaultLocale;
}
