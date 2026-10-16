// Phase 0 §9: one module computes every count shown anywhere, so Dashboard and Today
// can't disagree. Weeks are Monday 00:00 → next Monday 00:00 in Asia/Manila.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import { computeMetrics, weekRange } from "../src/server/metrics-core.ts"

test("a week runs Monday 00:00 to the next Monday 00:00 in Manila", () => {
  // Friday Oct 16, 2026, 12:00 noon in Manila = 04:00 UTC
  const w = weekRange(Date.parse("2026-10-16T04:00:00Z"), "Asia/Manila")
  assert.equal(w.start, "2026-10-11T16:00:00.000Z") // Mon Oct 12, 00:00 Manila
  assert.equal(w.end, "2026-10-18T16:00:00.000Z") // Mon Oct 19, 00:00 Manila
})

test("late Sunday night in Manila still belongs to that week", () => {
  // Sun Oct 18, 23:30 Manila = 15:30 UTC
  const w = weekRange(Date.parse("2026-10-18T15:30:00Z"), "Asia/Manila")
  assert.equal(w.start, "2026-10-11T16:00:00.000Z")
})

const range = { start: "2026-10-11T16:00:00.000Z", end: "2026-10-18T16:00:00.000Z" }
const inside = "2026-10-14T02:00:00.000Z"
const before = "2026-10-10T02:00:00.000Z"

test("counts conversations, requests, confirmed, completed, no-shows in the range", () => {
  const m = computeMetrics(
    {
      conversations: [{ started_at: inside }, { started_at: inside }, { started_at: before }],
      bookings: [
        { created_at: inside, status: "requested" },
        { created_at: inside, status: "confirmed" },
        { created_at: inside, status: "completed" },
        { created_at: inside, status: "no_show" },
        { created_at: inside, status: "declined" },
        { created_at: before, status: "confirmed" },
      ],
      needsYou: [
        { created_at: inside, status: "open" },
        { created_at: before, status: "open" },
        { created_at: inside, status: "done" },
      ],
    },
    range
  )
  assert.deepEqual(m, {
    conversations: 2,
    requests: 5, // every booking starts as a request
    confirmed: 3, // confirmed, completed and no-show were all confirmed
    completed: 1,
    noShows: 1,
    declined: 1,
    needsYouOpen: 2, // open now, whenever it came in
    needsYouDone: 1, // marked done, created in the range
  })
})

test("an empty business counts zero everywhere (never hides a tile)", () => {
  const m = computeMetrics({ conversations: [], bookings: [], needsYou: [] }, range)
  assert.deepEqual(Object.values(m), [0, 0, 0, 0, 0, 0, 0, 0])
})

// Dashboard, Today and the Agents page must take their counts from the same module.

test("Dashboard, Today and Agents read their counts from server/metrics.ts", () => {
  const views = readFileSync("src/server/db/views.ts", "utf8")
  const today = readFileSync("src/server/db/today.ts", "utf8")
  for (const [name, src] of [["views.ts", views], ["today.ts", today]] as const) {
    assert.match(src, /from "\.\.\/metrics"/, `${name} must use server/metrics.ts`)
    assert.match(src, /weekRange\(/, `${name} must use the one week definition`)
  }
  assert.ok((views.match(/getMetrics\(/g) ?? []).length >= 2, "Dashboard and Agents counts")
  assert.match(today, /const weekCounts[\s\S]*?getMetrics\(/, "Today's week counts")
  assert.doesNotMatch(today, /\.gte\("slot_start", week\.start\)/, "Today must not count bookings its own way")
})
