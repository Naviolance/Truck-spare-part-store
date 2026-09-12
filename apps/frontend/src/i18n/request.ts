import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE, pickLocaleFromAcceptLanguage } from "./locales";

// No URL prefix (no /en/, /fr/) - locale is resolved per-request instead of
// via routing. A manual choice (LanguageSwitcher) is remembered in the
// `locale` cookie; absent that, we auto-detect from the browser's
// Accept-Language header so a first-time visitor in Cameroon sees French
// or English without having to ask.
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : pickLocaleFromAcceptLanguage((await headers()).get("accept-language"));

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

export { defaultLocale };
