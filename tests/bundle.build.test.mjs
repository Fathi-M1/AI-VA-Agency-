// Security test 7 (Phase 0 §12): no server secret reaches the browser. Run after a build
// made with marker values, so a leak is detectable even without the real keys:
//   SUPABASE_SERVICE_ROLE_KEY=bundle-test-service-role-marker GROQ_API_KEY=bundle-test-groq-marker npx next build
//   npm run test:bundle
import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const STATIC = ".next/static"

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : [p]
  })
}

test("the browser bundle contains no server secret or its variable name", () => {
  assert.ok(existsSync(STATIC), "run next build first")
  const leaks = []
  for (const f of files(STATIC).filter((f) => /\.(js|css|html|json|map)$/.test(f))) {
    const src = readFileSync(f, "utf8")
    for (const s of ["bundle-test-service-role-marker", "bundle-test-groq-marker", "SUPABASE_SERVICE_ROLE_KEY", "GROQ_API_KEY", "CALCOM_API_KEY", "SITE_LOCK_PASSWORD"]) {
      if (src.includes(s)) leaks.push(`${f}: ${s}`)
    }
  }
  assert.deepEqual(leaks, [])
})
