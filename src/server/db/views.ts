// Read-only views of the real data for the app's screens. Every query is scoped by the
// business_id passed in. Nothing here writes, and nothing here invents a value: a field
// with no real source is simply absent (the screens hide it).
import type { TrendPoint, WeekSummary } from "@/lib/dashboard-data"

import { getBusinessRow, type BusinessConfig } from "./business-config"
import { db } from "./client"

/* ---------------------------------------------------------------- shared */

export type AgentTag = "receptionist" | "booking" | "sales" | "support"
export type Outcome = "Booked" | "Escalated" | "Open"

const AGENT_LABEL: Record<AgentTag, string> = {
  receptionist: "Receptionist",
  booking: "Booking",
  sales: "Sales",
  support: "Support",
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`DB ${what} failed: ${error?.message ?? "no data"}`)
}

async function businessTimeZone(businessId: string): Promise<{ name: string; timeZone: string }> {
  const row = await getBusinessRow(businessId)
  return { name: row.name, timeZone: row.config.timezone }
}

const fmt = (timeZone: string, iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone, ...opts }).format(new Date(iso))

export const whenLabel = (timeZone: string, iso: string) =>
  fmt(timeZone, iso, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Monday 00:00 → next Monday 00:00 in the business timezone, as UTC instants. */
function currentWeek(timeZone: string) {
  const now = new Date()
  // Wall-clock parts of "now" in the business timezone.
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  )
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday)
  const localMidnight = Date.UTC(+parts.year, +parts.month - 1, +parts.day) - dow * 864e5
  // Offset of the timezone at that moment (business tz minus UTC).
  const probe = new Date(localMidnight)
  const asLocal = new Date(probe.toLocaleString("en-US", { timeZone }))
  const asUtc = new Date(probe.toLocaleString("en-US", { timeZone: "UTC" }))
  const offset = asLocal.getTime() - asUtc.getTime()
  const start = new Date(localMidnight - offset)
  const end = new Date(start.getTime() + 7 * 864e5)
  const label = `${fmt(timeZone, start.toISOString(), { month: "short", day: "numeric" })} – ${fmt(
    timeZone,
    new Date(end.getTime() - 1).toISOString(),
    { month: "short", day: "numeric", year: "numeric" }
  )}`
  return { start: start.toISOString(), end: end.toISOString(), label }
}

/* ---------------------------------------------------------------- conversations */

export type TranscriptLine = { who: string; role: "user" | "agent"; at: string; text: string }

export type ConversationView = {
  id: string
  contactId: string | null
  customer: string // contact name, or "Unknown contact"
  customerNote: string // contact email, or "No email given"
  when: string
  startedAt: string
  channel: string
  agents: string[]
  outcome: Outcome
  status: string
  messageCount: number
  transcript: TranscriptLine[]
  /** raw role + timestamp per message, oldest first (for timing metrics) */
  rawMessages: { role: "user" | "agent"; created_at: string }[]
}

type ConversationRow = {
  id: string
  contact_id: string | null
  channel: string
  status: string
  started_at: string
  contacts: { name: string | null; email: string | null } | null
  messages: { role: "user" | "agent"; agent: AgentTag | null; content: string; created_at: string }[]
  bookings: { id: string; status: string }[]
  escalations: { id: string }[]
}

/** Booking requests that are still open or were declined aren't bookings. */
const NOT_BOOKED = ["requested", "declined"]
const isBooked = (b: { status: string }) => !NOT_BOOKED.includes(b.status)

