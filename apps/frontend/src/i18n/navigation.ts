import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware drop-ins for next/link and next/navigation: <Link href="/products">
// renders /fr/products or /en/products depending on the current page's
// language. Public pages must use these, not next/link, or links lose the locale.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
