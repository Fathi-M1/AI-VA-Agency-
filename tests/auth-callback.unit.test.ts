// Blueprint F1 edge cases for Google sign-in: cancelled → back to the website with
// "Sign-in was cancelled."; other failures → sign-in page with a retry message;
// success → the page they wanted (inside the app only).
import assert from "node:assert/strict"
import { test } from "node:test"

import { callbackStep } from "../src/server/auth-gate.ts"

const params = (q: string) => new URLSearchParams(q)

test("cancelled at Google → the website says sign-in was cancelled", () => {
  assert.deepEqual(callbackStep(params("error=access_denied&error_description=The+user+denied")), { redirect: "/?signin=cancelled" })
})

test("another error → back to sign-in with a retry message", () => {
  assert.deepEqual(callbackStep(params("error=server_error")), { redirect: "/sign-in?error=failed" })
  assert.deepEqual(callbackStep(params("")), { redirect: "/sign-in?error=failed" }, "no code at all")
})

test("a code → exchange it, then go to the page they wanted (never another site)", () => {
  assert.deepEqual(callbackStep(params("code=abc&next=%2Fapp%2Fx%2Ftoday")), { exchange: "abc", next: "/app/x/today" })
  assert.deepEqual(callbackStep(params("code=abc&next=https%3A%2F%2Fevil.example.com")), { exchange: "abc", next: "/app" })
})
