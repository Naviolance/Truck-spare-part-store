import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { NotFoundContent } from "@/components/NotFoundContent";

// Paths outside any locale (e.g. a mistyped /admin/xyz). Localized 404s
// come from app/[locale]/not-found.tsx.
export default function GlobalNotFound() {
  setRequestLocale("en");
  return (
    <AppShell locale="en">
      <NotFoundContent />
    </AppShell>
  );
}
