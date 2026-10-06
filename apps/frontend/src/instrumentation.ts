import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.shared";

// Server-side errors (rendering, route handlers, middleware) -> Sentry.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(sentryOptions);
  }
}

// Next 15 hook: reports errors thrown while rendering a request.
export const onRequestError = Sentry.captureRequestError;
