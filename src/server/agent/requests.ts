// Agents for businesses in "requests" mode (set up through /setup; calendar_mode =
// 'requests'). Cruz Family Dental (calendar_mode = 'calcom') never reaches this file.
//
// Booking takes a booking REQUEST the owner confirms later. Its tools are exactly four
// (capability guardrail): ask_booking_question, record_answer, quote_estimate,
// request_booking. The questions come from the business type pack; answers are checked
// and stored by the server; the estimate is computed here (no model math).
// Sales and Support answer only from the business's own data (services, prices, team,
// hours, FAQs rendered from its setup answers); unknowns become "needs you" items.
import {
  applies,
  checkAnswer,
  computeEstimate,
  nextQuestion,
  shortDetails,
  type BookingSpec,
  type Estimate,
  type SpecQuestion,
} from "@/lib/booking-engine"
import { duration, listJoin, normalizeMobile, peso } from "@/lib/format"
import { activeServices, activeStaff, type BusinessProfile } from "../db/business-profile"
import { buildSpec, getPack, hoursSummary, renderFaqs, type Pack } from "../verticals"
import { handoffTool } from "./handoff"
import type { BusinessKnowledge } from "./knowledge/types"
import type { Tool } from "./llm"

export const UNKNOWN_LINE = "I'll check with the team and they'll get back to you."
export const PASS_LINE = "I'll pass this to the team."

/* ---------------------------------------------------------------- context */

export type RequestsContext = { profile: BusinessProfile; pack: Pack; knowledge: BusinessKnowledge; spec: BookingSpec }

/** What the agents and the safety net need, built from the business's own tables. */
export function requestsContext(profile: BusinessProfile): RequestsContext {
  const pack = getPack(profile.vertical!)
  const c = profile.config
  return {
    profile,
    pack,
    spec: buildSpec(profile),
    knowledge: {
      id: profile.id,
      name: profile.name,
      businessType: pack.display_name,
      customerTerm: c.customer_term ?? { singular: "customer", plural: "customers" },
      timeZone: c.timezone,
      hours: c.hours,
      services: [],
      faqs: renderFaqs(profile),
      restrictedAdvice: c.restricted_advice ?? [],
      emergencyLine: c.emergency_instruction ?? c.emergency_line,
      // the business's own list + its business type's emergency words
      emergencyKeywords: [...new Set([...(c.rules?.emergency_keywords ?? []), ...pack.emergency_keywords])],
    },
  }
}

const LENGTH_LABEL = { short: "short hair", shoulder: "shoulder-length hair", long: "long hair" } as const

function servicesFacts(p: BusinessProfile) {
  return activeServices(p)
    .map((s) => {
      if (s.pricing_type === "by_hair_length" && s.variants) {
        const parts = (Object.keys(LENGTH_LABEL) as (keyof typeof LENGTH_LABEL)[]).map((k) => {
          const v = s.variants![k]
          return `${LENGTH_LABEL[k]}: ${v.price_php === null ? "price confirmed by the team" : peso(v.price_php)}, about ${duration(v.duration_minutes)}`
        })
        return `- ${s.name} (${parts.join("; ")})`
      }
      const unit = s.pricing_type === "per_unit" ? " per unit" : ""
      const price = s.price_php === null ? "price confirmed by the team" : `${peso(s.price_php)}${unit}`
      return `- ${s.name}: ${price}, about ${duration(s.duration_minutes)}${unit}`
    })
    .join("\n")
}

