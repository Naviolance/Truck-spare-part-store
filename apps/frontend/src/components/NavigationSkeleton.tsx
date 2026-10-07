"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { NAVIGATION_START } from "@/lib/navigation-events";
import { CatalogSkeleton, FindMyPartSkeleton, PageSkeleton, ProductPageSkeleton } from "@/components/Skeletons";

// While the next page loads, show a skeleton of THAT page over the content
// area (header and footer stay), instead of a spinner.
//
// Why not Next's loading.tsx? A route-level loading.tsx makes Next stream a
// 200 before the page decides it's a 404, so a deleted product would answer
// "200 + noindex" instead of a real 404 (measured — even for Googlebot).
// Doing it on the client keeps every status code exact.
//
// Starts on: any internal link click (capture phase, before anything else
// runs), or an announceNavigation() call (search form, language switch).
// Ends when the URL actually changes — Next only updates usePathname /
// useSearchParams once the new page has rendered.

const SHOW_AFTER_MS = 120; // prefetched pages arrive faster: no flash
const GIVE_UP_AFTER_MS = 10_000; // never leave it stuck if navigation fails

const LOCALE_PREFIX = /^\/(fr|en)(?=\/|$)/;

function skeletonFor(pathname: string) {
  const path = pathname.replace(LOCALE_PREFIX, "") || "/";
  if (/^\/products\/[^/]+$/.test(path)) return <ProductPageSkeleton />;
  if (path === "/find-my-part") return <FindMyPartSkeleton />;
  if (/^\/(products|categories\/[^/]+|brands\/[^/]+|trucks\/[^/]+(\/[^/]+)?)$/.test(path)) return <CatalogSkeleton />;
  return <PageSkeleton />;
}

export function NavigationSkeleton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Common");
  const [target, setTarget] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // The new page has rendered: hide the skeleton.
  useEffect(() => {
    clearTimers();
    setTarget(null);
  }, [pathname, searchParams]);

  useEffect(() => {
    function start(href: string) {
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname.startsWith("/admin")) return; // different app shell
      // Same page, new query (filters, sort, page, Find My Part's truck,
      // account sections): the page stays and updates in place — catalogs
      // show their own results skeleton (CatalogNav). Covering everything
      // here would look like a full reload.
      if (url.pathname === window.location.pathname) return;
      clearTimers();
      timers.current.push(
        setTimeout(() => {
          setTarget(url.pathname);
          window.scrollTo({ top: 0 });
        }, SHOW_AFTER_MS),
        setTimeout(() => setTarget(null), GIVE_UP_AFTER_MS),
      );
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      start(href);
    }

    const onAnnounce = (e: Event) => start((e as CustomEvent<string>).detail);

    document.addEventListener("click", onClick, true);
    window.addEventListener(NAVIGATION_START, onAnnounce);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAVIGATION_START, onAnnounce);
      clearTimers();
    };
  }, []);

  if (!target) return null;
  return (
    // Opaque at once (the old page must not show through); only the
    // placeholder shapes fade in.
    <div className="absolute inset-0 z-30 overflow-hidden bg-paper" role="status">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="animate-fadeIn">{skeletonFor(target)}</div>
    </div>
  );
}
