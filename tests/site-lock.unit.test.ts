// Unit tests for the emergency site lock (runs with Node's built-in test runner:
// `npm run test:unit`). Node 24 runs TypeScript directly.
import assert from "node:assert/strict"
import { test } from "node:test"

import { asksForPassword, hasValidCredentials, isPublicRequest } from "../src/server/site-lock.ts"

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

// The password box only pops up when someone opens a locked page. Background loads (link
// prefetch, page data for client navigation, scripts) get a plain 401 with no prompt, so
// the public landing page never shows a password box just because it links to /sign-in.
test("only a real page visit is asked for the password", () => {
  const h = (o: Record<string, string>) => new Headers(o)
  assert.equal(asksForPassword(h({ "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" })), true)
  assert.equal(asksForPassword(h({})), true, "curl and old browsers send no fetch metadata")
  assert.equal(asksForPassword(h({ "sec-fetch-mode": "cors", rsc: "1", "next-router-prefetch": "1" })), false, "link prefetch")
  assert.equal(asksForPassword(h({ "sec-fetch-mode": "cors", rsc: "1" })), false, "client navigation data")
  assert.equal(asksForPassword(h({ "sec-fetch-mode": "navigate", rsc: "1" })), false)
  assert.equal(asksForPassword(h({ "sec-fetch-mode": "no-cors", "sec-fetch-dest": "image" })), false)
  assert.equal(asksForPassword(h({ purpose: "prefetch" })), false)
})