/** Everything the agents may state about the business, as plain text. */
export function factsText(ctx: RequestsContext) {
  const { profile: p, pack, knowledge, spec } = ctx
  const c = p.config
  const lines = [
    `Services and prices:\n${servicesFacts(p) || "- (none)"}`,
    `Hours: ${hoursSummary(p)}`,
    `${pack.staff_role_plural}: ${listJoin(activeStaff(p).map((m) => m.name)) || "(none listed)"}`,
    c.payment_methods?.length ? `Payment: ${listJoin(c.payment_methods)}` : "",
    spec.areas.length ? `Areas served: ${listJoin(spec.areas)}` : "",
    ...spec.extraCharges.filter((x) => x.price).map((x) => `Extra for each ${x.label.toLowerCase()}: ${peso(x.price!)}`),
    spec.minimum ? `Minimum booking: ${peso(spec.minimum)}` : "",
    p.business_address ? `Address: ${p.business_address}` : "",
    `Answers to common questions:\n${knowledge.faqs.map((f) => `- Q: ${f.question}\n  A: ${f.answer}`).join("\n")}`,
  ]
  return lines.filter(Boolean).join("\n")
}

export type { Estimate }

/* ---------------------------------------------------------------- booking tools */

export const REQUEST_BOOKING_TOOLS: Tool[] = [
  {
    type: "function",
    name: "ask_booking_question",
    description:
      "Get the exact text of a booking question to ask next. Send the returned 'ask' text to the customer word for word.",
    parameters: {
      type: "object",
      properties: { question_id: { type: "string", description: "The question id (from record_answer's 'next')." } },
      required: ["question_id"],
    },
  },
  {
    type: "function",
    name: "record_answer",
    description:
      "Save the customer's answer to a booking question. Returns the next question (id and exact text) or next = 'done'. Use question_id 'note' to save an extra note for the team.",
    parameters: {
      type: "object",
      properties: {
        question_id: { type: "string" },
        value: { type: "string", description: "The customer's answer; for options, the matching option text." },
      },
      required: ["question_id", "value"],
    },
  },
  {
    type: "function",
    name: "quote_estimate",
    description: "Compute the price and time estimate once every question is answered. The customer sees it as a card.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "request_booking",
    description: "Send the booking request to the business. Only after the estimate, name, mobile number and preferred time.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The customer's name." },
        mobile: { type: "string", description: "Philippine mobile number, 09XXXXXXXXX or +639XXXXXXXXX." },
        preferred_time_text: { type: "string", description: "Their preferred day and time, in their words." },
      },
      required: ["name", "mobile", "preferred_time_text"],
    },
  },
]

export type RequestDraft = {
  answers: Record<string, string>
  notes: string[]
  estimate: Estimate | null
  /** the last question the agent asked (its options become quick replies) */
  asked: { id: string; ask: string; type: SpecQuestion["type"]; options: string[] | null } | null
  sent: { name: string; mobile: string; preferredTime: string } | null
}

export const emptyRequestDraft = (): RequestDraft => ({ answers: {}, notes: [], estimate: null, asked: null, sent: null })

export type RequestToolEffects = {
  /** called by request_booking after checks; returns the details shown on the card */
  onRequest: (r: { name: string; mobile: string; preferredTime: string }) => Promise<void>
}

