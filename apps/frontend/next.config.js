const createNextIntlPlugin = require("next-intl/plugin");
const { withSentryConfig } = require("@sentry/nextjs/config");
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Client-side calls (lib/api.ts) hit this same-origin path instead of the
  // backend directly. Without this, the browser sees the auth cookie as
  // coming from a different site (frontend on vercel.app, backend on
  // railway.app) and browsers that block third-party cookies (Safari
  // always, Firefox often, a growing share of Chrome) never store it -
  // login works but silently stops persisting on the very next reload.
  // Routing through Next.js's own server makes the round trip invisible to
  // the browser, so the cookie is scoped to this site's own origin instead.
  // The admin lives outside the /fr|/en locale segment. Any locale-prefixed
  // admin URL (e.g. produced by a locale-aware Link or a ?next= redirect)
  // goes to the real one instead of a 404.
  async redirects() {
    return [{ source: "/:locale(fr|en)/admin/:path*", destination: "/admin/:path*", permanent: false }];
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return [{ source: "/api/backend/:path*", destination: `${backendUrl}/:path*` }];
  },
  // Lets the dev server accept requests for its own assets (HMR, RSC
  // payloads) from your phone's LAN address when testing at
  // http://192.168.1.64:3000 — Next.js will require this explicitly in a
  // future major version, so this is here ahead of that.
  allowedDevOrigins: ["192.168.1.64"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "http", hostname: "localhost" },
      // Your PC's current LAN IP, so the site itself loads when testing from
      // a phone on the same Wi-Fi via http://<lan-ip>:3000.
      { protocol: "http", hostname: "192.168.1.64" },
      // The backend's ngrok tunnel — product images are proxied through the
      // backend, so once NEXT_PUBLIC_API_URL points here, images do too.
      { protocol: "https", hostname: "craftwork-zesty-impulsive.ngrok-free.dev" },
      // Production backend (Railway) — same reasoning as the ngrok entry
      // above, just the real deployed host instead of a dev tunnel.
      { protocol: "https", hostname: "backend-production-1d62.up.railway.app" },
    ],
  },
};

// Sentry: uploads source maps (readable stack traces) only when
// SENTRY_AUTH_TOKEN is set in the build environment; otherwise it just
// wires up error reporting. Tracing code is tree-shaken out to keep the
// browser bundle small.
module.exports = withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
  webpack: { treeshake: { removeDebugLogging: true, removeTracing: true } },
});
