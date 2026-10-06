// The admin panel's language. Not in the URL like the storefront's (/fr,
// /en): the admin is private and noindex, so a remembered preference is
// enough. Read on the server by app/admin/layout.tsx; set by the EN/FR
// switch in components/admin/AdminShell.tsx.
export const ADMIN_LOCALE_COOKIE = "admin_locale";
export const ADMIN_LOCALES = ["fr", "en"] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];

export function isAdminLocale(value: string | undefined): value is AdminLocale {
  return value === "fr" || value === "en";
}

// No preference yet: the browser's first language decides.
export function localeFromAcceptLanguage(header: string | null): AdminLocale {
  return /^\s*fr\b/i.test(header ?? "") ? "fr" : "en";
}
