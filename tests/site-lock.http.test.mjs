// HTTP tests for the emergency site lock, against a running site:
//   BASE_URL=http://localhost:3100 SITE_LOCK_USER=… SITE_LOCK_PASSWORD=… EXPECT_PRODUCTION=1 npm run test:lock
// Works against the deployed URL too. Credentials come from env vars, never the repo.
import assert from "node:assert/strict"
import { test } from "node:test"

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "")
const USER = process.env.SITE_LOCK_USER
const PASS = process.env.SITE_LOCK_PASSWORD
const PRODUCTION = process.env.EXPECT_PRODUCTION === "1"
const auth = USER && PASS ? { Authorization: `Basic ${btoa(`${USER}:${PASS}`)}` } : {}

const get = (path, headers = {}) => fetch(BASE + path, { headers, redirect: "manual" })
const post = (path, headers = {}, body = "{}") =>
  fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body, redirect: "manual" })

test('"/" stays public', async () => {
  const res = await get("/")
  assert.equal(res.status, 200)
})

test("anonymous requests are locked (401)", async () => {
  for (const path of ["/dashboard", "/book/any-business", "/setup", "/switch", "/playground", "/today"]) {
    const res = await get(path)
    assert.equal(res.status, 401, path)
    assert.match(res.headers.get("www-authenticate") ?? "", /^Basic /, path)
  }
  assert.equal((await post("/api/agent")).status, 401, "/api/agent")
})

test("anonymous server action calls are locked (401), including on /", async () => {
  // A server action is a POST to any page path with a Next-Action header.
  for (const path of ["/settings", "/"]) {
    const res = await post(path, { "Next-Action": "0000000000000000000000000000000000000000", "Content-Type": "text/plain;charset=UTF-8" }, "[]")
    assert.equal(res.status, 401, path)
  }
})

test("wrong credentials are locked (401)", async () => {
  const res = await get("/dashboard", { Authorization: `Basic ${btoa("wrong:wrong")}` })
  assert.equal(res.status, 401)
})

test("correct credentials open owner and booking pages", { skip: !USER || !PASS ? "SITE_LOCK_USER/PASSWORD not set" : false }, async () => {
  assert.equal((await get("/dashboard", auth)).status, 200, "/dashboard")
  assert.equal((await get("/book/any-business", auth)).status, 200, "/book/any-business")
})

test("disabled in production even after unlocking (404)", { skip: !PRODUCTION || !USER ? "production checks off" : false }, async () => {
  assert.equal((await post("/api/agent", auth)).status, 404, "/api/agent")
  assert.equal((await post("/api/setup", auth)).status, 404, "/api/setup")
  assert.equal((await get("/switch", auth)).status, 404, "/switch")
})
