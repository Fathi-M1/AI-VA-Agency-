// Phase 0 §7 / R3.5: the booking page reads its business through public_storefront (as an
// anonymous visitor), and the result maps to the same shape the page has always used,
// minus what customers must never see.
import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import type { PGlite } from "@electric-sql/pglite"

import { profileFromStorefront } from "../../src/server/db/storefront-mapping.ts"
import { asUser, BIZ_A, BIZ_B, seededWorld } from "./harness.ts"

let db: PGlite
before(async () => {
  db = await seededWorld()
})
after(async () => {
  await db.close()
})

async function storefront(link: string) {
  return asUser(db, null, async () => {
    const r = await db.query<{ s: unknown }>("select public.public_storefront($1) as s", [link])
    return r.rows[0]?.s ?? null
  })
}

test("an anonymous visitor's storefront maps to the booking page's business shape", async () => {
  const b = profileFromStorefront(await storefront("beta-salon-test"))
  assert.ok(b)
  assert.equal(b.id, BIZ_B)
  assert.equal(b.name, "Beta Salon (test)")
  assert.equal(b.calendar_mode, "requests")
  assert.equal(b.booking_slug, "beta-salon-test")
  assert.equal(b.config.timezone, "Asia/Manila")
  assert.deepEqual(b.config.payment_methods, ["Cash", "GCash"])
  assert.equal(b.config.walk_ins, true)
  assert.equal(b.config.emergency_line, "Go to the ER.") // one name per value (profile-mapping.ts)
  assert.deepEqual(
    b.services.map((s) => [s.name, s.duration_minutes, s.price_php, s.active]),
    [["Haircut", 45, 300, true]]
  )
  assert.deepEqual(b.staff.map((m) => [m.name, m.active, m.hours]), [["Joy", true, [{ weekday: 2, start_time: "10:00", end_time: "19:00" }]]])
})

test("nothing private comes through", async () => {
  const raw = JSON.stringify(await storefront("alpha-dental-test"))
  // ("calcom" as the calendar_mode value is fine; the calcom settings key is not)
  for (const secret of ["owner_mobile", "avg_job_value", "owner_name", "Ana Example", '"calcom":', "approval_limits", "refund_over"]) {
    assert.equal(raw.includes(secret), false, secret)
  }
  const b = profileFromStorefront(await storefront("alpha-dental-test"))
  assert.equal(b?.id, BIZ_A)
  assert.equal(b?.owner_mobile, null)
})

test("an unknown link is null", async () => {
  assert.equal(profileFromStorefront(await storefront("no-such-link")), null)
})
