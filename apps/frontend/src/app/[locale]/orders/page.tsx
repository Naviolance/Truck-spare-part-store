import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/routing";

// Orders live in the "Mon compte" hub now (redesign step 5); old links,
// bookmarks and login ?next=/orders land there. Order pages stay at
// /orders/<id>.
export default async function OrdersRedirect({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  redirect(`/${locale}/account`);
}
