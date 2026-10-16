// The public website only describes what the product does today (blueprint: Surfaces;
// Phase 0 section 10). These claims are not true today and must not appear.
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const dir = "src/components/landing"
const copy = readdirSync(dir)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => readFileSync(join(dir, f), "utf8"))
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
