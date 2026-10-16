// The two read-only check queries the migration runbook asks the owner to run against
// production (docs/MIGRATION-RUNBOOK.md): one before `supabase db push`, one after.
// Rows survive with the same counts, nothing the migrations would refuse is present,
// and every after-check says "ok" — or "PROBLEM" when something is wrong.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import type { PGlite } from "@electric-sql/pglite"

import { freshDb, LEGACY_SEED, migrate, MIGRATIONS_DIR, seededWorld } from "./harness.ts"

const CHECKS = join(MIGRATIONS_DIR, "..", "checks")
const BEFORE = readFileSync(join(CHECKS, "before-migration.sql"), "utf8")
const AFTER = readFileSync(join(CHECKS, "after-migration.sql"), "utf8")

type Row = { section: string; item: string; value: string }

async function run(db: PGlite, sql: string): Promise<Row[]> {
  return (await db.query<Row>(sql)).rows
}

function counts(rows: Row[]) {
  return Object.fromEntries(rows.filter((r) => r.section === "count").map((r) => [r.item, r.value]))
}

const SEEDED_COUNTS = { businesses: "2", customers: "2", conversations: "2", messages: "4", bookings: "2", needs_you_items: "3" }

test("both check files are a single read-only select", () => {
  for (const [name, sql] of [["before", BEFORE], ["after", AFTER]]) {
    const code = sql.replace(/--.*$/gm, "")
    assert.doesNotMatch(code, /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|comment)\b/i, `${name} must not change anything`)
    assert.equal(code.trim().replace(/;\s*$/, "").includes(";"), false, `${name} must be one statement`)
  }
})

test("before: counts today's rows under the old names and finds nothing the migrations would refuse", async () => {
  const db = await freshDb()
  await migrate(db, { until: "20261016000100" })
  await db.exec(LEGACY_SEED)
  const rows = await run(db, BEFORE)
  assert.deepEqual(counts(rows), SEEDED_COUNTS)
  const blockers = rows.filter((r) => r.section === "blocker")
  assert.deepEqual(blockers, [], "no unknown statuses or roles in the seeded data")
  await db.close()
})

test("before: lists a booking status the migrations don't know", async () => {
  const db = await freshDb()
  await migrate(db, { until: "20261016000100" })
  await db.exec(LEGACY_SEED)
  await db.exec(`update bookings set status = 'on_hold' where status = 'requested'`)
  const rows = await run(db, BEFORE)
  assert.ok(rows.some((r) => r.section === "blocker" && r.item === "booking status" && r.value === "on_hold"), JSON.stringify(rows))
  await db.close()
})

test("after: the same counts under the new names, and every check is ok", async () => {
  const db = await seededWorld()
  const rows = await run(db, AFTER)
  assert.deepEqual(counts(rows), SEEDED_COUNTS)
  const checks = rows.filter((r) => r.section === "check")
  assert.ok(checks.length >= 10, `expected at least 10 checks, got ${checks.length}`)
  assert.deepEqual(checks.filter((r) => r.value !== "ok"), [])
  await db.close()
})

test("after: reports PROBLEM when a table has row-level security off", async () => {
  const db = await seededWorld()
  await db.exec("alter table public.customers disable row level security")
  const rows = await run(db, AFTER)
  const rls = rows.find((r) => r.section === "check" && r.item.startsWith("row-level security"))
  assert.ok(rls && rls.value.startsWith("PROBLEM") && rls.value.includes("customers"), JSON.stringify(rls))
  await db.close()
})
