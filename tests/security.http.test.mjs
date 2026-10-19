// Security test 1 (Phase 0 §12) against a running site, signed out (no session cookie):
//   BASE_URL=http://localhost:3100 npm run test:security-http
// Owner pages must redirect a signed-out visitor to /sign-in.
import assert from "node:assert/strict"
import { test } from "node:test"

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "")
const get = (path) => fetch(BASE + path, { redirect: "manual" })

const OWNER_PAGES = [
  "/app",
  "/app/businesses",
  "/app/onboarding",
  "/app/aaaaaaaa-0000-4000-8000-000000000001/today",
  "/app/aaaaaaaa-0000-4000-8000-000000000001/settings",
  "/console",
]

for (const path of OWNER_PAGES) {
  test(`signed out: ${path} → /sign-in, remembering the page`, async () => {
    const res = await get(path)
    assert.equal(res.status, 307, `${path} answered ${res.status}`)
    const to = new URL(res.headers.get("location"), BASE)
    assert.equal(to.pathname, "/sign-in")
    assert.equal(to.searchParams.get("next"), path)
  })
}

test("old owner links go to /app (then sign-in)", async () => {
  for (const [from, to] of [["/today", "/app?to=today"], ["/setup", "/app/onboarding"], ["/switch", "/app/businesses"]]) {
    const res = await get(from)
    assert.equal(res.status, 307, from)
    const loc = new URL(res.headers.get("location"), BASE)
    assert.equal(loc.pathname + loc.search, to, from)
  }
})

test("the sign-in page shows one Continue with Google button", async () => {
  const res = await get("/sign-in?next=%2Fapp")
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.match(html, /Continue with Google/)
})

test("cancelled sign-in → the website says so", async () => {
  const res = await get("/auth/callback?error=access_denied")
  assert.equal(res.status, 307)
  assert.equal(new URL(res.headers.get("location"), BASE).search, "?signin=cancelled")
})
