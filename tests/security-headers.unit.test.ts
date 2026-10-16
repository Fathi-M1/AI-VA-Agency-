// Security headers on every route (Phase 0 section 11).
import assert from "node:assert/strict"
import { test } from "node:test"

import config from "../next.config.ts"

async function headersFor(path: string) {
  assert.ok(config.headers, "next.config.ts must define headers()")
  const rules = await config.headers()
  const out: Record<string, string> = {}
  for (const rule of rules) {
    const re = new RegExp("^" + rule.source.replace("/:path*", "(?:/.*)?") + "$")
    if (re.test(path)) for (const h of rule.headers) out[h.key.toLowerCase()] = h.value
  }
  return out
}

for (const path of ["/", "/dashboard", "/book/some-business", "/api/agent"]) {
  test(`security headers on ${path}`, async () => {
    const h = await headersFor(path)
    // No framing by other sites (same-origin allowed: "You're live" previews the booking page).
    assert.equal(h["x-frame-options"], "SAMEORIGIN")
    const csp = h["content-security-policy"] ?? ""
    for (const directive of ["frame-ancestors 'self'", "base-uri 'self'", "object-src 'none'", "form-action 'self'"]) {
      assert.ok(csp.includes(directive), `CSP missing ${directive}`)
    }
    assert.equal(h["x-content-type-options"], "nosniff")
    assert.equal(h["referrer-policy"], "strict-origin-when-cross-origin")
    const pp = h["permissions-policy"] ?? ""
    for (const p of ["camera=()", "geolocation=()", "microphone=(self)"]) assert.ok(pp.includes(p), `Permissions-Policy missing ${p}`)
  })
}
