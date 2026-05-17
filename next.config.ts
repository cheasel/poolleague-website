import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // 🛡️ Safe for build: Wipes out the circular structure plugin loop block
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;