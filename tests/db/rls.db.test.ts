// R2.2: row-level security by membership. A signed-in user reads and writes only their
// own business's rows; staff can't edit business settings, team or agents; anonymous
// visitors (the public anon key) see nothing.
import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import type { PGlite } from "@electric-sql/pglite"

import { asUser, BIZ_A, BIZ_B, count, seededWorld, STAFF_A, tablesWithBusinessId, USER_A, USER_B } from "./harness.ts"

let db: PGlite
before(async () => {
  db = await seededWorld()
})
after(async () => {
  await db.close()
})

test("is_member() is true only for the user's own active business", async () => {
  const r = await asUser(db, USER_A, () =>
    db.query<{ a: boolean; b: boolean }>(`select is_member('${BIZ_A}') as a, is_member('${BIZ_B}') as b`)
  )
  assert.deepEqual(r.rows[0], { a: true, b: false })
})

test("every table with business_id has select, insert, update and delete policies", async () => {
  for (const t of await tablesWithBusinessId(db)) {
    const r = await db.query<{ cmd: string }>("select cmd from pg_policies where schemaname = 'public' and tablename = $1", [t])
    const cmds = new Set(r.rows.map((x) => x.cmd))
    for (const c of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      assert.ok(cmds.has(c) || cmds.has("ALL"), `${t} has no ${c} policy`)
    }
  }
})

test("user A sees none of business B's rows, in every table", async () => {
  for (const t of await tablesWithBusinessId(db)) {
    const seen = await asUser(db, USER_A, () => count(db, `select 1 from public.${t} where business_id = '${BIZ_B}'`))
    assert.equal(seen, 0, `A can read B's ${t}`)
  }
  const biz = await asUser(db, USER_A, () => count(db, `select 1 from public.businesses where id = '${BIZ_B}'`))
  assert.equal(biz, 0, "A can read business B")
})

test("user A cannot change or delete business B's rows, in every table", async () => {
  for (const t of await tablesWithBusinessId(db)) {
    const updated = await asUser(db, USER_A, () =>
      db.query(`update public.${t} set business_id = business_id where business_id = '${BIZ_B}' returning 1`)
    )
    assert.equal(updated.rows.length, 0, `A updated B's ${t}`)
    const deleted = await asUser(db, USER_A, () => db.query(`delete from public.${t} where business_id = '${BIZ_B}' returning 1`))
    assert.equal(deleted.rows.length, 0, `A deleted B's ${t}`)
  }
  const before = await count(db, `select 1 from public.businesses where id = '${BIZ_B}'`)
  assert.equal(before, 1, "business B still exists")
})

test("user A cannot insert rows into business B", async () => {
  await assert.rejects(
    asUser(db, USER_A, () => db.query(`insert into public.conversations (business_id, channel) values ('${BIZ_B}', 'web')`)),
    /row-level security/
  )
})

test("user A can read and write their own business", async () => {
  const own = await asUser(db, USER_A, () => count(db, `select 1 from public.conversations where business_id = '${BIZ_A}'`))
  assert.ok(own > 0)
  const ins = await asUser(db, USER_A, () =>
    db.query(`insert into public.conversations (business_id, channel) values ('${BIZ_A}', 'web') returning id`)
  )
  assert.equal(ins.rows.length, 1)
  const upd = await asUser(db, USER_A, () => db.query(`update public.businesses set name = name where id = '${BIZ_A}' returning 1`))
  assert.equal(upd.rows.length, 1, "owner can update own business")
})

test("staff can work on bookings but cannot edit business settings or team", async () => {
  const reads = await asUser(db, STAFF_A, () => count(db, `select 1 from public.bookings where business_id = '${BIZ_A}'`))
  assert.ok(reads > 0, "staff can read bookings")
  const biz = await asUser(db, STAFF_A, () => db.query(`update public.businesses set name = 'x' where id = '${BIZ_A}' returning 1`))
  assert.equal(biz.rows.length, 0, "staff updated business settings")
  await assert.rejects(
    asUser(db, STAFF_A, () => db.query(`insert into public.services (business_id, name, duration_minutes) values ('${BIZ_A}', 'X', 30)`)),
    /row-level security/,
    "staff added a service"
  )
  await assert.rejects(
    asUser(db, STAFF_A, () => db.query(`insert into public.memberships (user_id, business_id, role) values ('${USER_B}', '${BIZ_A}', 'owner')`)),
    /row-level security/,
    "staff added a member"
  )
})

test("users can see their own memberships but not other people's", async () => {
  const mine = await asUser(db, USER_B, () => count(db, "select 1 from public.memberships"))
  assert.equal(mine, 1)
})

test("a user cannot make themselves a builder", async () => {
  await assert.rejects(
    asUser(db, USER_A, () => db.query(`update public.users set is_builder = true where id = '${USER_A}'`)),
    /permission denied/
  )
})

test("anonymous visitors see nothing", async () => {
  for (const t of [...(await tablesWithBusinessId(db)), "businesses", "users"]) {
    const seen = await asUser(db, null, () => count(db, `select 1 from public.${t}`))
    assert.equal(seen, 0, `anon can read ${t}`)
  }
})
