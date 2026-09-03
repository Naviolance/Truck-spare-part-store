const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// When NEXT_PUBLIC_API_URL points at an ngrok tunnel (phone testing over
// LAN — see apps/frontend/.env.local), ngrok's free tier shows a browser
// warning interstitial (no CORS headers) to any request with a real browser
// User-Agent. This header opts every request out of that page. Harmless
// against a plain localhost backend, which just ignores the unknown header.
const NGROK_BYPASS_HEADERS = { "ngrok-skip-browser-warning": "true" };

// For unauthenticated GET calls made directly from client components
// (product listings, filters, vehicle lookups) instead of going through
// apiFetch — same API_URL + ngrok-bypass handling, without the auth/CSRF
// machinery those don't need.
export function publicFetch(path: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...NGROK_BYPASS_HEADERS, ...init.headers },
  });
}

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// AuthContext registers this once so it can clear its `user` state the
// moment a refresh definitively fails — which can happen reactively, deep
// inside some unrelated page's apiFetch call, long after the initial mount.
export function onSessionExpire(callback: () => void) {
  onSessionExpired = callback;
}

// Reads the non-httpOnly CSRF cookie the backend sets alongside the refresh
// cookie — see auth.controller.ts for why this exists and why it must be
// path: "/" to ever be visible here.
function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Single-flight, module-level (not per-component) — every caller shares the
// SAME in-flight request, whether it's AuthContext restoring the session on
// mount, the activity heartbeat, or some deep API call retrying after a 401.
// The backend session token doesn't rotate (see auth.service.ts), so there's
// no correctness reason for this beyond avoiding redundant round trips when
// several callers happen to want a fresh access token at once.
let refreshPromise: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const csrfToken = getCsrfToken();
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { ...NGROK_BYPASS_HEADERS, ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
      });

      if (!res.ok) {
        setAccessToken(null);
        onSessionExpired?.();
        return false;
      }

      const data = await res.json();
      setAccessToken(data.accessToken);
      return true;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

type FetchOptions = RequestInit & { skipAuth?: boolean; _retried?: boolean };

async function rawFetch(path: string, options: FetchOptions) {
  const headers = new Headers(options.headers);
  headers.set("ngrok-skip-browser-warning", "true");

  // Only force JSON content-type when we're NOT sending a file (FormData).
  // FormData needs the browser to set its own multipart boundary automatically —
  // setting Content-Type manually here breaks file uploads.
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!options.skipAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const csrfToken = getCsrfToken();
  if (csrfToken) headers.set("X-CSRF-Token", csrfToken);

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}

export async function apiFetch(path: string, options: FetchOptions = {}) {
  const res = await rawFetch(path, options);

  // The access token is short-lived on purpose (see auth.module.ts) — this
  // is what makes a 401 here just "time to check in," not "you're logged
  // out." Silently refresh and retry once. Never do this for /auth/* calls
  // themselves (would recurse) or a request that already retried once (a
  // second 401 means the refresh token itself is gone — genuinely expired
  // from real inactivity, which is the one case this should NOT paper over).
  const isAuthEndpoint = path.startsWith("/auth/");
  if (res.status === 401 && !options.skipAuth && !isAuthEndpoint && !options._retried) {
    const restored = await refreshSession();
    if (restored) {
      return rawFetch(path, { ...options, _retried: true });
    }
  }

  return res;
}
