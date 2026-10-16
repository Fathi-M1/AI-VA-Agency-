// Security tests 3, 4 and 8 at the guard level: a signed-in user only gets a business
// they're an active member of; owner-only work needs the owner role. Anything else
// looks exactly like a page that doesn't exist (never B's data, never a hint it exists).
import assert from "node:assert/strict"
import { test } from "node:test"

import { checkAccess, type Membership } from "../src/server/auth-core.ts"

const A = "aaaaaaaa-0000-4000-8000-000000000001"
const B = "bbbbbbbb-0000-4000-8000-000000000002"
const USER = "aaaaaaaa-1111-4000-8000-000000000001"

function deps(memberships: Record<string, Membership>, userId: string | null = USER) {
  const looked: string[] = []
  return {
    looked,
    getUserId: async () => userId,
    getMembership: async (_user: string, businessId: string) => {
      looked.push(businessId)
      return memberships[businessId] ?? null
    },
  }
}

test("signed out → sign in", async () => {
  assert.deepEqual(await checkAccess(deps({}, null), A, "member"), { kind: "sign-in" })
})

test("an active member gets their business, with their role", async () => {
  const d = deps({ [A]: { role: "staff", status: "active" } })
  assert.deepEqual(await checkAccess(d, A, "member"), { kind: "ok", userId: USER, role: "staff" })
})

test("someone else's business → not found", async () => {
  const d = deps({ [A]: { role: "owner", status: "active" } })
  assert.deepEqual(await checkAccess(d, B, "member"), { kind: "not-found" })
})

test("invited or removed members don't get in", async () => {
  for (const status of ["invited", "removed"] as const) {
    const d = deps({ [A]: { role: "owner", status } })
    assert.deepEqual(await checkAccess(d, A, "member"), { kind: "not-found" }, status)
  }
})

test("owner-only work: owners yes, staff no", async () => {
  assert.equal((await checkAccess(deps({ [A]: { role: "owner", status: "active" } }), A, "owner")).kind, "ok")
  assert.deepEqual(await checkAccess(deps({ [A]: { role: "staff", status: "active" } }), A, "owner"), { kind: "not-found" })
})

test("a malformed business id is not found without touching the database", async () => {
  const d = deps({})
  for (const bad of ["", "today", "1 or 1=1", `${A}x`]) assert.deepEqual(await checkAccess(d, bad, "member"), { kind: "not-found" })
  assert.deepEqual(d.looked, [])
})
