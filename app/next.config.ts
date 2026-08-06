import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PostHog ingest is proxied through /ingest so ad blockers that filter
  // *.posthog.com don't drop our events. Keep skipTrailingSlashRedirect
  // set — the /ingest rewrites break if Next auto-appends a slash.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ];
  },
};

export default nextConfig;
