// Read layer for the owner's Today screen. Real rows only, every query scoped by
// business id; "today" and "this week" are in the business's timezone.
import { cache } from "react"
import { TZDate } from "@date-fns/tz"

import { getBusinessProfile, type BusinessProfile } from "./business-profile"
import { db } from "./client"

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`DB ${what} failed: ${error?.message ?? "no data"}`)
}

/** Confirmed appointments (one booking system for everyone). */
export const CONFIRMED = ["confirmed"]

/** The business and the moments Today is measured from (cached per request). */
export const todayBase = cache(async (businessId: string) => {
  const profile = await getBusinessProfile(businessId)
  const tz = profile.config.timezone
  const nowMs = Date.now()
  const now = new TZDate(nowMs, tz)
  const dayStart = new TZDate(now.getFullYear(), now.getMonth(), now.getDate(), tz)
  const dayEnd = new TZDate(now.getFullYear(), now.getMonth(), now.getDate() + 1, tz)
  const dow = (now.getDay() + 6) % 7 // Monday = 0
  const weekStart = new TZDate(now.getFullYear(), now.getMonth(), now.getDate() - dow, tz)
  const weekEnd = new TZDate(now.getFullYear(), now.getMonth(), now.getDate() - dow + 7, tz)
  const iso = (d: Date) => new Date(d.getTime()).toISOString()
  // "Since your last visit"; first visit: since setup.
  const since = profile.last_seen_at ?? profile.setup_completed_at ?? iso(dayStart)
  return {
    profile,
    tz,
    nowMs,
    hour: now.getHours(),
    dateLabel: new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric" }).format(now),
    day: { start: iso(dayStart), end: iso(dayEnd) },
    week: { start: iso(weekStart), end: iso(weekEnd) },
    since,
    firstVisit: !profile.last_seen_at,
  }
})

export const timeIn = (tz: string, iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso))

