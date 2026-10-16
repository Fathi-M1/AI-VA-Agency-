// Loads the rows behind every count (Phase 0 §9) and hands them to metrics-core.ts, the
// one definition of each number. Dashboard, Today and the Agents page all read this.
import { cache } from "react"

import { db } from "./db/client"
import { computeMetrics, type Metrics, type Range } from "./metrics-core"

export { weekRange, type Metrics, type Range } from "./metrics-core"

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`DB ${what} failed: ${error?.message ?? "no data"}`)
}

/** Every count for one business over one period (cached per request). */
export const getMetrics = cache(async (businessId: string, start: string, end: string): Promise<Metrics> => {
  const range: Range = { start, end }
  const [conversations, bookings, needsYou] = await Promise.all([
    db().from("conversations").select("started_at").eq("business_id", businessId).gte("started_at", start).lt("started_at", end),
    db().from("bookings").select("created_at, status").eq("business_id", businessId).gte("created_at", start).lt("created_at", end),
    // open items (whenever they came in) + items that came in during the period
    db().from("needs_you_items").select("created_at, status").eq("business_id", businessId).or(`status.eq.open,created_at.gte.${start}`),
  ])
  if (conversations.error) fail("count conversations", conversations.error)
  if (bookings.error) fail("count bookings", bookings.error)
  if (needsYou.error) fail("count needs-you items", needsYou.error)
  return computeMetrics(
    { conversations: conversations.data ?? [], bookings: bookings.data ?? [], needsYou: needsYou.data ?? [] },
    range
  )
})

/** Has this business ever had a conversation? (kind empty states) */
export const hasAnyConversation = cache(async (businessId: string) => {
  const { count, error } = await db().from("conversations").select("id", { count: "exact", head: true }).eq("business_id", businessId)
  if (error) fail("count conversations", error)
  return (count ?? 0) > 0
})
