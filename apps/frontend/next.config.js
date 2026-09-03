/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
};

module.exports = nextConfig;
