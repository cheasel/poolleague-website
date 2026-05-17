import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // 🛡️ Safe for build: Wipes out the circular structure plugin loop block
    ignoreDuringBuilds: true,
  },
  // This helps Next.js find the correct root when multiple lockfiles exist
  outputFileTracingRoot: __dirname,
};

export default nextConfig;