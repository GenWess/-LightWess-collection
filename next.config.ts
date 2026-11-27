import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Navigation fluide : une page déjà visitée ou préchargée se réaffiche tout de suite
  // (elle est rafraîchie dès qu'on modifie quelque chose).
  experimental: { staleTimes: { dynamic: 30, static: 60 } },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.igdb.com" },
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "shared.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