function toConversationView(timeZone: string, c: ConversationRow): ConversationView {
  const msgs = [...c.messages].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const agents = [...new Set(msgs.map((m) => m.agent).filter((a): a is AgentTag => !!a))].map((a) => AGENT_LABEL[a])
  const name = c.contacts?.name ?? null
  return {
    id: c.id,
    contactId: c.contact_id,
    customer: name ?? c.contacts?.email ?? "Unknown contact",
    customerNote: c.contacts?.email ?? "No email given",
    when: whenLabel(timeZone, c.started_at),
    startedAt: c.started_at,
    channel: capitalize(c.channel),
    agents,
    outcome: c.bookings.some(isBooked) ? "Booked" : c.escalations.length ? "Escalated" : "Open",
    status: c.status,
    messageCount: msgs.length,
    rawMessages: msgs.map((m) => ({ role: m.role, created_at: m.created_at })),
    transcript: msgs.map((m) => ({
      who: m.role === "user" ? (name ?? "Patient") : m.agent ? AGENT_LABEL[m.agent] : "Safety net",
      role: m.role,
      at: fmt(timeZone, m.created_at, { hour: "numeric", minute: "2-digit" }),
      text: m.content,
    })),
  }
}

const CONVERSATION_SELECT =
  "id, contact_id, channel, status, started_at, contacts(name, email), messages(role, agent, content, created_at), bookings(id, status), escalations(id)"

export async function listConversations(businessId: string): Promise<ConversationView[]> {
  const { timeZone } = await businessTimeZone(businessId)
  const { data, error } = await db()
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("business_id", businessId)
    .order("started_at", { ascending: false })
  if (error || !data) fail("list conversations", error)
  return (data as unknown as ConversationRow[]).map((c) => toConversationView(timeZone, c))
}

/* ---------------------------------------------------------------- contacts */

export type ContactView = {
  id: string
  name: string // name, or the email when no name is on file
  email: string | null
  phone: string | null
  firstSeen: string
  firstSeenAt: string
  lastContact: { channel: string; when: string; at: string } | null
  nextVisit: string | null
  openEscalation: boolean
  bookedByAi: boolean
  bookings: { id: string; service: string; when: string; status: string; upcoming: boolean }[]
  conversations: { id: string; when: string; channel: string; agents: string[]; messageCount: number; firstMessage: string | null }[]
}

type ContactRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  created_at: string
  bookings: { id: string; service: string; slot_start: string | null; status: string }[]
  escalations: { status: string }[]
  conversations: {
    id: string
    channel: string
    started_at: string
    messages: { role: "user" | "agent"; agent: AgentTag | null; content: string; created_at: string }[]
  }[]
}

export async function listContacts(businessId: string): Promise<ContactView[]> {
  const { timeZone } = await businessTimeZone(businessId)
  const { data, error } = await db()
    .from("contacts")
    .select(
      "id, name, email, phone, created_at, bookings(id, service, slot_start, status), escalations(status), conversations(id, channel, started_at, messages(role, agent, content, created_at))"
    )
    .eq("business_id", businessId)
  if (error || !data) fail("list contacts", error)
  const now = Date.now()
  const views = (data as unknown as ContactRow[]).map((c): ContactView => {
    const convs = [...c.conversations].sort((a, b) => b.started_at.localeCompare(a.started_at))
    const lastMsgAt = convs
      .flatMap((cv) => cv.messages.map((m) => m.created_at))
      .sort()
      .at(-1)
    const bookings = [...c.bookings].sort((a, b) => (b.slot_start ?? "").localeCompare(a.slot_start ?? ""))
    const upcoming = bookings
      .filter((b): b is typeof b & { slot_start: string } => !!b.slot_start && new Date(b.slot_start).getTime() > now && b.status !== "cancelled")
      .sort((a, b) => a.slot_start.localeCompare(b.slot_start))[0]
    return {
      id: c.id,
      name: c.name ?? c.email ?? "Unknown contact",
      email: c.email,
      phone: c.phone,
      firstSeen: fmt(timeZone, c.created_at, { month: "short", day: "numeric", year: "numeric" }),
      firstSeenAt: c.created_at,
      lastContact: convs[0]
        ? {
            channel: capitalize(convs[0].channel),
            when: whenLabel(timeZone, lastMsgAt ?? convs[0].started_at),
            at: lastMsgAt ?? convs[0].started_at,
          }
        : null,
      nextVisit: upcoming ? `${whenLabel(timeZone, upcoming.slot_start)} · ${upcoming.service}` : null,
      openEscalation: c.escalations.some((e) => e.status === "open"),
      bookedByAi: c.bookings.some(isBooked), // only the Booking agent writes bookings
      bookings: bookings.map((b) => ({
        id: b.id,
        service: b.service,
        when: b.slot_start ? whenLabel(timeZone, b.slot_start) : "Requested",
        status: b.status,
        upcoming: !!b.slot_start && new Date(b.slot_start).getTime() > now,
      })),
      conversations: convs.map((cv) => {
        const msgs = [...cv.messages].sort((a, b) => a.created_at.localeCompare(b.created_at))
        return {
          id: cv.id,
          when: whenLabel(timeZone, cv.started_at),
          channel: capitalize(cv.channel),
          agents: [...new Set(msgs.map((m) => m.agent).filter((a): a is AgentTag => !!a))].map((a) => AGENT_LABEL[a]),
          messageCount: msgs.length,
          firstMessage: msgs.find((m) => m.role === "user")?.content ?? null,
        }
      }),
    }
  })
  // Most recent contact first.
  return views.sort((a, b) => (b.lastContact?.at ?? b.firstSeenAt).localeCompare(a.lastContact?.at ?? a.firstSeenAt))
}