export async function executeRequestTool(
  name: string,
  args: Record<string, unknown>,
  ctx: RequestsContext,
  draft: RequestDraft,
  effects: RequestToolEffects
): Promise<Record<string, unknown>> {
  const spec = ctx.spec
  const qs = spec.questions
  const ask = (id: string) => {
    const q = qs.find((x) => x.id === id)!
    draft.asked = { id, ask: q.ask, type: q.type, options: q.options }
    return { id, ask: q.ask, type: q.type }
  }

  if (name === "ask_booking_question") {
    const id = String(args.question_id ?? "")
    const q = qs.find((x) => x.id === id)
    const next = nextQuestion(spec, draft.answers)
    if (!q || !applies(q, draft.answers)) return { ok: false, error: "not_a_question_to_ask_now", next }
    return { ok: true, ...ask(id) }
  }

  if (name === "record_answer") {
    const id = String(args.question_id ?? "")
    const value = String(args.value ?? "")
    if (id === "note") {
      if (value.trim()) draft.notes.push(value.trim().slice(0, 500))
      const next = nextQuestion(spec, draft.answers)
      return { ok: true, next, ...(next !== "done" ? { next_question: ask(next) } : {}) }
    }
    const q = qs.find((x) => x.id === id)
    if (!q || !applies(q, draft.answers)) return { ok: false, error: "not_a_question_to_ask_now", next: nextQuestion(spec, draft.answers) }
    const checked = checkAnswer(q, value)
    if ("error" in checked) return { ok: false, error: checked.error, options: checked.options ?? null }
    draft.answers[id] = checked.value
    draft.estimate = null
    // An answer that no longer applies (e.g. after changing the service) is dropped.
    for (const other of qs) if (other.id in draft.answers && !applies(other, draft.answers)) delete draft.answers[other.id]
    const next = nextQuestion(spec, draft.answers)
    if (next === "done") draft.asked = null
    return { ok: true, saved: checked.value, next, ...(next !== "done" ? { next_question: ask(next) } : {}) }
  }

  if (name === "quote_estimate") {
    const next = nextQuestion(spec, draft.answers)
    if (next !== "done") return { ok: false, error: "questions_not_done", next }
    const est = computeEstimate(spec, draft.answers)
    if (!est) return { ok: false, error: "unknown_service" }
    draft.estimate = est
    draft.asked = null
    return {
      ok: true,
      shown_to_customer_as_card: true,
      price: est.price === null ? `${ctx.profile.name} will confirm` : peso(est.price),
      duration: duration(est.duration_minutes),
      notes: est.notes,
    }
  }

  if (name === "request_booking") {
    if (nextQuestion(spec, draft.answers) !== "done" || !draft.estimate) return { ok: false, error: "estimate_first" }
    const customer = String(args.name ?? "").trim().slice(0, 80)
    const mobile = normalizeMobile(String(args.mobile ?? ""))
    const preferredTime = String(args.preferred_time_text ?? "").trim().slice(0, 200)
    if (!customer) return { ok: false, error: "missing_name" }
    if (!mobile) return { ok: false, error: "invalid_mobile", hint: "Ask for an 11-digit mobile number starting with 09." }
    if (!preferredTime) return { ok: false, error: "missing_preferred_time" }
    if (draft.sent) return { ok: true, already_sent: true }
    await effects.onRequest({ name: customer, mobile, preferredTime })
    draft.sent = { name: customer, mobile, preferredTime }
    return { ok: true, sent: true }
  }

  return { ok: false, error: "unknown_tool" }
}

/** The details saved on the booking row. */
export function requestDetails(ctx: RequestsContext, draft: RequestDraft) {
  const qs = ctx.spec.questions
  return {
    answers: Object.fromEntries(qs.filter((q) => q.id in draft.answers).map((q) => [q.id, draft.answers[q.id]])),
    summary: shortDetails(ctx.spec, draft.answers),
    estimate: draft.estimate,
    notes: draft.notes,
  }
}

export const finalRequestLine = (name: string, business: string, mobile: string) =>
  `Thank you, ${name}! I've sent your request to ${business}. They'll confirm your schedule by text or call to ${mobile}. This is a request, not a confirmed booking yet.`

/* ---------------------------------------------------------------- instructions */

export function bookingRequestsInstruction(ctx: RequestsContext, draft: RequestDraft, handoffSummary: string) {
  const next = nextQuestion(ctx.spec, draft.answers)
  const b = ctx.profile.name
  const state =
    draft.sent
      ? "The request has been sent. Answer follow-up questions briefly; do not send another request."
      : draft.estimate
        ? "All questions are answered and the estimate was shown."
        : next === "done"
          ? "All questions are answered. Call quote_estimate now."
          : `Next question id: "${next}".`
  return `You are the booking assistant for ${b} (${ctx.pack.display_name}). You collect a booking REQUEST that ${b} confirms later by text or call. You cannot book or confirm anything.
Handoff summary: ${handoffSummary || "(none)"}
Answers so far: ${JSON.stringify(draft.answers)}
${state}

How to work:
1. To ask a question, call ask_booking_question with its id, then reply with the returned "ask" text word for word. You may put a 2-4 word acknowledgement before it. Never list the options: the customer sees them as buttons.
2. When the customer answers, call record_answer (use the matching option text). If it returns an error, ask the same question again. If it returns next_question, reply with its "ask" text word for word (no extra tool call needed). If next = "done", call quote_estimate.
3. After quote_estimate, reply in one short sentence that this is their estimate, then ask exactly: "What's your name?"
4. Then ask exactly: "What mobile number should ${b} use to confirm?"
5. Then ask exactly: "What day and time would you prefer? For example, 'Saturday morning'."
6. Then call request_booking with the name, mobile and preferred time.
- If they have more than one kind of unit or service, say "Let's start with your {type} units. I'll note the others for the team." (use the kind they asked about first) and save the others with record_answer question_id "note".
- If they ask something else (prices, hours), answer briefly from the facts below, then continue.

Facts about ${b} (the only facts you may state):
${factsText(ctx)}

Rules: never say "booked", "confirmed", or "see you on". Never invent prices or times. Keep replies short.`
}

