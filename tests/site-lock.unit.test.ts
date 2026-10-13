// Unit tests for the emergency site lock (runs with Node's built-in test runner:
// `npm run test:unit`). Node 24 runs TypeScript directly.
import assert from "node:assert/strict"
import { test } from "node:test"

import { hasValidCredentials, isPublicRequest } from "../src/server/site-lock.ts"

const basic = (u: string, p: string) => `Basic ${btoa(`${u}:${p}`)}`

test('only GET/HEAD of "/" is public', () => {
  assert.equal(isPublicRequest("/", "GET", null), true)
  assert.equal(isPublicRequest("/", "HEAD", null), true)
  assert.equal(isPublicRequest("/", "POST", null), false)
  assert.equal(isPublicRequest("/", "POST", "abc123"), false) // server action on "/"
  assert.equal(isPublicRequest("/", "GET", "abc123"), false)
  for (const p of ["/dashboard", "/book/x", "/api/agent", "/setup", "/switch", "/playground", "/today"]) {
    assert.equal(isPublicRequest(p, "GET", null), false, p)
  }
})

test("correct credentials pass", () => {
  assert.equal(hasValidCredentials(basic("owner", "s3cret:with:colons"), "owner", "s3cret:with:colons"), true)
})

test("wrong or malformed credentials fail", () => {
  assert.equal(hasValidCredentials(basic("owner", "nope"), "owner", "s3cret"), false)
  assert.equal(hasValidCredentials(basic("other", "s3cret"), "owner", "s3cret"), false)
  assert.equal(hasValidCredentials(null, "owner", "s3cret"), false)
  assert.equal(hasValidCredentials("Bearer abc", "owner", "s3cret"), false)
  assert.equal(hasValidCredentials("Basic !!!not-base64", "owner", "s3cret"), false)
  assert.equal(hasValidCredentials(`Basic ${btoa("no-colon")}`, "owner", "s3cret"), false)
})

test("fails closed when the env vars are missing", () => {
  assert.equal(hasValidCredentials(basic("", ""), undefined, undefined), false)
  assert.equal(hasValidCredentials(basic("owner", "s3cret"), "owner", undefined), false)
  assert.equal(hasValidCredentials(basic("owner", "s3cret"), undefined, "s3cret"), false)
  assert.equal(hasValidCredentials(basic("", ""), "", ""), false)
})
