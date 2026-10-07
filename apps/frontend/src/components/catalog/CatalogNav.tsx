"use client";
import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { NAVIGATION_START } from "@/lib/navigation-events";
import { ProductCardSkeleton } from "@/components/Skeletons";

// In-place updates for a catalog: changing a filter, the sort, the page or
// removing a pill only changes the URL's query, so the page stays put
// (no whole-page skeleton, no jump to the top) and only the results area
// shows a skeleton until the server-rendered results arrive.
//
// Covers: links inside the catalog (pagination, pills), the sidebar and the
// sort select (they call go()), and same-page navigations announced from
// elsewhere (the header search on /products). NavigationSkeleton leaves
// same-page navigations alone.

type Nav = { go: (href: string) => void; pending: boolean };
const NavContext = createContext<Nav | null>(null);

export function useCatalogNav(): Nav {
  const router = useRouter();
  return useContext(NavContext) ?? { go: (href) => router.push(href, { scroll: false }), pending: false };
}

export function CatalogNav({ urlKey, className, children }: { urlKey: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname(); // without the locale
  const [inTransition, startTransition] = useTransition();
  const [announced, setAnnounced] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  // New results rendered (the server passes the query it rendered for).
  useEffect(() => setAnnounced(false), [urlKey]);

  useEffect(() => {
    function onAnnounce(e: Event) {
      const url = new URL((e as CustomEvent<string>).detail, window.location.href);
      if (url.pathname === window.location.pathname && url.search !== window.location.search) setAnnounced(true);
    }
    window.addEventListener(NAVIGATION_START, onAnnounce);
    return () => window.removeEventListener(NAVIGATION_START, onAnnounce);
  }, []);
  useEffect(() => {
    if (!announced) return;
    const giveUp = setTimeout(() => setAnnounced(false), 10_000);
    return () => clearTimeout(giveUp);
  }, [announced]);

  const go = (href: string) => startTransition(() => router.push(href, { scroll: false }));

  function onClickCapture(e: React.MouseEvent) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as HTMLElement).closest("a");
    const href = anchor?.getAttribute("href");
    if (!anchor || !href || anchor.target === "_blank") return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
    e.preventDefault();
    // A new page of results starts at the top of the list, not wherever the
    // pagination was.
    if (url.searchParams.get("page") !== new URLSearchParams(window.location.search).get("page")) {
      top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    go(`${pathname}${url.search}`);
  }

  return (
    <NavContext.Provider value={{ go, pending: inTransition || announced }}>
      <div ref={top} onClickCapture={onClickCapture} className={`scroll-mt-[136px] ${className ?? ""}`}>
        {children}
      </div>
    </NavContext.Provider>
  );
}

// The results column: a skeleton while new results load.
export function CatalogResults({ children }: { children: ReactNode }) {
  const { pending } = useCatalogNav();
  if (!pending) return <>{children}</>;
  return (
    <div role="status" aria-busy="true">
      {/* Same grid as CatalogView's results. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