export function salesRequestsInstruction(ctx: RequestsContext, handoffSummary: string) {
  const b = ctx.profile.name
  return `You are the new-customer assistant for ${b} (${ctx.pack.display_name}). The receptionist handed this person to you.
Handoff summary: ${handoffSummary || "(none)"}

Facts about ${b} (the ONLY facts you may state):
${factsText(ctx)}

Your job:
- Answer questions about services, prices, hours, the team, payment and areas using only the facts above. Prices left blank are confirmed by the team.
- If they want to book, call handoff_to_booking with a one-sentence summary.
- If the answer isn't in the facts: call create_needs_you_item with a one-sentence reason in plain English, then reply exactly: "${UNKNOWN_LINE}"
- Refunds or complaints: call create_needs_you_item, then reply exactly: "${PASS_LINE}"

Rules: never invent anything; never give medical or professional advice; keep replies short and friendly.`
}

export function supportRequestsInstruction(ctx: RequestsContext, handoffSummary: string) {
  const b = ctx.profile.name
  return `You are the customer-support assistant for ${b} (${ctx.pack.display_name}). The receptionist handed this person to you.
Handoff summary: ${handoffSummary || "(none)"}

Facts about ${b} (the ONLY general facts you may state):
${factsText(ctx)}

Your job:
- Answer hours, location/areas and other questions from the facts above.
- Questions about their own requests or appointments: call get_my_record. If it says they're not identified, ask for the mobile number they used, then call it again. Answer only from what it returns. A "requested" item is not confirmed yet.
- They want to book or change a booking: call handoff_to_booking.
- If the answer isn't in the facts: call create_needs_you_item with a one-sentence reason, then reply exactly: "${UNKNOWN_LINE}"
- Refunds or complaints: call create_needs_you_item, then reply exactly: "${PASS_LINE}"

Rules: never invent anything; never say a request is confirmed unless get_my_record says "confirmed"; keep replies short and friendly.`
}

const NEEDS_YOU_TOOL: Tool = {
  type: "function",
  name: "create_needs_you_item",
  description: "Tell the team about something you can't answer, or a refund or complaint, so they follow up.",
  parameters: {
    type: "object",
    properties: { reason: { type: "string", description: "One sentence in plain English: what they need." } },
    required: ["reason"],
  },
}

export const SALES_REQUESTS_TOOLS: Tool[] = [NEEDS_YOU_TOOL, handoffTool("booking")]

export const SUPPORT_REQUESTS_TOOLS: Tool[] = [
  {
    type: "function",
    name: "get_my_record",
    description: "Read this person's own booking requests and bookings. Only works once they've given their mobile number.",
    parameters: { type: "object", properties: {} },
  },
  NEEDS_YOU_TOOL,
  handoffTool("booking"),
]

/** Starter chips on the booking page route straight to the right specialist. */
export const STARTER_ROUTES: Record<string, "booking" | "sales" | "support"> = {
  "book an appointment": "booking",
  prices: "sales",
  payment: "sales",
  hmo: "sales",
  hours: "support",
  location: "support",
  "hours & location": "support",
  "do you serve my area?": "support",
}
