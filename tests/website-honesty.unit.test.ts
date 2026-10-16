// The public website only describes what the product does today (blueprint: Surfaces;
// Phase 0 section 10). These claims are not true today and must not appear.
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

function tsx(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? tsx(p) : f.endsWith(".tsx") ? [p] : []
  })
}

// The landing sections, the marketing pages (incl. the search-result description) and the root layout.
const copy = [...tsx("src/components/landing"), ...tsx("src/app/(marketing)"), "src/app/layout.tsx"]
  .map((f) => readFileSync(f, "utf8"))
  .join("\n")
  // ignore code comments (source credits mention component names)
  .replace(/\/\/.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")

const FORBIDDEN = [
  /interviews you/i,
  /books real appointments into your calendar/i,
  /about 15 minutes/i,
  /15-minute/i,
  /demo dashboard/i,
  /talk to a demo business/i,
  /live calendar/i,
  /real open times in your calendar/i,
  /escalation/i,
]

for (const pattern of FORBIDDEN) {
  test(`website does not claim: ${pattern}`, () => {
    assert.doesNotMatch(copy, pattern)
  })
}

test('website offers "Sign in" instead of demo links', () => {
  assert.match(copy, />\s*Sign in\s*</)
})
