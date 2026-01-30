import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // beforeFiles rewrites are checked after headers/redirects and before all files
      // including _next/public files which allows overriding page files
      beforeFiles: [
        // Rewrite locale-prefixed API routes to the base /api/* path
        // This handles /nl/api/* -> /api/* and /en/api/* -> /api/*
        {
          source: '/nl/api/:path*',
          destination: '/api/:path*',
        },
        {
          source: '/en/api/:path*',
          destination: '/api/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
