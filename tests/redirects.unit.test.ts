// Old owner links keep working after the renames (Phase 0 §8) and the move under /app
// (Phase 0 §4); old ticket links by reference code do not open anything (tickets open by
// private token only).
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { test } from "node:test"

import config from "../next.config.ts"

async function rules() {
  assert.ok(config.redirects, "next.config.ts must define redirects()")
  const list = await config.redirects()
  return Object.fromEntries(list.map((r) => [r.source, r.destination]))
}

test("old owner pages go to /app, keeping the page they were for", async () => {
  const map = await rules()
  for (const p of ["today", "dashboard", "conversations", "customers", "needs-you", "calendar", "agents", "settings"]) {
    assert.equal(map[`/${p}`], `/app?to=${p}`, p)
  }
})

test("renamed pages go to their new names inside /app", async () => {
  const map = await rules()
  assert.equal(map["/contacts"], "/app?to=customers")
  assert.equal(map["/escalations"], "/app?to=needs-you")
})

test("setup, the demo switcher and the playground moved", async () => {
  const map = await rules()
  assert.equal(map["/setup"], "/app/onboarding")
  assert.equal(map["/setup/live"], "/app")
  assert.equal(map["/switch"], "/app/businesses")
  assert.equal(map["/playground"], "/console")
})

test("tickets live at /book/[slug]/t/[token]; the old /r/[code] route is gone", () => {
  assert.ok(existsSync("src/app/book/[slug]/t/[token]/page.tsx"))
  assert.equal(existsSync("src/app/book/[slug]/r"), false)
})
