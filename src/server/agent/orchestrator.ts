// Runs one message through: persist -> safety net -> active agent -> (handoffs) ->
// persist replies. The business is identified by business_id, passed in by the caller.
// Two booking modes (businesses.calendar_mode): "calcom" (Cruz Family Dental: live
// Cal.com booking, unchanged) and "requests" (businesses set up through /setup: the
// agents in ./requests.ts take booking requests the owner confirms on Today).
// Agents: Receptionist routes to Booking / Sales / Support; Sales and Support can hand
// to Booking. Each agent only gets its own tools (capability guardrail).
// Persisted (Supabase): conversation, every message (tagged by agent), contact,
// bookings, escalations. In memory only: each agent's working model history.
import { getBusinessProfile } from "../db/business-profile"
import {
  createConversation,
  findContactByEmail,
  findContactByMobile,
  insertBookingRequest,
  listContactRequests,
  upsertContactByMobile,
  insertBooking,
  insertEscalation,
  linkConversationContact,
  listContactBookings,
  loadBusiness,
  saveMessage,
  setConversationChannel,
  upsertContact,
  type Contact,
  type MobileContact,
} from "../db/store"
import { getPack, isVertical } from "../verticals"
import { normalizeMobile } from "@/lib/format"
import { bookingInstruction, BOOKING_TOOLS } from "./booking"
import { HANDOFF_LINES, handoffTarget, type AgentName, type Specialist } from "./handoff"
import { whenText } from "./knowledge/describe"
import type { BusinessKnowledge } from "./knowledge/types"
import { runAgentTurn, userInput, type Step, type Tool, type ToolOutcome } from "./llm"
import { receptionistInstruction, RECEPTIONIST_TOOLS } from "./receptionist"
import {
  bookingRequestsInstruction,
  emptyRequestDraft,
  executeRequestTool,
  finalRequestLine,
  REQUEST_BOOKING_TOOLS,
  requestDetails,
  requestsContext,
  salesRequestsInstruction,
  SALES_REQUESTS_TOOLS,
  STARTER_ROUTES,
  supportRequestsInstruction,
  SUPPORT_REQUESTS_TOOLS,
  type RequestDraft,
  type RequestsContext,
} from "./requests"
import { findEmergencyKeyword } from "./safety"
import { salesInstruction, SALES_TOOLS } from "./sales"
import { supportInstruction, SUPPORT_TOOLS } from "./support"
import { executeBookingTool, type BookingToolState } from "./tools/booking-tools"

export type { AgentName }

export type ChatEvent =
  | {
      kind: "message"
      from: AgentName
      text: string
      /** quick-reply chips for a choice / yes-no booking question (requests mode) */
      suggestedReplies?: string[]
      /** the question wants a number (render a 1-6 + More chip row) */
      numberReply?: boolean
      /** booking page "Questions? Ask us": offer "Fill the booking form for me" */
      fillForm?: boolean
    }
  | { kind: "estimate"; price: number | null; durationMinutes: number; notes: string[] }
  | {
      kind: "request_sent"
      service: string
      details: string
      preferredTime: string
      teamMember: string | null
      name: string
      mobile: string
    }
  | { kind: "handoff"; from: AgentName; to: AgentName; text: string; summary: string }
  | { kind: "tool"; from: AgentName; tool: string; ok: boolean }
  | { kind: "emergency"; text: string }
  | { kind: "error"; text: string }

type Handoff = { summary: string; name?: string }

type Session = {
  businessId: string
  conversationId: string | null
  channel?: Channel
  active: AgentName
  histories: Record<AgentName, Step[]>
  handoffs: Partial<Record<Specialist, Handoff>>
  toolState: BookingToolState
  contact: Contact | null
  /** true when the contact already existed before this conversation */
  returning: boolean
  /** a name heard before any email (contacts are matched by email) */
  pendingName?: string
  // requests mode only
  request: RequestDraft
  /** consent given on the booking page (dental), stored when the contact is created */
  consentAt?: string | null
  /** contact identified by a mobile number given in this conversation */
  mobileContact?: MobileContact | null
  /** client message ids already saved (a retry doesn't save the message twice) */
  savedIds: Set<string>
  /** booking page Ask panel: no booking agent; booking requests point to the form */
  askOnly?: boolean
}

