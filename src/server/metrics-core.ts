// The one definition of every count the app shows (Phase 0 §9). Pure: no database.
// A count over a period means "came in during that period" (by created / started time),
// the same everywhere, so Home, Today, Dashboard and reports can't disagree.
import { TZDate } from "@date-fns/tz"

import { BOOKED_STATUSES } from "./db/values.ts"

export type Range = { start: string; end: string } // ISO instants, end exclusive

export type MetricRows = {
  conversations: { started_at: string }[]
  bookings: { created_at: string; status: string }[]
  needsYou: { created_at: string; status: string }[]
}

export type Metrics = {
  conversations: number
  /** every booking starts as a booking request */
  requests: number
  /** requests that became bookings (confirmed, then maybe completed or no-show) */
  confirmed: number
  completed: number
  noShows: number
  declined: number
  /** needs-you items open right now, whenever they came in */
  needsYouOpen: number
  /** needs-you items that came in during the period and are done */
  needsYouDone: number
}

const booked = new Set<string>(BOOKED_STATUSES)

export function computeMetrics(rows: MetricRows, range: Range): Metrics {
  const t0 = Date.parse(range.start)
  const t1 = Date.parse(range.end)
  const inRange = (iso: string) => {
    const t = Date.parse(iso)
    return t >= t0 && t < t1
  }
  const bookings = rows.bookings.filter((b) => inRange(b.created_at))
  return {
    conversations: rows.conversations.filter((c) => inRange(c.started_at)).length,
    requests: bookings.length,
    confirmed: bookings.filter((b) => booked.has(b.status)).length,
    completed: bookings.filter((b) => b.status === "completed").length,
    noShows: bookings.filter((b) => b.status === "no_show").length,
    declined: bookings.filter((b) => b.status === "declined").length,
    needsYouOpen: rows.needsYou.filter((n) => n.status === "open").length,
    needsYouDone: rows.needsYou.filter((n) => n.status === "done" && inRange(n.created_at)).length,
  }
}

/** Monday 00:00 → next Monday 00:00 in the business's timezone (Asia/Manila by default). */
export function weekRange(nowMs: number, timeZone = "Asia/Manila"): Range {
  const now = new TZDate(nowMs, timeZone)
  const dow = (now.getDay() + 6) % 7 // Monday = 0
  const start = new TZDate(now.getFullYear(), now.getMonth(), now.getDate() - dow, timeZone)
  const end = new TZDate(now.getFullYear(), now.getMonth(), now.getDate() - dow + 7, timeZone)
  return { start: new Date(start.getTime()).toISOString(), end: new Date(end.getTime()).toISOString() }
}
