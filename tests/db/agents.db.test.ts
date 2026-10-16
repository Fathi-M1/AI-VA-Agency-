// R2.5: tables for later phases exist (empty, with RLS) and every business has its five
// built-in agents — including businesses created later.
import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import type { PGlite } from "@electric-sql/pglite"

import { asUser, BIZ_A, BIZ_B, count, migrate, seededWorld, STAFF_A, USER_A } from "./harness.ts"

let db: PGlite
before(async () => {
  db = await seededWorld()
})
after(async () => {
  await db.close()
})

const NEW_TABLES = ["staff_services", "agents", "agent_runs", "notifications", "audit_log"]

test("the new tables exist with row-level security on", async () => {
  for (const t of NEW_TABLES) {
    const r = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname = $1 and relnamespace = 'public'::regnamespace", [t])
    assert.equal(r.rows.length, 1, `missing ${t}`)
    assert.equal(r.rows[0].relrowsecurity, true, `RLS off on ${t}`)
  }
  for (const t of ["staff_services", "agent_runs", "notifications", "audit_log"]) {
    assert.equal(await count(db, `select 1 from ${t}`), 0, `${t} should start empty`)
  }
})

test("each business has exactly the five built-in agents", async () => {
  for (const id of [BIZ_A, BIZ_B]) {
    const r = await db.query<{ key: string; kind: string; status: string }>(
      "select key, kind, status from agents where business_id = $1 order by key",
      [id]
    )
    assert.deepEqual(
      r.rows.map((x) => `${x.key}:${x.kind}:${x.status}`),
      ["admin_assistant:built_in:paused", "booking:built_in:live", "receptionist:built_in:live", "sales:built_in:live", "support:built_in:live"]
    )
  }
})

test("running the migrations again adds no duplicate agents", async () => {
  const before = await count(db, "select 1 from agents")
  await migrate(db, { from: "20261016000800", until: "20261016000800" })
  assert.equal(await count(db, "select 1 from agents"), before)
})

test("a business created later gets its five agents automatically", async () => {
  await db.exec(`insert into businesses (id, name) values ('ffffffff-0000-4000-8000-00000000000f', 'Later (test)')`)
  assert.equal(await count(db, "select 1 from agents where business_id = 'ffffffff-0000-4000-8000-00000000000f'"), 5)
})

test("staff can see agents but cannot change them", async () => {
  assert.equal(await asUser(db, STAFF_A, () => count(db, `select 1 from agents where business_id = '${BIZ_A}'`)), 5)
  const upd = await asUser(db, STAFF_A, () => db.query(`update agents set status = 'paused' where business_id = '${BIZ_A}' returning 1`))
  assert.equal(upd.rows.length, 0)
  const own = await asUser(db, USER_A, () => db.query(`update agents set status = status where business_id = '${BIZ_A}' returning 1`))
  assert.equal(own.rows.length, 5, "owner can change agents")
})
