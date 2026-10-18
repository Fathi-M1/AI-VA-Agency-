// The owner applies migrations by pasting four files into the Supabase SQL editor
// (supabase/sql-editor/, built from supabase/migrations by scripts/build-sql-editor.mjs):
// 1 backup inside the database → 2 before-check → 3 all migrations in one transaction,
// recorded in Supabase's migration history → 4 after-check.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import type { PGlite } from "@electric-sql/pglite"

import { buildFiles } from "../../scripts/build-sql-editor.mjs"
import { count, freshDb, LEGACY_SEED, migrate, MIGRATIONS_DIR } from "./harness.ts"

const DIR = join(MIGRATIONS_DIR, "..", "sql-editor")
const file = (name: string) => readFileSync(join(DIR, name), "utf8")
type Row = { section: string; item: string; value: string }

async function productionToday(): Promise<PGlite> {
  const db = await freshDb()
  await migrate(db, { until: "20261016000100" }) // the shape production has today
  await db.exec(LEGACY_SEED)
  await db.exec("drop table if exists supabase_migrations.schema_migrations") // never created by the old SQL-editor workflow
  return db
}

test("the files in supabase/sql-editor are up to date with supabase/migrations", () => {
  for (const [name, content] of Object.entries(buildFiles())) assert.equal(file(name), content, `${name} is stale: run node scripts/build-sql-editor.mjs`)
})

test("backup → before-check → migrate → after-check: every row kept, every check ok, history recorded", async () => {
  const db = await productionToday()
  await db.exec(file("1-backup.sql"))
  assert.equal(await count(db, "select 1 from backup_phase0.contacts"), 2)
  assert.equal(await count(db, "select 1 from backup_phase0.bookings"), 2)

  const before = (await db.query<Row>(file("2-before-check.sql"))).rows
  assert.deepEqual(before.filter((r) => r.section === "blocker"), [])

  await db.exec(file("3-migrate.sql"))
  const after = (await db.query<Row>(file("4-after-check.sql"))).rows
  const counts = (rows: Row[]) => Object.fromEntries(rows.filter((r) => r.section === "count").map((r) => [r.item, r.value]))
  assert.deepEqual(counts(after), counts(before))
  assert.deepEqual(after.filter((r) => r.section === "check" && r.value !== "ok"), [])

  const history = await db.query<{ version: string }>("select version from supabase_migrations.schema_migrations order by version")
  assert.deepEqual(
    history.rows.map((r) => r.version),
    readFileSync(join(MIGRATIONS_DIR, "..", "sql-editor", "3-migrate.sql"), "utf8").match(/^-- ={3,} (\d{14})_/gm)!.map((m) => m.slice(-15, -1))
  )
  assert.equal(history.rows.length, 10)
  await db.close()
})

test("pasting the migrations twice changes nothing", async () => {
  const db = await productionToday()
  await db.exec(file("1-backup.sql"))
  await db.exec(file("3-migrate.sql"))
  await assert.rejects(db.exec(file("3-migrate.sql")), /already applied/)
  await db.exec("rollback").catch(() => {}) // the SQL editor ends the failed transaction
  assert.equal(await count(db, "select 1 from supabase_migrations.schema_migrations"), 10)
  await db.close()
})

test("the migrations refuse to run before the backup", async () => {
  const db = await productionToday()
  await assert.rejects(db.exec(file("3-migrate.sql")), /1-backup\.sql first/)
  await db.exec("rollback").catch(() => {}) // the SQL editor ends the failed transaction
  assert.ok(await count(db, "select 1 from pg_tables where schemaname = 'public' and tablename = 'contacts'"))
  await db.close()
})

test("the backup refuses to run twice (it never overwrites an earlier backup)", async () => {
  const db = await productionToday()
  await db.exec(file("1-backup.sql"))
  await assert.rejects(db.exec(file("1-backup.sql")))
  await db.close()
})

test("if any migration fails, nothing at all is changed", async () => {
  const db = await productionToday()
  await db.exec(file("1-backup.sql"))
  await db.exec("update bookings set status = 'on_hold' where status = 'requested'") // a value the migrations refuse
  await assert.rejects(db.exec(file("3-migrate.sql")))
  await db.exec("rollback").catch(() => {}) // the SQL editor ends the failed transaction the same way
  assert.ok(await count(db, "select 1 from pg_tables where schemaname = 'public' and tablename = 'contacts'"), "contacts still there")
  assert.equal(await count(db, "select 1 from pg_tables where schemaname = 'public' and tablename = 'memberships'"), 0, "no new tables")
  await db.close()
})
