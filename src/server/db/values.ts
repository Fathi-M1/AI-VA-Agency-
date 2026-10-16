// The one set of status and type values every screen, agent and report uses (blueprint:
// Core objects). The database enforces the same lists (migrations 20261016000400–000600).

export const BOOKING_STATUSES = ["requested", "confirmed", "declined", "cancelled", "completed", "no_show", "expired"] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

/** A booking request that became a booking (a confirmed time, or one that has happened). */
export const BOOKED_STATUSES = ["confirmed", "completed", "no_show"] as const satisfies readonly BookingStatus[]
export const isBooked = (status: string) => (BOOKED_STATUSES as readonly string[]).includes(status)

export const MESSAGE_ROLES = ["customer", "agent", "owner", "system"] as const
export type MessageRole = (typeof MESSAGE_ROLES)[number]

export const NEEDS_YOU_TYPES = ["emergency", "question", "refund", "complaint", "other"] as const
export type NeedsYouType = (typeof NEEDS_YOU_TYPES)[number]
export type NeedsYouStatus = "open" | "done"

/** Legacy Cal.com connection (switched off): its booking statuses mapped onto ours. */
export function bookingStatusFromCalcom(status: string): BookingStatus {
  const s = status.toLowerCase()
  if (s === "pending") return "requested"
  if (s === "cancelled" || s === "canceled") return "cancelled"
  if (s === "rejected") return "declined"
  return "confirmed" // accepted (and anything else Cal.com created)
}

/** The type of a needs-you item an agent creates, from its plain-English reason. */
export function needsYouTypeFromReason(reason: string): NeedsYouType {
  if (/^emergency words/i.test(reason)) return "emergency"
  if (/refund/i.test(reason)) return "refund"
  if (/complain/i.test(reason)) return "complaint"
  return "question"
}
