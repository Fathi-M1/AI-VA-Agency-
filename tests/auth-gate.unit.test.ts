// Phase 0 §4 and security test 1: signed-out visitors on any /app page go to /sign-in,
// then come back to the page they wanted. `next` can only point inside this app.
import assert from "node:assert/strict"
import { test } from "node:test"

import { needsSignIn, safeNext, signInPath } from "../src/server/auth-gate.ts"

test("every /app page and the builder console need a session", () => {
  for (const p of ["/app", "/app/", "/app/businesses", "/app/onboarding", "/app/abc/today", "/console"]) {
    assert.equal(needsSignIn(p), true, p)
  }
})

test("the website, sign-in, the booking page and tickets don't", () => {
  for (const p of ["/", "/sign-in", "/auth/callback", "/book/cruz", "/book/cruz/t/abc", "/application", "/apps"]) {
    assert.equal(needsSignIn(p), false, p)
  }
})

test("sign-in remembers the page they wanted", () => {
  assert.equal(signInPath("/app/abc/today", "?open=1"), "/sign-in?next=%2Fapp%2Fabc%2Ftoday%3Fopen%3D1")
  assert.equal(signInPath("/app", ""), "/sign-in?next=%2Fapp")
})

test("next only ever points inside the app", () => {
  assert.equal(safeNext("/app/abc/today?open=1"), "/app/abc/today?open=1")
  assert.equal(safeNext("/console"), "/console")
  for (const bad of [null, "", "https://evil.example.com", "//evil.example.com", "/\\evil.example.com", "/book/x", "javascript:alert(1)", "/app\\..\\x"]) {
    assert.equal(safeNext(bad), "/app", String(bad))
  }
})
