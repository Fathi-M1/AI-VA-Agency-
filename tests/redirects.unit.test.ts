// Old owner links keep working after the renames (Phase 0 §8); old ticket links by
// reference code do not open anything (tickets open by private token only).
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { test } from "node:test"

import config from "../next.config.ts"

test("old owner paths redirect to their new names", async () => {
  assert.ok(config.redirects, "next.config.ts must define redirects()")
  const rules = await config.redirects()
  const map = Object.fromEntries(rules.map((r) => [r.source, r.destination]))
  assert.equal(map["/contacts"], "/customers")
  assert.equal(map["/escalations"], "/needs-you")
})

test("tickets live at /book/[slug]/t/[token]; the old /r/[code] route is gone", () => {
  assert.ok(existsSync("src/app/book/[slug]/t/[token]/page.tsx"))
  assert.equal(existsSync("src/app/book/[slug]/r"), false)
})