// Kept on globalThis so dev hot-reloads don't wipe conversations mid-test.
const store = ((globalThis as { __agentSessions?: Map<string, Session> }).__agentSessions ??=
  new Map<string, Session>())

function session(businessId: string, id: string): Session {
  const key = `${businessId}:${id}`
  let s = store.get(key)
  if (!s) {
    s = {
      businessId,
      conversationId: null,
      active: "receptionist",
      histories: { receptionist: [], booking: [], sales: [], support: [] },
      handoffs: {},
      toolState: { offered: new Map() },
      contact: null,
      returning: false,
      request: emptyRequestDraft(),
      savedIds: new Set(),
    }
    store.set(key, s)
  }
  return s
}

const EMAIL = /[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}/i
const EMAIL_EXACT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Cross-channel memory: match or create the contact by email, link the conversation. */
async function rememberContact(s: Session, c: { email: string; name?: string }) {
  const email = c.email.toLowerCase()
  const name = c.name ?? s.pendingName
  if (s.contact?.email === email && (!name || s.contact.name === name)) return
  if (!s.contact || s.contact.email !== email) {
    const existing = await findContactByEmail(s.businessId, email)
    if (existing && !s.contact) s.returning = true
    if (existing && (!name || existing.name === name)) {
      s.contact = existing
      await linkConversationContact(s.businessId, s.conversationId!, existing.id)
      return
    }
  }
  s.contact = await upsertContact(s.businessId, { email, name })
  await linkConversationContact(s.businessId, s.conversationId!, s.contact.id)
}

const result = (r: Record<string, unknown>): ToolOutcome => ({ kind: "result", result: r })

/** Per-agent instruction, tools, and tool executor. Handoff tools stop the turn. */
async function agentSpec(
  agent: AgentName,
  b: BusinessKnowledge,
  s: Session,
  ctx: RequestsContext | null
): Promise<{
  instruction: string
  tools: Tool[]
  execute: (name: string, args: Record<string, unknown>) => Promise<ToolOutcome>
}> {
  const handoffOr =
    (inner: (name: string, args: Record<string, unknown>) => Promise<ToolOutcome>) =>
    async (name: string, args: Record<string, unknown>): Promise<ToolOutcome> =>
      handoffTarget(name) ? { kind: "stop", payload: { ...args, __to: handoffTarget(name) } } : inner(name, args)
  const unknownTool = async () => result({ ok: false, error: "unknown_tool" })

  if (agent === "receptionist") {
    return {
      instruction: receptionistInstruction(b, s.returning && s.contact ? { name: s.contact.name } : null),
      tools: RECEPTIONIST_TOOLS,
      execute: handoffOr(unknownTool),
    }
  }

  const handoff = s.handoffs[agent] ?? { summary: "" }

  if (ctx) return requestsAgentSpec(agent, ctx, s, handoff.summary, handoffOr, unknownTool)

  if (agent === "booking") {
    const memory = s.contact
      ? {
          name: s.contact.name,
          email: s.contact.email,
          pastBookings: await listContactBookings(s.businessId, s.contact.id),
        }
      : null
    return {
      instruction: bookingInstruction(b, handoff, memory),
      tools: BOOKING_TOOLS,
      execute: async (name, args) =>
        result(
          await executeBookingTool(name, args, {
            business: b,
            state: s.toolState,
            onBooked: async (bk) => {
              await rememberContact(s, { email: bk.email, name: bk.name })
              await insertBooking(s.businessId, {
                contactId: s.contact!.id,
                conversationId: s.conversationId!,
                service: bk.service,
                slotStart: bk.start,
                slotEnd: bk.end,
                calcomBookingId: bk.calcomUid,
                status: bk.status,
              })
            },
          })
        ),
    }
  }

  if (agent === "sales") {
    return {
      instruction: salesInstruction(b, handoff, s.contact),
      tools: SALES_TOOLS,
      execute: handoffOr(async (name, args) => {
        if (name !== "capture_contact") return unknownTool()
        const email = String(args.email ?? "").trim()
        const contactName = String(args.name ?? "").trim()
        if (!EMAIL_EXACT.test(email)) return result({ ok: false, error: "invalid_email" })
        if (!contactName) return result({ ok: false, error: "missing_name" })
        await rememberContact(s, { email, name: contactName })
        return result({ ok: true, saved: { name: s.contact!.name, email: s.contact!.email } })
      }),
    }
  }

  // support
  return {
    instruction: supportInstruction(b, handoff),
    tools: SUPPORT_TOOLS,
    execute: handoffOr(async (name, args) => {
      if (name === "get_my_record") {
        if (!s.contact) {
          return result({ ok: false, identified: false, message: "Ask for the email address they booked with." })
        }
        const bookings = await listContactBookings(s.businessId, s.contact.id)
        const now = Date.now()
        return result({
          ok: true,
          identified: true,
          name: s.contact.name,
          email: s.contact.email,
          bookings: bookings.map((bk) => ({
            service: bk.service,
            when: whenText(b, bk.slot_start),
            status: bk.status,
            upcoming: new Date(bk.slot_start).getTime() > now,
          })),
        })
      }
      if (name === "create_escalation") {
        const reason = String(args.reason ?? "").trim()
        if (!reason) return result({ ok: false, error: "missing_reason" })
        const id = await insertEscalation(s.businessId, {
          contactId: s.contact?.id ?? null,
          conversationId: s.conversationId!,
          reason,
        })
        return result({ ok: true, escalationId: id })
      }
      return unknownTool()
    }),
  }
}

