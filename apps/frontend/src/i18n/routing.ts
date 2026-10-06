import { defineRouting } from "next-intl/routing";

// Every public page lives under /fr/... or /en/... so each language has its
// own URL that search engines can index and people can share. French is the
// default (used for "/" when the browser's language is unknown, e.g.
// crawlers): most of Cameroon, and Douala especially, reads French first.
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
