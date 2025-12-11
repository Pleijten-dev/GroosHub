import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Enable larger request bodies for file uploads
  experimental: {
    // Increase body size limit for API routes
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  // Increase serverExternalPackages for Node.js compatibility
  serverExternalPackages: ['@aws-sdk/client-s3'],
};

export default nextConfig;
