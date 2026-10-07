import { request, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { API_URL, INTERNAL_API_KEY } from "./env";

const internal = INTERNAL_API_KEY ? { "x-internal-api-key": INTERNAL_API_KEY } : {};

// Logs a browser context in through the API: the session cookie lands in the
// context, so its pages start logged in (AuthContext restores the session
// from it on load). Faster than the login form, and not rate-limited.
export async function loginAs(context: BrowserContext, user: { email: string; password: string }) {
  const res = await context.request.post(`${API_URL}/auth/login`, { data: user, headers: internal });
  if (!res.ok()) throw new Error(`login ${user.email}: ${res.status()} ${await res.text()}`);
}

// A small authenticated API client (Bearer token) for creating and cleaning
// up test data.
export async function apiAs(user: { email: string; password: string }) {
  const ctx: APIRequestContext = await request.newContext({ baseURL: API_URL, extraHTTPHeaders: internal });
  const res = await ctx.post("/auth/login", { data: user });
  if (!res.ok()) throw new Error(`login ${user.email}: ${res.status()} ${await res.text()}`);
  const { accessToken } = await res.json();
  const auth = { ...internal, authorization: `Bearer ${accessToken}` };
  const call = async (method: "GET" | "POST" | "PATCH" | "DELETE", path: string, data?: unknown) => {
    const r = await ctx.fetch(path, { method, data, headers: auth });
    if (!r.ok()) throw new Error(`${method} ${path}: ${r.status()} ${await r.text()}`);
    return r.status() === 204 ? null : r.json().catch(() => null);
  };
  return {
    get: (path: string) => call("GET", path),
    post: (path: string, data?: unknown) => call("POST", path, data),
    patch: (path: string, data?: unknown) => call("PATCH", path, data),
    delete: (path: string) => call("DELETE", path),
    dispose: () => ctx.dispose(),
  };
}
