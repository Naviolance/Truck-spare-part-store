// Business events sent to Umami (see components/Analytics.tsx). These are
// the numbers that say whether the site produces customers: what people
// search for, what finds nothing, and how they get in touch.
//
// Never put personal data in event properties (names, phone numbers,
// emails) — only things like a product slug or a search term.
export type AnalyticsEvent =
  | "search"
  | "search_no_results"
  | "whatsapp_click"
  | "part_request_submitted"
  | "add_to_cart"
  | "checkout_started"
  | "order_placed";

type Umami = { track: (event: string, data?: Record<string, string | number>) => void };

export function track(event: AnalyticsEvent, data?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  try {
    (window as unknown as { umami?: Umami }).umami?.track(event, data);
  } catch {
    // Analytics must never break the page.
  }
}
