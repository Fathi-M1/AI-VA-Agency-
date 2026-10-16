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
  // Old owner links keep working: owner pages moved under /app/[businessId]/… (Phase 0 §4)
  // and two were renamed (§8). /app picks the business and keeps the page (?to=).
  // Not permanent, so browsers don't cache them while the app is still taking shape.
  async redirects() {
    const pages = ["today", "dashboard", "conversations", "customers", "needs-you", "calendar", "agents", "settings"];
    return [
      ...pages.map((p) => ({ source: `/${p}`, destination: `/app?to=${p}`, permanent: false })),
      { source: "/contacts", destination: "/app?to=customers", permanent: false },
      { source: "/escalations", destination: "/app?to=needs-you", permanent: false },
      { source: "/setup", destination: "/app/onboarding", permanent: false },
      { source: "/setup/live", destination: "/app", permanent: false },
      { source: "/switch", destination: "/app/businesses", permanent: false },
      { source: "/playground", destination: "/console", permanent: false },
    ];
  },
};

export default nextConfig;
