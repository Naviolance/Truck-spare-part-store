// Navigations that don't start from a link click (the search form, the
// language switch) announce themselves so NavigationSkeleton can show the
// right skeleton while the next page loads.
export const NAVIGATION_START = "tp:navigation-start";

export function announceNavigation(href: string) {
  window.dispatchEvent(new CustomEvent(NAVIGATION_START, { detail: href }));
}