/* ---------------------------------------------------------------- escalations */

export type EscalationView = {
  id: string
  reason: string
  status: string
  who: string
  email: string | null
  when: string
  createdAt: string
  conversation: ConversationView | null
}

type EscalationRow = {
  id: string
  reason: string
  status: string
  created_at: string
  contacts: { name: string | null; email: string | null } | null
  conversations: ConversationRow | null
}

export async function listEscalations(businessId: string): Promise<EscalationView[]> {
  const { timeZone } = await businessTimeZone(businessId)
  const { data, error } = await db()
    .from("escalations")
    .select(`id, reason, status, created_at, contacts(name, email), conversations(${CONVERSATION_SELECT})`)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
  if (error || !data) fail("list escalations", error)
  return (data as unknown as EscalationRow[]).map((e) => ({
    id: e.id,
    reason: e.reason,
    status: e.status,
    who: e.contacts?.name ?? e.contacts?.email ?? "Unknown contact",
    email: e.contacts?.email ?? null,
    when: whenLabel(timeZone, e.created_at),
    createdAt: e.created_at,
    conversation: e.conversations ? toConversationView(timeZone, e.conversations) : null,
  }))
}

export async function countOpenEscalations(businessId: string): Promise<number> {
  const { data, error } = await db()
    .from("escalations")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "open")
  if (error || !data) fail("count escalations", error)
  return data.length
}

/* ---------------------------------------------------------------- dashboard */

async function businessConfig(businessId: string): Promise<BusinessConfig> {
  return (await getBusinessRow(businessId)).config
}

/** True when the instant falls outside the configured opening hours (business tz). */
function isAfterHours(cfg: BusinessConfig, iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: cfg.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value])
  )
  const day = parts.weekday.toLowerCase().slice(0, 3) as keyof BusinessConfig["hours"]
  const range = cfg.hours[day]
  if (!range) return true
  const [open, close] = range.split("-")
  const hhmm = `${parts.hour}:${parts.minute}`
  return hhmm < open || hhmm >= close
}

const isoOf = (s: string) => new Date(s).toISOString()

export type DashboardView = {
  week: WeekSummary
  trend: TrendPoint[]
  recent: ConversationView[]
  /** conversations this week each agent took part in */
  byAgent: Record<AgentTag, number>
}

