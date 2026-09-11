/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig;
