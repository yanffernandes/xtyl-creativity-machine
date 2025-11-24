import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker production builds
  output: 'standalone',

  // Disable source maps in production for smaller bundle size
  productionBrowserSourceMaps: false,
};

export default nextConfig;