export async function getDashboard(businessId: string): Promise<DashboardView> {
  const cfg = await businessConfig(businessId)
  const timeZone = cfg.timezone
  const week = currentWeek(timeZone)
  const inRange = (iso: string, start: string, end: string) => iso >= start && iso < end
  const inWeek = (s: string) => inRange(isoOf(s), week.start, week.end)
  const avgJobValue = cfg.avg_job_value ?? 0

  const trendStart = new Date(new Date(week.start).getTime() - 7 * 7 * 864e5).toISOString()
  const [conversations, escalations, bookingsRes] = await Promise.all([
    listConversations(businessId),
    listEscalations(businessId),
    db()
      .from("bookings")
      .select("id, created_at, conversation_id")
      .eq("business_id", businessId)
      .not("status", "in", `(${NOT_BOOKED.join(",")})`)
      .gte("created_at", trendStart)
      .lt("created_at", week.end),
  ])
  if (bookingsRes.error || !bookingsRes.data) fail("list bookings", bookingsRes.error)
  const bookings = bookingsRes.data as { id: string; created_at: string; conversation_id: string | null }[]

  const weekConvs = conversations.filter((c) => inWeek(c.startedAt))
  const afterHoursIds = new Set(weekConvs.filter((c) => isAfterHours(cfg, c.startedAt)).map((c) => c.id))
  const weekBookings = bookings.filter((b) => inWeek(b.created_at))

  // First reply: first user message -> first agent message after it, per conversation.
  const replyTimes: number[] = []
  for (const c of weekConvs) {
    const raw = c.rawMessages
    const firstUser = raw.find((m) => m.role === "user")
    const firstReply = firstUser && raw.find((m) => m.role === "agent" && m.created_at >= firstUser.created_at)
    if (firstUser && firstReply) {
      replyTimes.push((new Date(firstReply.created_at).getTime() - new Date(firstUser.created_at).getTime()) / 1000)
    }
  }
  const firstReplySeconds = replyTimes.length
    ? Math.round((replyTimes.reduce((a, b) => a + b, 0) / replyTimes.length) * 10) / 10
    : 0

  const byAgent: Record<AgentTag, number> = { receptionist: 0, booking: 0, sales: 0, support: 0 }
  for (const c of weekConvs) {
    for (const tag of Object.keys(AGENT_LABEL) as AgentTag[]) {
      if (c.agents.includes(AGENT_LABEL[tag])) byAgent[tag]++
    }
  }

  // Eight weeks of recovered revenue: bookings made that week × average job value.
  const trend = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(new Date(week.start).getTime() - (7 - i) * 7 * 864e5).toISOString()
    const end = new Date(new Date(start).getTime() + 7 * 864e5).toISOString()
    const n = bookings.filter((b) => inRange(isoOf(b.created_at), start, end)).length
    return {
      week: fmt(timeZone, start, { month: "short", day: "numeric" }),
      recovered: n * avgJobValue,
      demo: false,
    }
  })
  const lastWeekBookings = bookings.filter((b) =>
    inRange(isoOf(b.created_at), new Date(new Date(week.start).getTime() - 7 * 864e5).toISOString(), week.start)
  ).length

  const open = escalations.filter((e) => e.status === "open")
  return {
    week: {
      weekLabel: week.label,
      previousWeekHref: null,
      nextWeekHref: null,
      recovered: weekBookings.length * avgJobValue,
      recoveredDelta: (weekBookings.length - lastWeekBookings) * avgJobValue,
      avgJobValue,
      booked: weekBookings.length,
      afterHoursBooked: weekBookings.filter((b) => b.conversation_id && afterHoursIds.has(b.conversation_id)).length,
      conversations: weekConvs.length,
      afterHours: afterHoursIds.size,
      firstReplySeconds,
      needsYou: open.map((e) => ({
        id: e.id,
        who: e.who,
        action: e.reason,
        why: e.email ?? "No email on file",
        due: e.when,
      })),
      autoResolved: escalations.filter((e) => e.status !== "open" && inWeek(e.createdAt)).length,
    },
    trend,
    recent: conversations.slice(0, 6),
    byAgent,
  }
}

