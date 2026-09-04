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
type RefreshResult = { ok: boolean; user: unknown | null };

let refreshPromise: Promise<RefreshResult> | null = null;

const REFRESH_MAX_ATTEMPTS = 3;
const REFRESH_RETRY_DELAY_MS = 800;

// A single failed refresh call proves almost nothing: the backend's /auth/
// refresh returns the SAME generic 401 for "no cookie", "30-day cap passed",
// "15+ min inactive", AND "this exact cookie was just rotated by another
// near-simultaneous call" (see auth.service.ts's touchSession) — that last
// one is a real, benign race two tabs (or a mount effect + the activity
// heartbeat) can trigger on the SAME device: one call wins and rotates the
// cookie, the other arrives a beat later and is rejected even though the
// session is completely fine. A network hiccup, a 429 (rate-limited, not
// invalid), or a flaky 500 tell us even less. Only a 401 that's STILL
// happening after a few retries is treated as a real, final "you're logged
// out" — everything else is assumed innocent and retried quietly.
async function attemptRefresh(attempt: number): Promise<RefreshResult> {
  const csrfToken = getCsrfToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { ...NGROK_BYPASS_HEADERS, ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
    });
  } catch {
    // Couldn't even reach the server — says nothing about session validity.
    if (attempt < REFRESH_MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, REFRESH_RETRY_DELAY_MS));
      return attemptRefresh(attempt + 1);
    }
    return { ok: false, user: null };
  }

  if (res.ok) {
    const data = await res.json();
    setAccessToken(data.accessToken);
    return { ok: true, user: data.user ?? null };
  }

  if (attempt < REFRESH_MAX_ATTEMPTS) {
    await new Promise((r) => setTimeout(r, REFRESH_RETRY_DELAY_MS));
    return attemptRefresh(attempt + 1);
  }

  // Retries exhausted. 401 is the endpoint's own "these credentials are no
  // good" signal. 403 (CSRF mismatch) gets the same treatment here, but only
  // AFTER retries: a same-device race would have resolved itself within the
  // couple of seconds those retries took, so a 403 that's STILL happening
  // isn't transient — it's a cookie that will never self-correct (e.g. a
  // stale csrf_token left over from before a cookie-handling change). The
  // only way out of that is a fresh login, which overwrites it with a
  // matching pair — so treat it as a real logout instead of leaving the user
  // stuck logged-out-but-never-shown-the-login-screen. A 429/5xx or network
  // error still doesn't touch anything — those are just as likely to be a
  // slow server as a real problem.
  if (res.status === 401 || res.status === 403) {
    setAccessToken(null);
    onSessionExpired?.();
  }
  return { ok: false, user: null };
}

// Resolves with the user row the backend already looked up while rotating
// the session (see auth.service.ts's touchSession) — callers that need the
// current user can use it directly instead of following up with their own
// GET /users/me, which would just re-fetch the same row a moment later.
export function refreshSession(): Promise<RefreshResult> {
  if (!refreshPromise) {
    refreshPromise = attemptRefresh(1).finally(() => {
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
    const { ok } = await refreshSession();
    if (ok) {
      return rawFetch(path, { ...options, _retried: true });
    }
  }

  return res;
}