const MAX_HANDOFFS_PER_MESSAGE = 3

async function runActive(
  b: BusinessKnowledge,
  s: Session,
  message: string,
  events: ChatEvent[],
  ctx: RequestsContext | null
) {
  // Booking-page starter chips go straight to the right specialist (no model call).
  const starter = ctx && s.active === "receptionist" ? STARTER_ROUTES[message.trim().toLowerCase()] : undefined
  if (starter) {
    s.handoffs[starter] = { summary: message }
    s.histories.receptionist.push(userInput(message))
    s.active = starter
    events.push({ kind: "handoff", from: "receptionist", to: starter, text: HANDOFF_LINES[starter], summary: message })
  }
  s.histories[s.active].push(userInput(message))
  for (let hop = 0; hop <= MAX_HANDOFFS_PER_MESSAGE; hop++) {
    const agent = s.active
    const spec = await agentSpec(agent, b, s, ctx)
    const turn = await runAgentTurn({
      systemInstruction: spec.instruction,
      history: s.histories[agent],
      tools: spec.tools,
      executeTool: spec.execute,
    })
    for (const t of turn.toolCalls) events.push({ kind: "tool", from: agent, tool: t.name, ok: t.ok })
    if (turn.kind === "text") {
      events.push({ kind: "message", from: agent, text: turn.text })
      return
    }
    // Handoff: say the line, pass control + summary (+ name), next agent takes the same message.
    const to = turn.payload.__to as Specialist
    if (s.askOnly && to === "booking") {
      // The Ask panel has no booking tools: point to the form instead.
      events.push({ kind: "message", from: agent, text: FILL_FORM_LINE, fillForm: true })
      return
    }
    const summary = String(turn.payload.summary ?? message)
    const name = turn.payload.name ? String(turn.payload.name) : undefined
    if (name) {
      if (s.contact?.email) await rememberContact(s, { email: s.contact.email, name })
      else s.pendingName = name
    }
    s.handoffs[to] = { summary, name: name ?? s.contact?.name ?? undefined }
    s.active = to
    events.push({ kind: "handoff", from: agent, to, text: HANDOFF_LINES[to], summary })
    s.histories[to].push(userInput(message))
  }
  events.push({ kind: "message", from: s.active, text: "A team member will follow up on that." })
}

