"use client";
import { useEffect, useState, type ReactNode } from "react";

// Phones only: price + actions pinned to the bottom of the screen while the
// page's own buy buttons (#targetId) are out of view, so "add to cart" is always
// one tap away without showing two of them at once. Without JavaScript it
// never shows — the buy box in the page still works.
export function StickyBuyBar({ targetId, children }: { targetId: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    // The site header (Navbar) is pinned to the top: buttons hidden under it
    // count as out of view.
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    const covered = header ? header.offsetHeight : 0;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      rootMargin: `-${covered}px 0px 0px 0px`,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <div
      // inert keeps the hidden bar's buttons out of the tab order.
      inert={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 transition-transform duration-200 lg:hidden print:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      {children}
    </div>
  );
}
