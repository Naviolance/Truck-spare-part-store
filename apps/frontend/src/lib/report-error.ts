// Report an error to Sentry without putting the SDK in every page's bundle:
// it's loaded on demand (and only when a DSN is configured).
export function reportError(error: unknown) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)).catch(() => {});
}
