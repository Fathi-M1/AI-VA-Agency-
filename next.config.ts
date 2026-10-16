import type { NextConfig } from "next";

// Security headers on every route (Phase 0 section 11). Framing: same origin only —
// other sites can't frame any page, but "You're live" may preview the booking page.
// Microphone: same origin only (voice mode in the agent console).
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  // The business type packs (verticals/*.json) are read from disk at runtime, so make
  // sure every server function on Vercel ships with them.
  outputFileTracingIncludes: {
    "/**": ["./verticals/**/*.json"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
