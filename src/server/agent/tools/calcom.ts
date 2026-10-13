// Cal.com API v2 client (cloud). Endpoints confirmed against the live docs:
// - GET  /v2/slots     cal-api-version: 2024-09-04
//   https://cal.com/docs/api-reference/v2/slots/get-available-time-slots-for-an-event-type
// - POST /v2/bookings  cal-api-version: 2026-02-25
//   https://cal.com/docs/api-reference/v2/bookings/create-a-booking
// Auth: "Authorization: Bearer <api key>". The key is read from env and never logged.

const BASE = "https://api.cal.com/v2"

function apiKey() {
  const key = process.env.CALCOM_API_KEY
  if (!key) throw new Error("CALCOM_API_KEY is not set")
  return key
}

export type CalSlot = { start: string } // ISO 8601 with offset, in the requested timeZone

export async function getAvailableSlots(params: {
  eventTypeId: number
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
  timeZone: string
}): Promise<CalSlot[]> {
  const q = new URLSearchParams({
    eventTypeId: String(params.eventTypeId),
    start: params.start,
    end: params.end,
    timeZone: params.timeZone,
  })
  const res = await fetch(`${BASE}/slots?${q}`, {
    headers: { Authorization: `Bearer ${apiKey()}`, "cal-api-version": "2024-09-04" },
    cache: "no-store",
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || body?.status !== "success") {
    throw new Error(`Cal.com slots failed (${res.status}): ${body?.error?.message ?? "unknown error"}`)
  }
  // data: { "YYYY-MM-DD": [{ start }, ...], ... }
  const byDay = body.data as Record<string, CalSlot[]>
  return Object.values(byDay)
    .flat()
    .map((s) => ({ start: s.start }))
}

export type CalBookingResult =
  | { ok: true; uid: string; start: string; end: string; status: string }
  | { ok: false; httpStatus: number; message: string }

export async function createBooking(params: {
  eventTypeId: number
  startUtc: string // ISO 8601 UTC
  name: string
  email: string
  timeZone: string
}): Promise<CalBookingResult> {
  const res = await fetch(`${BASE}/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "cal-api-version": "2026-02-25",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start: params.startUtc,
      eventTypeId: params.eventTypeId,
      attendee: { name: params.name, email: params.email, timeZone: params.timeZone },
    }),
    cache: "no-store",
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || body?.status !== "success") {
    return {
      ok: false,
      httpStatus: res.status,
      message: String(body?.error?.message ?? body?.message ?? "unknown error"),
    }
  }
  const d = Array.isArray(body.data) ? body.data[0] : body.data
  return { ok: true, uid: d.uid, start: d.start, end: d.end, status: d.status }
}

// Event types (used by the Setup agent to link services to bookable calendar types).
// - GET  /v2/event-types   cal-api-version: 2026-06-12  (own event types)
//   https://cal.com/docs/api-reference/v2/event-types/list-event-types
// - POST /v2/event-types   cal-api-version: 2026-06-12  (title, slug, lengthInMinutes)
//   https://cal.com/docs/api-reference/v2/event-types/create-an-event-type

export type CalEventType = { id: number; title: string; slug: string; lengthInMinutes: number }

export async function listEventTypes(): Promise<CalEventType[]> {
  const res = await fetch(`${BASE}/event-types`, {
    headers: { Authorization: `Bearer ${apiKey()}`, "cal-api-version": "2026-06-12" },
    cache: "no-store",
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || body?.status !== "success" || !Array.isArray(body.data)) {
    throw new Error(`Cal.com event types failed (${res.status}): ${body?.error?.message ?? "unknown error"}`)
  }
  return (body.data as CalEventType[]).map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    lengthInMinutes: e.lengthInMinutes,
  }))
}

export async function createEventType(input: {
  title: string
  slug: string
  lengthInMinutes: number
}): Promise<{ ok: true; eventType: CalEventType } | { ok: false; httpStatus: number; message: string }> {
  const res = await fetch(`${BASE}/event-types`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "cal-api-version": "2026-06-12",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || body?.status !== "success") {
    return { ok: false, httpStatus: res.status, message: String(body?.error?.message ?? body?.message ?? "unknown error") }
  }
  const e = body.data
  return { ok: true, eventType: { id: e.id, title: e.title, slug: e.slug, lengthInMinutes: e.lengthInMinutes } }
}
