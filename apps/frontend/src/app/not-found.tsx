import { AppShell } from "@/components/AppShell";
import { NotFoundContent } from "@/components/NotFoundContent";

// Paths outside any locale (e.g. a mistyped /admin/xyz), in English.
// Localized 404s come from app/[locale]/not-found.tsx.
//
// Deliberately NOT calling setRequestLocale here: Next renders this
// component as part of every page's tree (it's the not-found fallback), and
// setting the request locale to "en" would turn every /fr page English.
export default function GlobalNotFound() {
  return (
    <AppShell locale="en">
      <NotFoundContent locale="en" />
    </AppShell>
  );
}