/* ---------------------------------------------------------------- calendar */

export type CalendarAppointment = {
  id: string
  day: number // 0 = Monday of the shown week
  start: number // local hours, e.g. 13.5 = 1:30 pm
  length: number // hours
  service: string
  patient: string
  /** "staff" is reserved for bookings made outside the agents (none are read yet). */
  bookedBy: { agent: string; channel: string; at: string } | "staff"
}

export type CalendarWeekView = {
  weekLabel: string
  weekStart: [number, number, number] // y, m (1-12), d of Monday, business tz
  today: [number, number, number]
  todayLabel: string
  startHour: number
  endHour: number
  days: { label: string; date: number; closesAt?: number }[]
  appointments: CalendarAppointment[]
  /** The business's configured service names. */
  services: string[]
}

export async function getCalendarWeek(businessId: string): Promise<CalendarWeekView> {
  const cfg = await businessConfig(businessId)
  const tz = cfg.timezone
  const week = currentWeek(tz)
  const { data, error } = await db()
    .from("bookings")
    .select("id, service, slot_start, slot_end, created_at, contacts(name, email), conversations(channel, messages(agent))")
    .eq("business_id", businessId)
    .gte("slot_start", week.start)
    .lt("slot_start", week.end)
  if (error || !data) fail("list calendar bookings", error)

  const local = (iso: string) =>
    Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hourCycle: "h23",
      })
        .formatToParts(new Date(iso))
        .map((p) => [p.type, Number(p.value)])
    ) as Record<"year" | "month" | "day" | "hour" | "minute", number>

  const mon = local(week.start)
  const now = local(new Date().toISOString())
  const dayIndex = (iso: string) => {
    const l = local(iso)
    return Math.round((Date.UTC(l.year, l.month - 1, l.day) - Date.UTC(mon.year, mon.month - 1, mon.day)) / 864e5)
  }

  // Opening hours from the business config (Mon–Fri shown).
  const keys = ["mon", "tue", "wed", "thu", "fri"] as const
  const ranges = keys.map((k) => cfg.hours[k]?.split("-").map((t) => Number(t.slice(0, 2)) + Number(t.slice(3)) / 60))
  const opens = ranges.filter(Boolean).map((r) => r![0])
  const closes = ranges.filter(Boolean).map((r) => r![1])
  const startHour = Math.floor(Math.min(...opens, 8))
  const endHour = Math.ceil(Math.max(...closes, 17))

  type Row = {
    id: string
    service: string
    slot_start: string
    slot_end: string
    created_at: string
    contacts: { name: string | null; email: string | null } | null
    conversations: { channel: string; messages: { agent: string | null }[] } | null
  }
  const appointments = (data as unknown as Row[]).map((b): CalendarAppointment => {
    const s = local(b.slot_start)
    const agents = new Set((b.conversations?.messages ?? []).map((m) => m.agent))
    return {
      id: b.id,
      day: dayIndex(b.slot_start),
      start: s.hour + s.minute / 60,
      length: (new Date(b.slot_end).getTime() - new Date(b.slot_start).getTime()) / 36e5,
      service: b.service,
      patient: b.contacts?.name ?? b.contacts?.email ?? "Unknown contact",
      bookedBy: {
        agent: agents.has("sales") ? "Sales → Booking" : "Booking",
        channel: capitalize(b.conversations?.channel ?? "chat"),
        at: whenLabel(tz, b.created_at),
      },
    }
  })

  return {
    weekLabel: week.label,
    weekStart: [mon.year, mon.month, mon.day],
    today: [now.year, now.month, now.day],
    todayLabel: fmt(tz, new Date().toISOString(), { weekday: "short", month: "short", day: "numeric" }),
    startHour,
    endHour,
    days: keys.map((k, i) => {
      const r = ranges[i]
      const d = new Date(Date.UTC(mon.year, mon.month - 1, mon.day + i))
      return {
        label: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
        date: d.getUTCDate(),
        ...(r && r[1] < endHour ? { closesAt: r[1] } : {}),
      }
    }),
    appointments,
    services: cfg.services.map((sv) => sv.name),
  }
}

