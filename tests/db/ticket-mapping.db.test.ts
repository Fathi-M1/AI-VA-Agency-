// R3.5 / security test 5: the ticket page reads through public_ticket(token) as an
// anonymous visitor; the result maps to the page's Ticket shape (first name only).
import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import type { PGlite } from "@electric-sql/pglite"

import { ticketFromPublic } from "../../src/server/db/ticket-mapping.ts"
import { asUser, BIZ_B, seededWorld } from "./harness.ts"

let db: PGlite
let token = ""
let code = ""
before(async () => {
  db = await seededWorld()
  const req = {
    name: "Mai Example",
    mobile: "09170000123",
    service: "Haircut",
    staff_id: "cccccccc-0000-4000-8000-00000000000b",
    details: { summary: "Haircut, short hair", answers: { hair: "Short" }, estimate: { price: 300, duration_minutes: 45, notes: [] } },
    preferred_day: "2026-10-17",
    preferred_time_of_day: "afternoon",
    requested_time_text: "Sat, Oct 17 · Afternoon",
  }
  const r = await asUser(db, null, () =>
    db.query<{ t: { ticket_token: string; reference_code: string } }>("select create_booking_request($1, $2::jsonb) as t", [
      "beta-salon-test",
      JSON.stringify(req),
    ])
  )
  token = r.rows[0].t.ticket_token
  code = r.rows[0].t.reference_code
})
after(async () => {
  await db.close()
})

const publicTicket = (t: string) =>
  asUser(db, null, async () => (await db.query<{ t: unknown }>("select public_ticket($1) as t", [t])).rows[0]?.t ?? null)

test("a requested ticket maps to the page's shape, first name only", async () => {
  const t = ticketFromPublic(await publicTicket(token), token)
  assert.ok(t)
  assert.equal(t.code, code)
  assert.equal(t.token, token)
  assert.equal(t.status, "requested")
  assert.equal(t.firstName, "Mai")
  assert.equal(t.service, "Haircut")
  assert.equal(t.details, "Haircut, short hair")
  assert.deepEqual(t.answers, { hair: "Short" })
  assert.equal(t.teamMember, "Joy")
  assert.equal(t.preferred, "Sat, Oct 17 · Afternoon")
  assert.equal(t.confirmed, null)
  assert.deepEqual(t.estimate, { price: 300, duration_minutes: 45, notes: [] })
})

test("a confirmed ticket shows the date and time in the business's timezone", async () => {
  await db.exec(`update bookings set status = 'confirmed', slot_start = '2026-10-17T06:00:00Z', slot_end = '2026-10-17T06:45:00Z'
                 where business_id = '${BIZ_B}' and ticket_token = '${token}'`)
  const t = ticketFromPublic(await publicTicket(token), token)
  assert.equal(t?.confirmed?.label, "Sat, Oct 17 · 2:00 PM · with Joy")
  assert.equal(t?.confirmed?.start, "2026-10-17T06:00:00+00:00")
})

test("the reference code alone opens nothing", async () => {
  assert.equal(ticketFromPublic(await publicTicket(code), code), null)
})