async function persistReplies(s: Session, events: ChatEvent[]) {
  for (const e of events) {
    if (e.kind === "message" || e.kind === "handoff") {
      await saveMessage(s.businessId, s.conversationId!, { role: "agent", agent: e.from, content: e.text })
    } else if (e.kind === "emergency") {
      await saveMessage(s.businessId, s.conversationId!, { role: "agent", agent: null, content: e.text })
    }
  }
}

export type Channel = "chat" | "voice" | "web"

export const FILL_FORM_LINE = "I can fill in the booking form for you with what you told me."

/** The business, its agents' context, and its safety net (own words + its business
 *  type's emergency words; the reply is its own emergency instruction). */
async function businessContext(businessId: string) {
  const profile = await getBusinessProfile(businessId)
  const ctx = profile.calendar_mode === "requests" && isVertical(profile.vertical) ? requestsContext(profile) : null
  const business = ctx ? ctx.knowledge : await loadBusiness(businessId)
  const keywords = ctx
    ? business.emergencyKeywords
    : [...new Set([...business.emergencyKeywords, ...(isVertical(profile.vertical) ? getPack(profile.vertical).escalation_keywords : [])])]
  const emergencyLine = profile.config.emergency_instruction ?? business.emergencyLine
  return { profile, ctx, business, keywords, emergencyLine }
}

/** The conversation for a booking-page visit (created on first use). */
export async function ensureConversation(businessId: string, sessionId: string, channel: Channel): Promise<string> {
  const s = session(businessId, sessionId)
  if (!s.conversationId) {
    s.conversationId = await createConversation(businessId, channel)
    s.channel = channel
  }
  return s.conversationId
}

/** Saves lines to the visit's conversation so the owner sees what the customer typed. */
export async function logToConversation(
  businessId: string,
  sessionId: string,
  channel: Channel,
  lines: { role: "user" | "agent"; agent: AgentName | null; content: string }[]
) {
  const conversationId = await ensureConversation(businessId, sessionId, channel)
  for (const l of lines) await saveMessage(businessId, conversationId, l)
  return conversationId
}

/** Runs the safety net on any customer text. On a match: logs the text and the
 *  emergency reply, opens a "needs you" item, and returns the business's emergency
 *  instruction (the caller stops what it was doing). */
export async function safetyCheck(businessId: string, sessionId: string, channel: Channel, text: string): Promise<string | null> {
  const { keywords, emergencyLine } = await businessContext(businessId)
  const matched = findEmergencyKeyword(text, keywords)
  if (!matched) return null
  const s = session(businessId, sessionId)
  const conversationId = await logToConversation(businessId, sessionId, channel, [
    { role: "user", agent: null, content: text },
    { role: "agent", agent: null, content: emergencyLine },
  ])
  await insertEscalation(businessId, {
    contactId: s.contact?.id ?? s.mobileContact?.id ?? null,
    conversationId,
    reason: `Emergency words: ${matched}`,
  })
  return emergencyLine
}

/** Links a contact to the visit's conversation (after the booking form is sent). */
export async function linkVisitContact(businessId: string, sessionId: string, contact: MobileContact) {
  const s = session(businessId, sessionId)
  s.mobileContact = contact
  if (s.conversationId) await linkConversationContact(businessId, s.conversationId, contact.id)
}

const MOBILE_IN_TEXT = /(\+639\d{9}|09\d{9})/

