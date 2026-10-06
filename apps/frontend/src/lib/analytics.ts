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
  reportToStore(event, data);
}

// Searches and WhatsApp clicks also go to our own backend, which keeps daily
// totals for the admin dashboard (insights module) — works with or without
// Umami. keepalive lets the request finish even as the browser leaves for
// WhatsApp. Fire-and-forget: failures are ignored.
function reportToStore(event: AnalyticsEvent, data?: Record<string, string | number>) {
  let body: Record<string, string | number> | null = null;
  if ((event === "search" || event === "search_no_results") && data?.term) {
    body = { type: "search", term: String(data.term), results: Number(data.results ?? 0) };
  } else if (event === "whatsapp_click" && data?.from) {
    body = { type: "whatsapp", source: String(data.from) };
  }
  if (!body) return;
  fetch("/api/backend/insights/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
    credentials: "omit",
  }).catch(() => {});
}
