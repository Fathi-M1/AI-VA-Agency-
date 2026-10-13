// The Booking agent's tools. Guardrail 2 (capability): these two are the ONLY tools
// it has. There is no cancel, refund, delete, reschedule or price tool anywhere.
// Guardrail 3 (no-invention) is enforced here too: book_appointment only accepts a
// slot that check_availability actually returned in this conversation.
import type { BusinessKnowledge } from "../knowledge/types"
import { createBooking, getAvailableSlots } from "./calcom"

export const BOOKING_TOOL_DECLARATIONS = [
  {
    type: "function" as const,
    name: "check_availability",
    description:
      "Look up REAL open appointment slots in the business calendar for one service over a date range. Returns the only times you may offer.",
    parameters: {
      type: "object",
      properties: {
        eventTypeId: { type: "integer", description: "The service's eventTypeId." },
        dateRange: {
          type: "object",
          description: "Dates to search, inclusive, in the business's timezone.",
          properties: {
            start: { type: "string", description: "First date, YYYY-MM-DD." },
            end: { type: "string", description: "Last date, YYYY-MM-DD." },
          },
          required: ["start", "end"],
        },
      },
      required: ["eventTypeId", "dateRange"],
    },
  },
  {
    type: "function" as const,
    name: "book_appointment",
    description:
      "Create the booking in the business calendar. Only for a slot returned by check_availability.",
    parameters: {
      type: "object",
      properties: {
        eventTypeId: { type: "integer", description: "The service's eventTypeId." },
        slot: {
          type: "string",
          description: "The exact `start` value of the chosen slot from check_availability.",
        },
        name: { type: "string", description: "The person's full name." },
        email: { type: "string", description: "The person's email address." },
      },
      required: ["eventTypeId", "slot", "name", "email"],
    },
  },
]

export type BookingToolState = {
  /** epoch ms -> slot start string, for every slot check_availability returned */
  offered: Map<number, string>
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_DAYS = 14
const MAX_SLOTS = 40

/** "Monday, October 5, 9:00 AM" in the business timezone. */
export function slotLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

function todayIn(timeZone: string) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date())
}

function addDays(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** What a confirmed booking reports back to whoever persists it. */
export type ConfirmedBooking = {
  name: string
  email: string
  service: string
  start: string
  end: string
  calcomUid: string
  status: string
}

export async function executeBookingTool(
  name: string,
  args: Record<string, unknown>,
  ctx: {
    business: BusinessKnowledge
    state: BookingToolState
    /** Called after Cal.com confirms, before the agent reads it back. */
    onBooked?: (b: ConfirmedBooking) => Promise<void>
  }
): Promise<Record<string, unknown>> {
  const { business, state } = ctx
  const service = business.services.find((s) => s.calcomEventTypeId === Number(args.eventTypeId))
  if (!service) {
    return {
      ok: false,
      error: "unknown_service",
      message: `eventTypeId ${String(args.eventTypeId)} is not bookable.`,
    }
  }

  if (name === "check_availability") {
    const range = (args.dateRange ?? {}) as { start?: string; end?: string }
    if (!range.start || !range.end || !DATE.test(range.start) || !DATE.test(range.end)) {
      return { ok: false, error: "bad_date_range", message: "dateRange.start and .end must be YYYY-MM-DD." }
    }
    const today = todayIn(business.timeZone)
    const start = range.start < today ? today : range.start
    let end = range.end < start ? start : range.end
    if (end > addDays(start, MAX_DAYS - 1)) end = addDays(start, MAX_DAYS - 1)

    const slots = (
      await getAvailableSlots({
        eventTypeId: service.calcomEventTypeId,
        start,
        end,
        timeZone: business.timeZone,
      })
    ).slice(0, MAX_SLOTS)
    for (const s of slots) state.offered.set(new Date(s.start).getTime(), s.start)
    return {
      ok: true,
      service: service.name,
      searched: { start, end, timeZone: business.timeZone },
      slots: slots.map((s) => ({ start: s.start, label: slotLabel(s.start, business.timeZone) })),
    }
  }

  if (name === "book_appointment") {
    const slot = String(args.slot ?? "")
    const person = String(args.name ?? "").trim()
    const email = String(args.email ?? "").trim()
    const at = new Date(slot).getTime()
    if (!slot || Number.isNaN(at) || !state.offered.has(at)) {
      return {
        ok: false,
        error: "slot_not_offered",
        message: "That time was not returned by check_availability. Check availability and offer only returned slots.",
      }
    }
    if (!person) return { ok: false, error: "missing_name", message: "Ask for the person's full name." }
    if (!EMAIL.test(email)) return { ok: false, error: "invalid_email", message: "Ask for a valid email address." }

    const result = await createBooking({
      eventTypeId: service.calcomEventTypeId,
      startUtc: new Date(at).toISOString(),
      name: person,
      email,
      timeZone: business.timeZone,
    })
    if (!result.ok) {
      // The docs don't list a specific "slot taken" error, so any refusal is treated as
      // the slot no longer being bookable, and the agent re-checks availability.
      state.offered.delete(at)
      return {
        ok: false,
        error: "slot_unavailable",
        message: `The calendar refused this booking (${result.httpStatus}): ${result.message}`,
      }
    }
    await ctx.onBooked?.({
      name: person,
      email,
      service: service.name,
      start: result.start,
      end: result.end,
      calcomUid: result.uid,
      status: result.status,
    })
    return {
      ok: true,
      service: service.name,
      bookingUid: result.uid,
      status: result.status,
      confirmedStart: slotLabel(result.start, business.timeZone),
      timeZone: business.timeZone,
    }
  }

  return { ok: false, error: "unknown_tool", message: `No tool named ${name}.` }
}
