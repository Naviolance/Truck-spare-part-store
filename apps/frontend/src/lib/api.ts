const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

type FetchOptions = RequestInit & { skipAuth?: boolean };

// Only /auth/refresh and /auth/logout actually check this, but attaching it
// everywhere is harmless and keeps this file the one place that knows about
// cookie names — reads the non-httpOnly CSRF cookie the backend sets
// alongside the refresh cookie, so a cross-site page (which can't read our
// cookies) can never produce a matching header.
function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiFetch(path: string, options: FetchOptions = {}) {
  const headers = new Headers(options.headers);

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