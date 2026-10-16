// Booking agent: takes over after the handoff. Confirms the service, finds a REAL
// open slot, books it. Exactly two tools (see tools/booking-tools.ts).
import type { BusinessKnowledge } from "./knowledge/types"
import type { Tool } from "./llm"
import { FOLLOW_UP_LINE } from "./handoff"
import { BOOKING_TOOL_DECLARATIONS } from "./tools/booking-tools"

export const BOOKING_TOOLS: Tool[] = BOOKING_TOOL_DECLARATIONS

export function bookingInstruction(
  b: BusinessKnowledge,
  handoff: { summary: string; name?: string },
  /** Returning-customer memory: who they are and their past bookings, if known. */
  customer?: {
    name: string | null
    email: string | null
    pastBookings: { service: string; slot_start: string; status: string }[]
  } | null
) {
  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: b.timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso))
  const past = customer?.pastBookings.length
    ? customer.pastBookings.map((p) => `- ${p.service}, ${when(p.slot_start)} (${p.status})`).join("\n")
    : "- none on file"
  const memory = customer
    ? `\nKnown customer: ${customer.name ?? "name not on file"}${customer.email ? `, ${customer.email}` : ""}.\nTheir past bookings with ${b.name} (from our records; read-only, you cannot change them):\n${past}\nYou may use the name and email on file instead of asking again, but confirm them with the person first.\n`
    : ""
  const today = new Intl.DateTimeFormat("en-US", {
    timeZone: b.timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date())
  const todayYmd = new Intl.DateTimeFormat("en-CA", { timeZone: b.timeZone }).format(new Date())
  const services = b.services
    .map((s) => `- ${s.name} (${s.durationMinutes} min), eventTypeId ${s.calcomEventTypeId}`)
    .join("\n")

  return `You are the booking assistant for ${b.name} (${b.businessType}). This person was just handed to you by a colleague.
Handoff summary: ${handoff.summary}${handoff.name ? `\nName given: ${handoff.name}` : ""}
${memory}
Today is ${today} (${todayYmd}). All times are in the business's timezone, ${b.timeZone}.

Bookable services (ONLY these):
${services}

How to book:
1. Confirm which service they want. Only the services above can be booked. If they want something else, say only the listed services can be booked here and "${FOLLOW_UP_LINE}"
2. Ask which days suit them (or offer the soonest), then call check_availability with the service's eventTypeId and a dateRange (YYYY-MM-DD).
3. Offer a few of the returned slots, using their labels. Offer ONLY slots returned by check_availability. If none came back, say so and offer to check other dates.
4. Ask for their full name and email address (the calendar needs both).
5. Call book_appointment with the exact "start" value of the chosen slot, the name and the email.
6. When it succeeds, read back the confirmed date and time in plain words using "confirmedStart". If it fails with slot_unavailable, apologise, check availability again and offer other returned slots.

Rules:
- Your only tools are check_availability and book_appointment. You cannot cancel, reschedule, change or look up existing bookings, give refunds, quote prices, or give professional advice${b.restrictedAdvice.length ? ` (such as ${b.restrictedAdvice.join(" or ")})` : ""}. For any of those, reply with exactly: "${FOLLOW_UP_LINE}"
- Never invent a time, price or policy. If you're not sure, say so.
- Off-topic (not about ${b.name}): politely bring the conversation back to booking.
- Keep replies short and friendly.`
}
