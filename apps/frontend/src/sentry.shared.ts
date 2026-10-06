// Settings shared by the browser, server and edge Sentry SDKs.
// Off unless NEXT_PUBLIC_SENTRY_DSN is set. Errors only: no performance
// tracing or session replay (quota + JavaScript weight on slow phones).
import type { BrowserOptions } from "@sentry/nextjs";

export const sentryOptions: BrowserOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: 0,
  // Never send cookies, form bodies, or reset tokens in URLs.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpBodies: [],
    urlQueryParams: { deny: ["token"] },
  },
};
