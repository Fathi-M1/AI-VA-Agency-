// Phase 0 §5: existing businesses are claimed once by the owner's Google account
// (supabase/sql-editor/5-claim-businesses.sql, pasted after the first Google sign-in).
// The repo is public, so the file ships with a placeholder the owner replaces.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import type { PGlite } from "@electric-sql/pglite"

import { BIZ_A, BIZ_B, count, MIGRATIONS_DIR, seededWorld, USER_B } from "./harness.ts"

const SQL = readFileSync(join(MIGRATIONS_DIR, "..", "sql-editor", "5-claim-businesses.sql"), "utf8")
const OWNER = "owner-claim@example.com"
const withEmail = (email: string) => SQL.replace("PUT-YOUR-GOOGLE-EMAIL-HERE", email)

async function world(): Promise<PGlite> {
  const db = await seededWorld()
  await db.exec("delete from memberships") // production today: nobody owns anything yet
  await db.exec(`insert into auth.users (id, email) values ('dddddddd-9999-4000-8000-000000000001', '${OWNER}')`)
  return db
}

test("the placeholder appears once, and the file refuses to run until it is replaced", async () => {
  assert.equal(SQL.split("PUT-YOUR-GOOGLE-EMAIL-HERE").length - 1, 1)
  const db = await world()
  await assert.rejects(db.exec(SQL), /line marked CHANGE THIS/)
  assert.equal(await count(db, "select 1 from memberships"), 0)
  await db.close()
})

test("refuses when that email hasn't signed in yet", async () => {
  const db = await world()
  await assert.rejects(db.exec(withEmail("nobody@example.com")), /Sign in with Google once first/)
  await db.close()
})

test("makes the owner's account the owner of every business, and shows the result", async () => {
  const db = await world()
  const results = await db.exec(withEmail(OWNER.toUpperCase())) // email match ignores case
  const owned = await db.query<{ business_id: string }>(
    `select m.business_id from memberships m join auth.users u on u.id = m.user_id
      where u.email = $1 and m.role = 'owner' and m.status = 'active' order by m.business_id`,
    [OWNER]
  )
  assert.deepEqual(owned.rows.map((r) => r.business_id), [BIZ_A, BIZ_B])
  const shown = results.at(-1)!.rows as { business: string }[]
  assert.equal(shown.length, 2, "the last result lists the claimed businesses")
  await db.close()
})

test("running it twice adds nothing, and businesses that already have an owner are left alone", async () => {
  const db = await world()
  await db.exec(`insert into memberships (user_id, business_id, role) values ('${USER_B}', '${BIZ_B}', 'owner')`)
  await db.exec(withEmail(OWNER))
  await db.exec(withEmail(OWNER))
  assert.equal(await count(db, "select 1 from memberships"), 2) // OWNER→A, USER_B→B
  assert.equal(await count(db, `select 1 from memberships where business_id = '${BIZ_B}' and user_id = '${USER_B}'`), 1)
  await db.close()
})

const BUILDER = readFileSync(join(MIGRATIONS_DIR, "..", "sql-editor", "6-make-me-builder.sql"), "utf8")

test("make-me-builder sets the flag for that account only, and refuses the placeholder", async () => {
  const db = await world()
  await assert.rejects(db.exec(BUILDER), /line marked CHANGE THIS/)
  await db.exec(BUILDER.replace("PUT-YOUR-GOOGLE-EMAIL-HERE", OWNER))
  assert.equal(await count(db, "select 1 from public.users where is_builder"), 1)
  assert.equal(await count(db, `select 1 from public.users u join auth.users a on a.id = u.id where u.is_builder and a.email = '${OWNER}'`), 1)
  await db.close()
})
