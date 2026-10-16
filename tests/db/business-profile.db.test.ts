// R2.4: business knowledge moves from businesses.config into business_profile (1:1),
// losing nothing; creating a business also creates its profile and the owner's
// membership in one transaction.
import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import type { PGlite } from "@electric-sql/pglite"

import { asUser, BIZ_A, BIZ_B, count, seededWorld, USER_A, USER_B } from "./harness.ts"

let db: PGlite
before(async () => {
  db = await seededWorld()
})
after(async () => {
  await db.close()
})

type Profile = {
  emergency_message: string | null
  payment_methods: string[]
  walk_ins: boolean | null
  hmos: string[]
  service_areas: string[]
  faqs: unknown[]
  approval_limits: Record<string, unknown>
  settings: Record<string, unknown>
}
const profileOf = async (id: string) =>
  (await db.query<Profile>("select * from business_profile where business_id = $1", [id])).rows[0]

test("every business has exactly one profile", async () => {
  assert.equal(await count(db, "select 1 from businesses"), await count(db, "select 1 from business_profile"))
})

test("dental business A keeps everything from its old config", async () => {
  const p = await profileOf(BIZ_A)
  assert.equal(p.emergency_message, "Call 911.")
  assert.deepEqual(p.faqs, [{ question: "Parking?", answer: "Yes, free." }])
  assert.deepEqual(p.approval_limits, { refund_over: 500 })
  assert.equal(p.settings.owner_name, "Ana Example")
  assert.equal(p.settings.business_type, "Dental clinic")
  assert.deepEqual(p.settings.restricted_advice, ["medical advice"])
  assert.deepEqual(p.settings.rules, { emergency_keywords: ["bleeding"] })
  assert.equal(p.settings.avg_job_value, 1500)
  assert.deepEqual((p.settings.hours as Record<string, unknown>).mon, "08:00-17:00")
  assert.ok(Array.isArray(p.settings.services), "legacy Cal.com services kept")
  const tz = await db.query<{ timezone: string }>("select timezone from businesses where id = $1", [BIZ_A])
  assert.equal(tz.rows[0].timezone, "Asia/Singapore")
})

test("salon business B keeps payment, walk-ins, emergency message, refund limit and onboarding", async () => {
  const p = await profileOf(BIZ_B)
  assert.deepEqual(p.payment_methods, ["Cash", "GCash"])
  assert.equal(p.walk_ins, true)
  assert.equal(p.emergency_message, "Go to the ER.")
  assert.deepEqual(p.approval_limits, { refund_over: 1000 })
  assert.equal(p.settings.pack_version, 2)
  const b = await db.query<{ onboarding_state: Record<string, unknown> }>("select onboarding_state from businesses where id = $1", [BIZ_B])
  assert.equal(b.rows[0].onboarding_state.shared_link_at, "2026-10-12T00:00:00Z")
})

test("the old config column is kept read-only as config_legacy for one release", async () => {
  const cols = await db.query<{ column_name: string }>(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'businesses'"
  )
  const names = cols.rows.map((c) => c.column_name)
  assert.ok(names.includes("config_legacy"))
  assert.ok(!names.includes("config"), "businesses.config should be gone (one source of truth)")
})

test("members read their own profile; only owners change it; others see nothing", async () => {
  assert.equal(await asUser(db, USER_B, () => count(db, `select 1 from business_profile where business_id = '${BIZ_A}'`)), 0)
  const upd = await asUser(db, USER_A, () =>
    db.query(`update business_profile set about = 'We fix teeth.' where business_id = '${BIZ_A}' returning 1`)
  )
  assert.equal(upd.rows.length, 1)
})

const SETUP = (name: string) => `{
  "name": "${name}", "vertical": "salon", "base_slug": "new-salon-test", "owner_mobile": "09170000002",
  "brand_color": "#1F5A43",
  "config": {"timezone": "Asia/Manila", "payment_methods": ["Cash"], "walk_ins": false,
             "emergency_instruction": "Call 911.", "refund_approval_limit_php": 800, "pack_version": 2},
  "services": [{"name": "Haircut", "duration_minutes": 45, "price_php": 250, "pricing_type": "fixed", "active": true, "sort_order": 0}],
  "staff": [{"name": "Joy", "hours": [{"weekday": 2, "start_time": "10:00", "end_time": "19:00"}]}]
}`

test("create_business_setup creates business, profile and owner membership together", async () => {
  const r = await asUser(db, USER_B, () =>
    db.query<{ new_business_id: string }>(`select * from create_business_setup($1::jsonb)`, [SETUP("New Salon (test)")])
  )
  const id = r.rows[0].new_business_id
  const p = await profileOf(id)
  assert.deepEqual(p.payment_methods, ["Cash"])
  assert.equal(p.walk_ins, false)
  assert.deepEqual(p.approval_limits, { refund_over: 800 })
  const m = await db.query<{ role: string }>("select role from memberships where business_id = $1 and user_id = $2", [id, USER_B])
  assert.deepEqual(m.rows, [{ role: "owner" }])
  assert.equal(await asUser(db, USER_B, () => count(db, `select 1 from businesses where id = '${id}'`)), 1, "owner can see it")
})

test("a failing setup rolls everything back", async () => {
  const before = await count(db, "select 1 from businesses")
  const bad = SETUP("Broken (test)").replace('"duration_minutes": 45', '"duration_minutes": 0') // violates check
  await assert.rejects(asUser(db, USER_A, () => db.query(`select * from create_business_setup($1::jsonb)`, [bad])))
  assert.equal(await count(db, "select 1 from businesses"), before)
  assert.equal(await count(db, "select 1 from business_profile"), before)
})

test("anonymous visitors cannot create businesses", async () => {
  await assert.rejects(asUser(db, null, () => db.query(`select * from create_business_setup($1::jsonb)`, [SETUP("Anon (test)")])))
})
