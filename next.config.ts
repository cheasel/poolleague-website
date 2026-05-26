import type { NextConfig } from "next";
import path from "path";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vkxqxvonkyxcowtslnju.supabase.co", 
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  outputFileTracingRoot: path.resolve(__dirname),
};

// Export the merged configuration
export default withBundleAnalyzer(nextConfig);