"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A site-wide "something is happening" indicator for every internal link
// click, regardless of which page or section it's on — the App Router has
// no built-in navigation-start/end events (unlike the old Pages Router), so
// this fakes one: a capture-phase click listener fires the instant any
// internal link is clicked (before the browser/React has done anything),
// and usePathname()/useSearchParams() changing is the reliable signal that
// the new page has actually landed, since Next only updates them once the
// transition commits.
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const safetyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the very first run — this effect firing on mount isn't a
    // navigation completing, it's just the initial page load.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setVisible(false);
    if (safetyTimeout.current) clearTimeout(safetyTimeout.current);
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setVisible(true);
      // Safety net: prefetched/cached navigations can be instant enough
      // that the pathname-change effect never gets a visible frame to
      // clear this — and if navigation genuinely fails, nothing else would
      // ever turn the bar off. Never leave it stuck either way.
      if (safetyTimeout.current) clearTimeout(safetyTimeout.current);
      safetyTimeout.current = setTimeout(() => setVisible(false), 4000);
    }

    // Capture phase: fires before any component's own onClick (e.g. a
    // product card's Link) can call preventDefault or start its own logic.
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-zinc-200 overflow-hidden" aria-hidden="true">
      <div className="h-full w-1/3 bg-zinc-900 animate-navProgress" />
    </div>
  );
}
