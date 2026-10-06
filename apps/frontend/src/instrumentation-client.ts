import { sentryOptions } from "./sentry.shared";

// Browser errors -> Sentry, loaded LAZILY: the SDK is ~37 kB of JavaScript,
// which every visitor on a slow mobile connection would otherwise download
// before the page is usable. It starts when the browser is idle after load
// (missing an error in the first second is an acceptable trade), and isn't
// fetched at all when no DSN is configured.
if (sentryOptions.enabled && typeof window !== "undefined") {
  const start = () =>
    import("@sentry/nextjs").then((Sentry) =>
      Sentry.init({
        ...sentryOptions,
        // Noise from browser extensions and flaky mobile networks, not our bugs.
        ignoreErrors: ["ResizeObserver loop", "Non-Error promise rejection captured", "Load failed", "NetworkError when attempting to fetch resource"],
        denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],
      }),
    );
  if ("requestIdleCallback" in window) window.requestIdleCallback(() => start(), { timeout: 5000 });
  else setTimeout(start, 3000);
}
