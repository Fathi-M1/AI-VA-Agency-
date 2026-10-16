// R2.1: the baseline migration recreates today's production schema and is safe to run
// on the existing production database (everything idempotent).
import assert from "node:assert/strict"
import { test } from "node:test"

import { freshDb, migrate, migrationFiles } from "./harness.ts"

const BASELINE = "20261016000100"
const TODAY_TABLES = ["businesses", "contacts", "conversations", "messages", "bookings", "escalations", "services", "staff", "staff_hours"]

test("baseline is the first migration file", () => {
  assert.ok(migrationFiles()[0]?.startsWith(BASELINE), "expected the baseline first")
})

test("baseline creates every current table and the setup function", async () => {
  const db = await freshDb()
  await migrate(db, { until: BASELINE })
  const r = await db.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public'"
  )
  const names = r.rows.map((x) => x.table_name)
  for (const t of TODAY_TABLES) assert.ok(names.includes(t), `missing table ${t}`)
  const fn = await db.query("select 1 from pg_proc where proname = 'create_business_setup'")
  assert.equal(fn.rows.length, 1)
})

test("baseline runs twice without errors (production already has it)", async () => {
  const db = await freshDb()
  await migrate(db, { until: BASELINE })
  await migrate(db, { until: BASELINE })
})

test("baseline turns on row-level security on every table", async () => {
  const db = await freshDb()
  await migrate(db, { until: BASELINE })
  const r = await db.query<{ relname: string; relrowsecurity: boolean }>(
    "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'"
  )
  for (const row of r.rows) assert.ok(row.relrowsecurity, `RLS off on ${row.relname}`)
})
