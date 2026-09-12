"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./locales";

export async function setLocaleCookie(locale: Locale) {
  const cookieStore = await cookies();
  // One year - a manual language choice should stick around, not be reset
  // on every browser restart.
  cookieStore.set(LOCALE_COOKIE, locale, { maxAge: 60 * 60 * 24 * 365, path: "/" });
}
