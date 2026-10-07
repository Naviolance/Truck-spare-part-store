import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/routing";

// The cart and checkout are one page now (redesign step 4). Old links,
// bookmarks and login ?next=/checkout redirects land on the cart.
export default async function CheckoutRedirect({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  redirect(`/${locale}/cart`);
}