export async function handleMessage(
  businessId: string,
  sessionId: string,
  message: string,
  /** How this message came in. Once a conversation uses voice, it's marked "voice". */
  channel: Channel = "chat",
  opts: {
    /** the booking page's greeting, saved as the first agent message of a new conversation */
    greeting?: string
    /** consent given on the booking page (dental) */
    consentAt?: string | null
    /** the client's id for this message; a retry with the same id isn't saved twice */
    clientMessageId?: string
    /** booking page "Questions? Ask us": answer only, never start a booking */
    askOnly?: boolean
  } = {}
): Promise<ChatEvent[]> {
  const { ctx, business, keywords, emergencyLine } = await businessContext(businessId)

  const s = session(businessId, sessionId)
  s.askOnly = !!opts.askOnly
  if (opts.consentAt && !s.consentAt) s.consentAt = opts.consentAt
  if (!s.conversationId) {
    s.conversationId = await createConversation(businessId, channel)
    s.channel = channel
    if (opts.greeting) {
      await saveMessage(businessId, s.conversationId, { role: "agent", agent: "receptionist", content: opts.greeting })
      s.histories.receptionist.push({ role: "assistant", content: opts.greeting })
    }
  } else if (channel === "voice" && s.channel !== "voice") {
    await setConversationChannel(businessId, s.conversationId, "voice")
    s.channel = "voice"
  }
  if (!opts.clientMessageId || !s.savedIds.has(opts.clientMessageId)) {
    await saveMessage(businessId, s.conversationId, { role: "user", agent: null, content: message })
    if (opts.clientMessageId) s.savedIds.add(opts.clientMessageId)
  }

  const events: ChatEvent[] = []

  // Guardrail 1: emergency words short-circuit everything; no agent runs. The owner
  // gets a "needs you" item.
  const matched = findEmergencyKeyword(message, keywords)
  if (matched) {
    events.push({ kind: "emergency", text: emergencyLine })
    await persistReplies(s, events)
    await insertEscalation(businessId, {
      contactId: s.contact?.id ?? s.mobileContact?.id ?? null,
      conversationId: s.conversationId,
      reason: `Emergency words: ${matched}`,
    })
    return events
  }

  if (ctx) {
    // A mobile number in the message identifies a returning customer (match only).
    const mobile = normalizeMobile(message.match(MOBILE_IN_TEXT)?.[0] ?? "")
    if (mobile && s.mobileContact?.mobile !== mobile) {
      const found = await findContactByMobile(businessId, mobile)
      if (found) {
        s.mobileContact = found
        await linkConversationContact(businessId, s.conversationId, found.id)
      }
    }
  } else {
    // An email in the message identifies the person (match existing, else create).
    const email = message.match(EMAIL)?.[0]
    if (email) await rememberContact(s, { email })
  }

  // If the model call fails, roll the working histories back so a retry starts clean.
  const snapshot = Object.fromEntries(Object.entries(s.histories).map(([k, h]) => [k, h.length])) as Record<AgentName, number>
  const activeBefore = s.active
  try {
    const askedBefore = s.request.asked
    await runActive(business, s, message, events, ctx)
    if (ctx) finishRequestsTurn(ctx, s, events, askedBefore)
  } catch (err) {
    for (const k of Object.keys(snapshot) as AgentName[]) s.histories[k].length = snapshot[k]
    s.active = activeBefore
    throw err
  }
  await persistReplies(s, events)
  return events
}

/* ---------------------------------------------------------------- requests mode */

