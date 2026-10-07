"use client";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "@/i18n/navigation";

// For account-only pages (cart, checkout, orders, account): a logged-out
// visitor is sent to log in and brought straight back afterwards, instead
// of seeing a misleading "your cart is empty" / "no orders yet".
// `ready` is false until we know the user is logged in — render a loader.
export function useRequireAuth() {
  const { user, loading, loggedOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Logged out on purpose: logout() is already taking them home.
    if (loading || user || loggedOut) return;
    const next = `${pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [loading, user, loggedOut, pathname, router]);

  return { user, ready: !loading && !!user };
}
