// Customer (public) actions go through narrow functions scoped to one booking link or
// ticket token — never direct table access (CLAUDE.md security rules; Phase 0 §7, §12.5–6).
import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import type { PGlite } from "@electric-sql/pglite"

import { asUser, BIZ_A, BIZ_B, count, seededWorld } from "./harness.ts"

let db: PGlite
before(async () => {
  db = await seededWorld()
  await db.exec(`update businesses set owner_mobile = '09170000999', calendar_mode = 'requests' where id = '${BIZ_B}'`)
})
after(async () => {
  await db.close()
})

type Json = Record<string, unknown>
const anon = <T,>(sql: string, params: unknown[] = []) => asUser(db, null, () => db.query<T>(sql, params))

test("anonymous visitors can read a storefront by its booking link", async () => {
  const r = await anon<{ s: Json }>("select public_storefront($1) as s", ["beta-salon-test"])
  const s = r.rows[0].s
  assert.equal((s.business as Json).name, "Beta Salon (test)")
  assert.equal((s.services as Json[]).length, 1)
  assert.equal(((s.staff as Json[])[0] as Json).name, "Joy")
  assert.deepEqual((s.profile as Json).payment_methods, ["Cash", "GCash"])
})

test("the storefront never includes the owner's private mobile or internal settings", async () => {
  const r = await anon<{ s: Json }>("select public_storefront($1) as s", ["beta-salon-test"])
  const text = JSON.stringify(r.rows[0].s)
  assert.ok(!text.includes("09170000999"), "owner mobile leaked")
  assert.ok(!("owner_mobile" in (r.rows[0].s.business as Json)))
})

test("an unknown booking link returns nothing", async () => {
  const r = await anon<{ s: Json | null }>("select public_storefront($1) as s", ["no-such-business"])
  assert.equal(r.rows[0].s, null)
})

const REQUEST = {
  name: "Mai Example",
  mobile: "09170000123",
  email: "mai@example.com",
  consent: false,
  service: "Haircut",
  staff_id: null,
  details: { summary: "Haircut", answers: {}, estimate: { price: 300, duration_minutes: 45, notes: [] } },
  preferred_day: "2026-10-17",
  preferred_time_of_day: "afternoon",
  requested_time_text: "Sat, Oct 17 · Afternoon",
}

test("anonymous customers can send a booking request and get a private ticket token", async () => {
  const r = await anon<{ t: Json }>("select create_booking_request($1, $2::jsonb) as t", ["beta-salon-test", JSON.stringify(REQUEST)])
  const t = r.rows[0].t
  assert.ok(typeof t.ticket_token === "string" && (t.ticket_token as string).length >= 32)
  assert.match(t.reference_code as string, /^[A-Z]{2}-\d{4}$/)
  const row = await db.query<{ status: string; source: string; business_id: string }>(
    "select status, source, business_id from bookings where ticket_token = $1",
    [t.ticket_token]
  )
  assert.deepEqual(row.rows[0], { status: "requested", source: "form", business_id: BIZ_B })
  assert.equal(await count(db, `select 1 from customers where business_id = '${BIZ_B}' and mobile = '09170000123'`), 1)
})

test("a repeat request from the same mobile reuses the customer", async () => {
  await anon("select create_booking_request($1, $2::jsonb)", ["beta-salon-test", JSON.stringify(REQUEST)])
  assert.equal(await count(db, `select 1 from customers where business_id = '${BIZ_B}' and mobile = '09170000123'`), 1)
})

test("a booking request with a bad mobile number is refused", async () => {
  await assert.rejects(
    anon("select create_booking_request($1, $2::jsonb)", ["beta-salon-test", JSON.stringify({ ...REQUEST, mobile: "12345" })]),
    /mobile/
  )
})

test("a ticket opens only with its token; the reference code alone returns nothing", async () => {
  const made = await anon<{ t: Json }>("select create_booking_request($1, $2::jsonb) as t", ["beta-salon-test", JSON.stringify(REQUEST)])
  const { ticket_token, reference_code } = made.rows[0].t as { ticket_token: string; reference_code: string }
  const byToken = await anon<{ t: Json | null }>("select public_ticket($1) as t", [ticket_token])
  assert.equal((byToken.rows[0].t as Json).reference_code, reference_code)
  assert.equal((byToken.rows[0].t as Json).first_name, "Mai")
  assert.ok(!JSON.stringify(byToken.rows[0].t).includes("09170000123"), "mobile leaked on the ticket")
  const byCode = await anon<{ t: Json | null }>("select public_ticket($1) as t", [reference_code])
  assert.equal(byCode.rows[0].t, null)
})

test("anonymous visitors still cannot read tables directly", async () => {
  assert.equal(await asUser(db, null, () => count(db, "select 1 from bookings")), 0)
  assert.equal(await asUser(db, null, () => count(db, "select 1 from customers")), 0)
})

test("requests can't be sent to a business on the legacy Cal.com mode", async () => {
  await assert.rejects(anon("select create_booking_request($1, $2::jsonb)", ["alpha-dental-test", JSON.stringify(REQUEST)]))
  void BIZ_A
})
