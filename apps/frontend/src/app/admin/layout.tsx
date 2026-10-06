import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { AdminShell } from "@/components/admin/AdminShell";

// Never indexed (robots.txt also disallows it); English-only.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | TruckParts admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  setRequestLocale("en");
  return (
    <AppShell locale="en" storefront={false}>
      <AdminShell>{children}</AdminShell>
    </AppShell>
  );
}
