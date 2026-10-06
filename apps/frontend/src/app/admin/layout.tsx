import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_LOCALE_COOKIE, isAdminLocale, localeFromAcceptLanguage } from "@/lib/admin-locale";

// Never indexed (robots.txt also disallows it).
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | TruckParts admin" },
  robots: { index: false, follow: false },
};

// French or English: the saved choice (lib/admin-locale.ts), else the
// browser's language. Strings live under "Admin*" in messages/{en,fr}.json.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const saved = (await cookies()).get(ADMIN_LOCALE_COOKIE)?.value;
  const locale = isAdminLocale(saved) ? saved : localeFromAcceptLanguage((await headers()).get("accept-language"));
  setRequestLocale(locale);
  return (
    <AppShell locale={locale} storefront={false}>
      <AdminShell>{children}</AdminShell>
    </AppShell>
  );
}
