// The status and type values the database accepts (migrations 20261016000400–000600).
import assert from "node:assert/strict"
import { test } from "node:test"

import { BOOKED_STATUSES, BOOKING_STATUSES, bookingStatusFromCalcom, needsYouTypeFromReason } from "../src/server/db/values.ts"

test("booking statuses are exactly the blueprint's seven", () => {
  assert.deepEqual([...BOOKING_STATUSES], ["requested", "confirmed", "declined", "cancelled", "completed", "no_show", "expired"])
})

test("a booking counts as booked once confirmed (and after it happened)", () => {
  assert.deepEqual([...BOOKED_STATUSES], ["confirmed", "completed", "no_show"])
})

test("Cal.com statuses map onto ours", () => {
  assert.equal(bookingStatusFromCalcom("accepted"), "confirmed")
  assert.equal(bookingStatusFromCalcom("ACCEPTED"), "confirmed")
  assert.equal(bookingStatusFromCalcom("pending"), "requested")
  assert.equal(bookingStatusFromCalcom("cancelled"), "cancelled")
  assert.equal(bookingStatusFromCalcom("rejected"), "declined")
  assert.equal(bookingStatusFromCalcom("something-new"), "confirmed") // Cal.com only returns bookings it made
})

test("needs-you types come from the reason", () => {
  assert.equal(needsYouTypeFromReason("Emergency words: bleeding"), "emergency")
  assert.equal(needsYouTypeFromReason("Customer wants a refund for last week"), "refund")
  assert.equal(needsYouTypeFromReason("Customer complained about the wait"), "complaint")
  assert.equal(needsYouTypeFromReason("Asked whether there is parking"), "question")
})