export const dateIn = (tz: string, iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(new Date(iso))

/* ---------------------------------------------------------------- appointments */

export type Appointment = { id: string; start: string; customer: string; service: string; teamMember: string | null }

export const todaysAppointments = cache(async (businessId: string): Promise<Appointment[]> => {
  const { day, profile } = await todayBase(businessId)
  const { data, error } = await db()
    .from("bookings")
    .select("id, service, slot_start, staff_id, customers(name, email)")
    .eq("business_id", businessId)
    .in("status", CONFIRMED)
    .gte("slot_start", day.start)
    .lt("slot_start", day.end)
    .order("slot_start")
  if (error) fail("list today's appointments", error)
  return (data ?? []).map((b) => {
    const c = b.customers as unknown as { name: string | null; email: string | null } | null
    return {
      id: b.id,
      start: b.slot_start as string,
      customer: c?.name ?? c?.email ?? "New customer",
      service: b.service,
      teamMember: profile.staff.find((m) => m.id === b.staff_id)?.name ?? null,
    }
  })
})

/* ---------------------------------------------------------------- needs you */

export type BookingRequest = {
  id: string
  createdAt: string
  customer: string
  mobile: string
  service: string
  details: string
  preferredTime: string
  estimate: { price: number | null; duration_minutes: number; notes: string[] } | null
  durationMinutes: number
  staffId: string | null
  conversationId: string | null
  /** set by the booking form (migration 005); null for chat requests */
  referenceCode: string | null
  /** private ticket token (the ticket link) */
  ticketToken: string | null
  preferredDay: string | null
  preferredTimeOfDay: "morning" | "afternoon" | "evening" | null
  source: "form" | "chat"
}

export type OpenItem = { id: string; createdAt: string; reason: string; customer: string; conversationId: string | null }

function serviceMinutes(p: BusinessProfile, name: string) {
  return p.services.find((s) => s.name === name)?.duration_minutes ?? 60
}

export const needsYou = cache(async (businessId: string) => {
  const { profile } = await todayBase(businessId)
  const [reqs, escs] = await Promise.all([
    db()
      .from("bookings")
      // "*" so this works whichever migrations have run (missing columns read as undefined).
      .select("*, customers(name)")
      .eq("business_id", businessId)
      .eq("status", "requested")
      .order("created_at", { ascending: false }),
    db()
      .from("needs_you_items")
      .select("id, created_at, reason, conversation_id, customers(name, email)")
      .eq("business_id", businessId)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
  ])
  if (reqs.error) fail("list booking requests", reqs.error)
  if (escs.error) fail("list open items", escs.error)
  const requests: BookingRequest[] = (reqs.data ?? []).map((r) => {
    const d = (r.details ?? {}) as { summary?: string; estimate?: BookingRequest["estimate"] }
    const c = r.customers as unknown as { name: string | null } | null
    return {
      id: r.id,
      createdAt: r.created_at,
      customer: c?.name ?? "New customer",
      mobile: r.customer_mobile ?? "",
      service: r.service,
      details: d.summary ?? r.service,
      preferredTime: r.requested_time_text ?? "",
      estimate: d.estimate ?? null,
      durationMinutes: d.estimate?.duration_minutes ?? serviceMinutes(profile, r.service),
      staffId: r.staff_id,
      conversationId: r.conversation_id,
      referenceCode: r.reference_code ?? null,
      ticketToken: r.ticket_token ?? null,
      preferredDay: r.preferred_day ?? null,
      preferredTimeOfDay: r.preferred_time_of_day ?? null,
      source: r.source === "form" ? "form" : "chat",
    }
  })
  const items: OpenItem[] = (escs.data ?? []).map((e) => {
    const c = e.customers as unknown as { name: string | null; email: string | null } | null
    return {
      id: e.id,
      createdAt: e.created_at,
      reason: e.reason,
      customer: c?.name ?? c?.email ?? "New customer",
      conversationId: e.conversation_id,
    }
  })
  return { requests, items }
})

/* ---------------------------------------------------------------- handled by AI */

export type Handled = { id: string; customer: string; outcome: string; at: string }

type ConvRow = {
  id: string
  started_at: string
  customers: { name: string | null; email: string | null } | null
  messages: { role: string; agent: string | null }[]
  bookings: { status: string; requested_time_text: string | null }[]
  needs_you_items: { reason: string }[]
}

function outcomeOf(c: ConvRow) {
  if (c.needs_you_items.some((e) => e.reason.startsWith("Emergency words"))) return "Emergency message shown"
  if (c.bookings.some((b) => b.requested_time_text !== null)) return "Sent a booking request"
  if (c.bookings.length) return "Booked an appointment"
  if (c.needs_you_items.length) return "Asked something the team needs to answer"
  const agents = new Set(c.messages.map((m) => m.agent).filter(Boolean))
  if (agents.has("sales")) return "Asked about prices and services"
  if (agents.has("support")) return "Asked a question"
  if (agents.has("booking")) return "Started a booking request"
  return "Said hello"
}

export const handledSince = cache(async (businessId: string) => {
  const { since } = await todayBase(businessId)
  const { data, error, count } = await db()
    .from("conversations")
    .select(
      "id, started_at, customers(name, email), messages(role, agent), bookings(status, requested_time_text), needs_you_items(reason)",
      { count: "exact" }
    )
    .eq("business_id", businessId)
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(5)
  if (error) fail("list handled conversations", error)
  const rows = (data ?? []) as unknown as ConvRow[]
  return {
    total: count ?? rows.length,
    recent: rows.map(
      (c): Handled => ({
        id: c.id,
        customer: c.customers?.name ?? c.customers?.email ?? "New customer",
        outcome: outcomeOf(c),
        at: c.started_at,
      })
    ),
  }
})

/* ---------------------------------------------------------------- this week */

export const weekCounts = cache(async (businessId: string) => {
  const { week } = await todayBase(businessId)
  const head = { count: "exact" as const, head: true }
  const [convs, reqs, confirmed] = await Promise.all([
    db().from("conversations").select("id", head).eq("business_id", businessId).gte("started_at", week.start).lt("started_at", week.end),
    db()
      .from("bookings")
      .select("id", head)
      .eq("business_id", businessId)
      .not("requested_time_text", "is", null)
      .gte("created_at", week.start)
      .lt("created_at", week.end),
    db()
      .from("bookings")
      .select("id", head)
      .eq("business_id", businessId)
      .in("status", CONFIRMED)
      .gte("slot_start", week.start)
      .lt("slot_start", week.end),
  ])
  for (const r of [convs, reqs, confirmed]) if (r.error) fail("count this week", r.error)
  return { conversations: convs.count ?? 0, requests: reqs.count ?? 0, confirmed: confirmed.count ?? 0 }
})

/** Has any booking request ever been confirmed? (checklist item 3) */
export async function anyRequestConfirmed(businessId: string) {
  const { count, error } = await db()
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "confirmed")
  if (error) fail("count confirmed", error)
  return (count ?? 0) > 0
}

/** A team member's confirmed bookings from a moment on (for the confirm sheet). */
export async function staffBusy(businessId: string, fromIso: string) {
  const { data, error } = await db()
    .from("bookings")
    .select("staff_id, slot_start, slot_end")
    .eq("business_id", businessId)
    .eq("status", "confirmed")
    .not("staff_id", "is", null)
    .gte("slot_end", fromIso)
  if (error) fail("list busy times", error)
  return (data ?? []) as { staff_id: string; slot_start: string; slot_end: string }[]
}
