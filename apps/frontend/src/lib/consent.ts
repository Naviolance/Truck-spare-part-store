// Analytics cookie consent (only asked when Google Analytics is configured:
// NEXT_PUBLIC_GA_ID). Stored in this browser; "tp:consent" tells the page
// when it changes so analytics can start (or the banner reopen) at once.
export type Consent = "granted" | "denied";

const KEY = "cookie-consent";
export const CONSENT_EVENT = "tp:consent";
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: Consent | null) {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    // Not persisted (private browsing): the banner asks again next visit.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}