/* ---------------------------------------------------------------- agents */

export type AgentView = {
  id: AgentTag | "admin"
  name: string
  job: string
  live: boolean
  tools: string[]
  handoffLine: string | null
  /** this week, from real rows */
  stats: { label: string; one: string; value: number }[]
  recent: { id: string; customer: string; when: string; outcome: Outcome }[]
}

// What each agent is and can do. These are facts about the product (the PRD and the
// tools wired in server/agent), not business data.
const AGENT_FACTS: Record<AgentTag | "admin", { name: string; job: string; tools: string[]; handoffLine: string | null }> = {
  receptionist: {
    name: "Receptionist",
    job: "Answers every conversation first, finds out what the person needs, and routes it.",
    tools: ["Hand off to Booking", "Hand off to Sales", "Hand off to Support"],
    handoffLine: null,
  },
  booking: {
    name: "Booking",
    job: "Finds real open times in your calendar and books them during the conversation.",
    tools: ["Check calendar availability", "Book an appointment"],
    handoffLine: "Let me get you to booking",
  },
  sales: {
    name: "Sales",
    job: "Answers pre-booking questions from your details, captures new leads, and hands them to Booking.",
    tools: ["Save a contact", "Hand off to Booking"],
    handoffLine: "Let me get you to our team",
  },
  support: {
    name: "Support",
    job: "Answers existing customers from your details and their own record; logs anything it can't answer.",
    tools: ["Read the person's own record", "Log an escalation", "Hand off to Booking"],
    handoffLine: "Let me pull that up for you",
  },
  admin: {
    name: "Setup & Admin",
    job: "Your own agent: walks you through setup, then handles back-office chores. Never talks to customers.",
    tools: [],
    handoffLine: null,
  },
}

export async function getAgentsView(businessId: string): Promise<AgentView[]> {
  const { timeZone } = await businessTimeZone(businessId)
  const week = currentWeek(timeZone)
  const inWeek = (s: string) => {
    const iso = new Date(s).toISOString()
    return iso >= week.start && iso < week.end
  }
  const [conversations, escalations, bookingsRes] = await Promise.all([
    listConversations(businessId),
    listEscalations(businessId),
    db()
      .from("bookings")
      .select("id")
      .eq("business_id", businessId)
      .not("status", "in", `(${NOT_BOOKED.join(",")})`)
      .gte("created_at", week.start)
      .lt("created_at", week.end),
  ])
  if (bookingsRes.error || !bookingsRes.data) fail("count bookings", bookingsRes.error)
  const weekConvs = conversations.filter((c) => inWeek(c.startedAt))

  return (["receptionist", "booking", "sales", "support", "admin"] as const).map((id) => {
    const facts = AGENT_FACTS[id]
    if (id === "admin") return { id, ...facts, live: false, stats: [], recent: [] }
    const mine = conversations.filter((c) => c.agents.includes(facts.name))
    const stats = [
      { label: "Conversations this week", one: "Conversation this week", value: weekConvs.filter((c) => c.agents.includes(facts.name)).length },
    ]
    if (id === "booking") stats.push({ label: "Bookings this week", one: "Booking this week", value: bookingsRes.data.length })
    if (id === "support") {
      stats.push({ label: "Escalations this week", one: "Escalation this week", value: escalations.filter((e) => inWeek(e.createdAt)).length })
    }
    return {
      id,
      ...facts,
      live: true,
      stats,
      recent: mine.slice(0, 5).map((c) => ({ id: c.id, customer: c.customer, when: c.when, outcome: c.outcome })),
    }
  })
}
