// The whole migration chain on today's data: every row survives, and running the chain
// a second time (e.g. after a half-failed `supabase db push`) changes nothing.
import assert from "node:assert/strict"
import { test } from "node:test"

import { count, migrate, seededWorld } from "./harness.ts"

const TABLES = ["businesses", "business_profile", "customers", "conversations", "messages", "bookings", "needs_you_items", "services", "staff", "staff_hours", "agents", "memberships"]

test("the full chain keeps every row and re-runs without duplicating anything", async () => {
  const db = await seededWorld()
  const first: Record<string, number> = {}
  for (const t of TABLES) first[t] = await count(db, `select 1 from ${t}`)
  assert.deepEqual(
    { customers: first.customers, conversations: first.conversations, messages: first.messages, bookings: first.bookings, needs_you_items: first.needs_you_items },
    { customers: 2, conversations: 2, messages: 4, bookings: 2, needs_you_items: 3 },
    "seeded rows survived the migrations"
  )
  // The CLI records each applied migration, so the baseline never runs twice; everything after it must be re-runnable.
  await migrate(db, { from: "20261016000200" })
  for (const t of TABLES) assert.equal(await count(db, `select 1 from ${t}`), first[t], `${t} changed on re-run`)
  await db.close()
})
