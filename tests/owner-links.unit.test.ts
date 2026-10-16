// Phase 0 §4/§6: owner pages live under /app/[businessId]/…, so every owner link and
// redirect goes through appPath(businessId, "/page"), useAppPath()'s toApp("/page") or
// <AppLink to="/page"> (which adds
// the business from the URL). Old top-level paths only appear in next.config.ts redirects.
import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

import { appPath } from "../src/lib/app-path.ts"

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : []
  })
}

const OLD = /["'`]\/(today|dashboard|conversations|customers|needs-you|calendar|agents|settings|setup|playground|switch)(?=["'`/?#])/g
const VIA_HELPER = /(?:\bto=\{?`?|\bto:\s*|appPath\([^()]*,\s*|toApp\()$/

test("appPath puts the business in the URL", () => {
  assert.equal(appPath("abc", "/today"), "/app/abc/today")
  assert.equal(appPath("abc", "/conversations?open=1"), "/app/abc/conversations?open=1")
})

test("no hardcoded old owner paths outside appPath / AppLink", () => {
  const bad: string[] = []
  for (const f of files("src")) {
    const src = readFileSync(f, "utf8")
    for (const m of src.matchAll(OLD)) {
      const before = src.slice(Math.max(0, m.index - 40), m.index)
      if (!VIA_HELPER.test(before)) bad.push(`${f}:${src.slice(0, m.index).split("\n").length} ${m[0]}`)
    }
  }
  assert.deepEqual(bad, [])
})

test("the demo switcher and the business cookie are gone", () => {
  assert.equal(existsSync("src/app/(app)/switch"), false)
  assert.equal(existsSync("src/server/tenant.ts"), false)
  for (const f of files("src")) {
    const src = readFileSync(f, "utf8")
    assert.doesNotMatch(src, /Switch business \(demo\)|BUSINESS_COOKIE|getCurrentBusinessId|dev switcher/, f)
  }
})
