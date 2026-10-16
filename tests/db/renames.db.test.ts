// R2.3: blueprint names and values, keeping every existing row.
import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import type { PGlite } from "@electric-sql/pglite"

import { BIZ_A, count, freshDb, LEGACY_SEED, migrate, seededWorld } from "./harness.ts"

let db: PGlite
before(async () => {
  db = await seededWorld()
})
after(async () => {
  await db.close()
})

const tableExists = async (t: string) =>
  (await db.query("select 1 from pg_tables where schemaname = 'public' and tablename = $1", [t])).rows.length === 1
const columnExists = async (t: string, c: string) =>
  (await db.query("select 1 from information_schema.columns where table_schema = 'public' and table_name = $1 and column_name = $2", [t, c]))
    .rows.length === 1

test("contacts is now customers, with every row kept", async () => {
  assert.equal(await tableExists("contacts"), false)
  assert.equal(await tableExists("customers"), true)
  assert.equal(await count(db, "select 1 from customers"), 2)
  for (const t of ["conversations", "bookings", "needs_you_items"]) {
    assert.equal(await columnExists(t, "customer_id"), true, `${t}.customer_id`)
    assert.equal(await columnExists(t, "contact_id"), false, `${t}.contact_id still there`)
  }
  assert.equal(await count(db, "select 1 from conversations where customer_id is not null"), 2)
})

test("escalations is now needs_you_items, typed, with every row kept", async () => {
  assert.equal(await tableExists("escalations"), false)
  const rows = await db.query<{ reason: string; type: string; status: string }>("select reason, type, status from needs_you_items order by reason")
  assert.equal(rows.rows.length, 3)
  const byReason = Object.fromEntries(rows.rows.map((r) => [r.reason, r]))
  assert.equal(byReason["Emergency words: bleeding"].type, "emergency")
  assert.equal(byReason["Customer asks for a refund"].type, "refund")
  assert.equal(byReason["Customer asks for a refund"].status, "done")
  assert.equal(byReason["Unknown question about parking"].type, "other")
  assert.equal(await columnExists("needs_you_items", "booking_id"), true)
  await assert.rejects(
    db.query(`insert into needs_you_items (business_id, reason, type) values ('${BIZ_A}', 'x', 'escalated')`),
    /check constraint/
  )
})

test("message roles are customer / agent / owner / system", async () => {
  const r = await db.query<{ role: string; n: number }>("select role, count(*)::int as n from messages group by role order by role")
  assert.deepEqual(r.rows, [
    { role: "agent", n: 1 },
    { role: "customer", n: 2 },
    { role: "system", n: 1 }, // the safety-net emergency reply (no agent)
  ])
  await assert.rejects(
    db.query(`insert into messages (business_id, conversation_id, role, content)
              select business_id, id, 'user', 'x' from conversations limit 1`),
    /check constraint/
  )
})

test("conversations can be taken over by an owner", async () => {
  assert.equal(await columnExists("conversations", "taken_over_by"), true)
})

test("booking statuses are the seven blueprint values", async () => {
  const r = await db.query<{ status: string }>("select status from bookings order by status")
  assert.deepEqual(r.rows.map((x) => x.status), ["confirmed", "requested"]) // Cal.com 'accepted' → confirmed
  await assert.rejects(
    db.query(`insert into bookings (business_id, service, status) values ('${BIZ_A}', 'X', 'accepted')`),
    /check constraint/
  )
  for (const s of ["requested", "confirmed", "declined", "cancelled", "completed", "no_show", "expired"]) {
    const slot = s === "confirmed" ? ", slot_start" : ""
    const val = s === "confirmed" ? ", now()" : ""
    await db.query(`insert into bookings (business_id, service, status${slot}) values ('${BIZ_A}', 'X', '${s}'${val})`)
  }
})

test("every booking has a unique ticket token of 32+ characters", async () => {
  const r = await db.query<{ ticket_token: string | null }>("select ticket_token from bookings")
  assert.ok(r.rows.length >= 2)
  const tokens = r.rows.map((x) => x.ticket_token)
  for (const t of tokens) assert.ok(t && t.length >= 32, `token too short: ${t}`)
  assert.equal(new Set(tokens).size, tokens.length, "tokens are not unique")
  const fresh = await db.query<{ ticket_token: string }>(
    `insert into bookings (business_id, service, status) values ('${BIZ_A}', 'Y', 'requested') returning ticket_token`
  )
  assert.ok(fresh.rows[0].ticket_token.length >= 32, "new bookings get a token automatically")
})

test("an unexpected booking status stops the migration with a clear message", async () => {
  const other = await freshDb()
  await migrate(other, { until: "20261016000100" })
  await other.exec(LEGACY_SEED)
  await other.exec(`insert into bookings (business_id, service, status) values ('${BIZ_A}', 'Z', 'on_hold')`)
  await assert.rejects(migrate(other, { from: "20261016000101" }), /on_hold/)
  await other.close()
})