async function requestsAgentSpec(
  agent: Specialist,
  ctx: RequestsContext,
  s: Session,
  summary: string,
  handoffOr: (
    inner: (name: string, args: Record<string, unknown>) => Promise<ToolOutcome>
  ) => (name: string, args: Record<string, unknown>) => Promise<ToolOutcome>,
  unknownTool: () => Promise<ToolOutcome>
) {
  const businessId = ctx.profile.id
  const escalate = async (args: Record<string, unknown>) => {
    const reason = String(args.reason ?? "").trim()
    if (!reason) return result({ ok: false, error: "missing_reason" })
    const id = await insertEscalation(businessId, {
      contactId: s.mobileContact?.id ?? null,
      conversationId: s.conversationId!,
      reason,
    })
    return result({ ok: true, escalationId: id })
  }

  if (agent === "booking") {
    return {
      instruction: bookingRequestsInstruction(ctx, s.request, summary),
      tools: REQUEST_BOOKING_TOOLS,
      execute: async (name: string, args: Record<string, unknown>) =>
        result(
          await executeRequestTool(name, args, ctx, s.request, {
            onRequest: async ({ name: customer, mobile, preferredTime }) => {
              const contact = await upsertContactByMobile(businessId, { mobile, name: customer, consentAt: s.consentAt })
              s.mobileContact = contact
              await linkConversationContact(businessId, s.conversationId!, contact.id)
              const staffQ = ctx.pack.booking_questions.find((q) => q.options?.includes("$STAFF"))
              const staffName = staffQ ? s.request.answers[staffQ.id] : undefined
              const staff = ctx.profile.staff.find((m) => m.active && m.name === staffName)
              await insertBookingRequest(businessId, {
                contactId: contact.id,
                conversationId: s.conversationId!,
                service: s.request.answers.service,
                staffId: staff?.id ?? null,
                details: requestDetails(ctx, s.request),
                requestedTimeText: preferredTime,
                customerMobile: mobile,
              })
            },
          })
        ),
    }
  }

  if (agent === "sales") {
    return {
      instruction: salesRequestsInstruction(ctx, summary),
      tools: SALES_REQUESTS_TOOLS,
      execute: handoffOr(async (name, args) => (name === "create_escalation" ? escalate(args) : unknownTool())),
    }
  }

  return {
    instruction: supportRequestsInstruction(ctx, summary),
    tools: SUPPORT_REQUESTS_TOOLS,
    execute: handoffOr(async (name, args) => {
      if (name === "create_escalation") return escalate(args)
      if (name === "get_my_record") {
        if (!s.mobileContact) {
          return result({ ok: false, identified: false, message: "Ask for the mobile number they used." })
        }
        const rows = await listContactRequests(businessId, s.mobileContact.id)
        return result({
          ok: true,
          identified: true,
          name: s.mobileContact.name,
          items: rows.map((r) => ({
            service: r.service,
            status: r.status,
            preferred_time: r.requested_time_text,
            confirmed_time: r.slot_start ? whenText(ctx.knowledge, r.slot_start) : null,
          })),
        })
      }
      return unknownTool()
    }),
  }
}

/** After a requests-mode turn: quick replies, the estimate and request cards, and the
 *  exact wording the Booking agent must use (enforced here, not left to the model). */
function finishRequestsTurn(
  ctx: RequestsContext,
  s: Session,
  events: ChatEvent[],
  askedBefore: RequestDraft["asked"]
) {
  const last = [...events].reverse().find((e) => e.kind === "message")
  const sentNow = s.request.sent && events.some((e) => e.kind === "tool" && e.tool === "request_booking" && e.ok)
  const estimatedNow = events.some((e) => e.kind === "tool" && e.tool === "quote_estimate" && e.ok)

  if (estimatedNow && s.request.estimate) {
    const i = last ? events.indexOf(last) : events.length
    events.splice(i, 0, {
      kind: "estimate",
      price: s.request.estimate.price,
      durationMinutes: s.request.estimate.duration_minutes,
      notes: s.request.estimate.notes,
    })
  }

  if (sentNow && s.request.sent) {
    const staffQ = ctx.pack.booking_questions.find((q) => q.options?.includes("$STAFF"))
    const staffName = staffQ ? s.request.answers[staffQ.id] : undefined
    const details = requestDetails(ctx, s.request)
    const card: ChatEvent = {
      kind: "request_sent",
      service: s.request.answers.service,
      details: details.summary,
      preferredTime: s.request.sent.preferredTime,
      teamMember: staffName && staffName !== "Anyone available" ? staffName : null,
      name: s.request.sent.name,
      mobile: s.request.sent.mobile,
    }
    const reqTool = events.findIndex((e) => e.kind === "tool" && e.tool === "request_booking" && e.ok)
    events.splice(reqTool + 1, 0, card)
    if (last && last.kind === "message") {
      last.text = finalRequestLine(s.request.sent.name, ctx.profile.name, s.request.sent.mobile)
      last.suggestedReplies = undefined
    }
    return
  }

  // A booking question was asked this turn: its exact text, and its options as chips.
  const asked = s.request.asked
  if (last && last.kind === "message" && last.from === "booking" && asked && asked !== askedBefore) {
    if (!last.text.includes(asked.ask)) last.text = asked.ask
    if (asked.type === "choice" || asked.type === "yes_no") last.suggestedReplies = asked.options ?? undefined
    if (asked.type === "number") last.numberReply = true
  }
}
