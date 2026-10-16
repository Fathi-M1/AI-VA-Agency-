// Phase 0 §5: after sign-in, no membership → onboarding; one → that business's Home
// (Today); several → the picker. Old owner links (/today, /settings, …) keep their page.
import assert from "node:assert/strict"
import { test } from "node:test"

import { entryTarget, ownerPage } from "../src/server/auth-gate.ts"

const one = [{ id: "b1" }]
const two = [{ id: "b1" }, { id: "b2" }]

test("no business yet → onboarding", () => {
  assert.equal(entryTarget([], null), "/app/onboarding")
  assert.equal(entryTarget([], "settings"), "/app/onboarding")
})

test("one business → its Today, or the page an old link asked for", () => {
  assert.equal(entryTarget(one, null), "/app/b1/today")
  assert.equal(entryTarget(one, "customers"), "/app/b1/customers")
})

test("several → the picker, remembering the page", () => {
  assert.equal(entryTarget(two, null), "/app/businesses")
  assert.equal(entryTarget(two, "needs-you"), "/app/businesses?to=needs-you")
})

test("only real owner pages are accepted as the page to open", () => {
  for (const p of ["today", "dashboard", "conversations", "needs-you", "agents", "calendar", "customers", "settings"]) {
    assert.equal(ownerPage(p), p)
  }
  for (const bad of [null, "", "../x", "https://evil.example.com", "live", "TODAY"]) assert.equal(ownerPage(bad), null, String(bad))
})
