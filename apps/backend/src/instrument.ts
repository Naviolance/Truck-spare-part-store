import * as Sentry from "@sentry/node";

// Error monitoring (Sentry). Imported FIRST in main.ts so it can hook into
// http/express before they load. Off unless SENTRY_DSN is set (a real env
// var, e.g. on Railway — the .env file isn't read until later).
//
// Errors only (tracesSampleRate 0): performance tracing would burn the free
// tier's quota and isn't needed at launch.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    tracesSampleRate: 0,
    // Sentry 11 collects request bodies, cookies and all headers by default.
    // Bodies here contain passwords and phone numbers, so collect only what
    // helps debugging. (beforeSend below is a second line of defence.)
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpBodies: [],
      httpHeaders: { request: { allow: ["user-agent", "referer", "content-type", "accept-language"] }, response: false },
      urlQueryParams: { deny: ["token"] },
    },
    // Never ship credentials or form contents (passwords, phone numbers) to
    // a third party, even when a request that carried them crashes.
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
          delete event.request.headers["x-internal-api-key"];
          delete event.request.headers["x-csrf-token"];
        }
      }
      return event;
    },
  });
}
