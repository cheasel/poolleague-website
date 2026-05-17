import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
  output: "standalone",
  // Limits file tracing to this project (avoids scanning parent dirs on Windows).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;