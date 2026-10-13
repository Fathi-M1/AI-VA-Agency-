import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The business type packs (verticals/*.json) are read from disk at runtime, so make
  // sure every server function on Vercel ships with them.
  outputFileTracingIncludes: {
    "/**": ["./verticals/**/*.json"],
  },
};

export default nextConfig;
