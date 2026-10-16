"use server"

// Today's actions. Each one checks that the signed-in user is a member of the business
// first; reads and writes then run as that user, so row-level security applies too.
import { TZDate } from "@date-fns/tz"

import { time12, toMinutes } from "@/lib/format"
import { getBusinessProfile } from "@/server/db/business-profile"
import { db } from "@/server/db/client"
import { ticketUrl } from "@/server/booking-url"
import { requireMember } from "@/server/auth"

export type ConfirmResult =
  | { ok: true; message: string; dateLabel: string; timeLabel: string }
  | { ok: false; error: string }

/** Confirm a booking request: date + time within the team member's hours, and no
 *  overlap with that member's confirmed bookings (re-checked here on the server). */
export async function confirmRequest(businessId: string, input: {
  bookingId: string
  date: string // YYYY-MM-DD in the business timezone
  time: string // HH:MM
  staffId: string
}): Promise<ConfirmResult> {
  await requireMember(businessId)
  const business = await getBusinessProfile(businessId)
  const tz = business.config.timezone

  const { data: booking, error } = await db()
    .from("bookings")
    .select("*, customers(name)")
    .eq("business_id", businessId)
    .eq("id", input.bookingId)
    .maybeSingle()
  if (error || !booking) return { ok: false, error: "We couldn't find this request. Refresh and try again." }
  if (booking.status !== "requested") return { ok: false, error: "This request was already answered." }

  const member = business.staff.find((m) => m.id === input.staffId && m.active)
  if (!member) return { ok: false, error: "Pick a team member." }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) return { ok: false, error: "Pick a date and time." }

  const [y, mo, d] = input.date.split("-").map(Number)
  const [h, mi] = input.time.split(":").map(Number)
  const start = new TZDate(y, mo - 1, d, h, mi, tz)
  const details = (booking.details ?? {}) as { estimate?: { duration_minutes?: number } }
  const minutes = details.estimate?.duration_minutes ?? business.services.find((s) => s.name === booking.service)?.duration_minutes ?? 60
  const end = new Date(start.getTime() + minutes * 60_000)

  // Within the member's hours that weekday (the whole visit fits in one shift).
  const weekday = start.getDay()
  const from = toMinutes(input.time)
  const fits = member.hours.some(
    (s) => s.weekday === weekday && from >= toMinutes(s.start_time) && from + minutes <= toMinutes(s.end_time)
  )
  if (!fits) return { ok: false, error: `${member.name} doesn't work at this time. Pick another time or team member.` }

  const startIso = new Date(start.getTime()).toISOString()
  const endIso = end.toISOString()
  const { data: clash, error: clashErr } = await db()
    .from("bookings")
    .select("id")
    .eq("business_id", businessId)
    .eq("staff_id", member.id)
    .eq("status", "confirmed")
    .lt("slot_start", endIso)
    .gt("slot_end", startIso)
    .limit(1)
  if (clashErr) return { ok: false, error: "We couldn't save. Check your connection and tap Try again." }
  if (clash?.length) return { ok: false, error: `${member.name} already has a booking at ${time12(input.time)}. Pick another time.` }

  const { error: upErr } = await db()
    .from("bookings")
    .update({ status: "confirmed", slot_start: startIso, slot_end: endIso, staff_id: member.id })
    .eq("business_id", businessId)
    .eq("id", booking.id)
    .eq("status", "requested")
  if (upErr) return { ok: false, error: "We couldn't save. Check your connection and tap Try again." }

  const name = (booking.customers as unknown as { name: string | null } | null)?.name ?? "there"
  const dateLabel = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(start)
  const timeLabel = time12(input.time)
  // Form requests have a ticket page the customer can check; include its link.
  const ticket = booking.source === "form" && booking.ticket_token && business.booking_slug ? await ticketUrl(business.booking_slug, booking.ticket_token) : null
  return {
    ok: true,
    dateLabel,
    timeLabel,
    message: ticket
      ? `Hi ${name}! This is ${business.name}. Your ${booking.service} is confirmed for ${dateLabel} at ${timeLabel}. Your ticket: ${ticket}`
      : `Hi ${name}! This is ${business.name}. Your ${booking.service} is confirmed for ${dateLabel} at ${timeLabel}. See you!`,
  }
}

export async function declineRequest(businessId: string, input: { bookingId: string; reason: string; note?: string }) {
  await requireMember(businessId)
  const reason = [input.reason, input.note?.trim()].filter(Boolean).join(": ").slice(0, 300)
  if (!input.reason) return { ok: false as const, error: "Pick a reason." }
  const { data, error } = await db()
    .from("bookings")
    .update({ status: "declined", decline_reason: reason })
    .eq("business_id", businessId)
    .eq("id", input.bookingId)
    .eq("status", "requested")
    .select("id")
  if (error || !data?.length) return { ok: false as const, error: "We couldn't save. Check your connection and tap Try again." }
  return { ok: true as const }
}

/** "Mark as done" on a needs-you item. */
export async function resolveItem(businessId: string, id: string) {
  await requireMember(businessId)
  const { error } = await db().from("needs_you_items").update({ status: "done" }).eq("business_id", businessId).eq("id", id)
  return { ok: !error }
}
