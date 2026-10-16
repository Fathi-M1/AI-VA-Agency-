// R2.6: Cruz Family Dental becomes a normal business: built-in schedule (requests),
// Asia/Manila, its legacy Cal.com service becomes a real service row, its owner becomes
// its one team member with the old opening hours, Cal.com is kept as an off connection,
// and its bookings stay.
import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import type { PGlite } from "@electric-sql/pglite"

import { count, freshDb, migrate } from "./harness.ts"

const CRUZ = "4eb77e14-4742-42d2-84e8-8a7d88785f67"

let db: PGlite
before(async () => {
  db = await freshDb()
  await migrate(db, { until: "20261016000100" })
  // Same shape as the real Cruz row (supabase/legacy/seed.sql + 004), test values only.
  await db.exec(`
    insert into businesses (id, name, config, vertical, booking_slug, calendar_mode, setup_completed_at) values
      ('${CRUZ}', 'Cruz Family Dental', '{"business_type":"Dental clinic","owner_name":"Dr. Test Example","timezone":"Asia/Singapore",
        "hours":{"mon":"08:00-17:00","tue":"08:00-17:00","wed":"08:00-17:00","thu":"08:00-17:00","fri":"08:00-13:00","sat":null,"sun":null},
        "services":[{"name":"Cleaning & exam","duration_minutes":60,"calcom_event_type_id":7315309}],
        "emergency_line":"Call 911."}', 'dental', 'cruz-family-dental', 'calcom', now());
    insert into bookings (business_id, service, slot_start, slot_end, calcom_booking_id, status)
      values ('${CRUZ}', 'Cleaning & exam', '2026-10-05T02:00:00Z', '2026-10-05T03:00:00Z', 'cal-1', 'accepted');
  `)
  await migrate(db, { from: "20261016000101" })
})
after(async () => {
  await db.close()
})

test("Cruz uses the built-in schedule in Asia/Manila", async () => {
  const r = await db.query<{ calendar_mode: string; timezone: string }>("select calendar_mode, timezone from businesses where id = $1", [CRUZ])
  assert.deepEqual(r.rows[0], { calendar_mode: "requests", timezone: "Asia/Manila" })
})

test("Cruz's legacy Cal.com service is now a real service row", async () => {
  const r = await db.query<{ name: string; duration_minutes: number; price_php: string | null; active: boolean }>(
    "select name, duration_minutes, price_php, active from services where business_id = $1",
    [CRUZ]
  )
  assert.deepEqual(r.rows, [{ name: "Cleaning & exam", duration_minutes: 60, price_php: null, active: true }])
})

test("Cruz's owner is its one team member, with the old opening hours", async () => {
  const staff = await db.query<{ id: string; name: string }>("select id, name from staff where business_id = $1", [CRUZ])
  assert.deepEqual(staff.rows.map((s) => s.name), ["Dr. Test Example"])
  const hours = await db.query<{ weekday: number; start_time: string; end_time: string }>(
    "select weekday, start_time::text, end_time::text from staff_hours where business_id = $1 order by weekday",
    [CRUZ]
  )
  assert.deepEqual(
    hours.rows.map((h) => `${h.weekday} ${h.start_time.slice(0, 5)}-${h.end_time.slice(0, 5)}`),
    ["1 08:00-17:00", "2 08:00-17:00", "3 08:00-17:00", "4 08:00-17:00", "5 08:00-13:00"]
  )
})

test("Cal.com is kept only as a switched-off connection", async () => {
  const r = await db.query<{ settings: Record<string, unknown> }>("select settings from business_profile where business_id = $1", [CRUZ])
  assert.deepEqual(r.rows[0].settings.calcom, { enabled: false, event_types: { "Cleaning & exam": 7315309 } })
  assert.equal(r.rows[0].settings.services, undefined, "legacy services list moved to the services table")
})

test("Cruz's bookings are kept (Cal.com 'accepted' → confirmed)", async () => {
  const r = await db.query<{ status: string }>("select status from bookings where business_id = $1", [CRUZ])
  assert.deepEqual(r.rows, [{ status: "confirmed" }])
})

test("running the Cruz migration again changes nothing", async () => {
  await migrate(db, { from: "20261016000900", until: "20261016000900" })
  assert.equal(await count(db, `select 1 from services where business_id = '${CRUZ}'`), 1)
  assert.equal(await count(db, `select 1 from staff where business_id = '${CRUZ}'`), 1)
  assert.equal(await count(db, `select 1 from staff_hours where business_id = '${CRUZ}'`), 5)
})

test("the migration does nothing when Cruz isn't in the database", async () => {
  const empty = await freshDb()
  await migrate(empty)
  assert.equal(await count(empty, "select 1 from services"), 0)
  await empty.close()
})
