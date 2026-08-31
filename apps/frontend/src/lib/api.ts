const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

type FetchOptions = RequestInit & { skipAuth?: boolean };

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

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}