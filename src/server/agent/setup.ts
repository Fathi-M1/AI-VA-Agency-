// Setup agent: the owner's own agent. It interviews a new business owner, links each
// service to a bookable calendar event type, and creates the business (a new tenant:
// new rows, no new code). It never talks to customers.
// Tools (capability guardrail): list_calendar_event_types, create_calendar_event_type,
// propose_business, create_business. Nothing else.
// Creating is a two-step handshake enforced in code: propose_business validates and stores a
// draft (and returns a summary to show); create_business only works for a draft proposed in
// an EARLIER turn, i.e. after the owner has seen the summary and replied.
import { createBusinessRow, type BusinessConfig } from "../db/business-config"
import type { Weekday } from "./knowledge/types"
import type { Tool, ToolOutcome } from "./llm"
import { createEventType, listEventTypes } from "./tools/calcom"

const DAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
const HOURS = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/

const nullableString = { type: ["string", "null"] } // Groq: optional fields must allow null (MISTAKES #5)

export const SETUP_TOOLS: Tool[] = [
  {
    type: "function",
    name: "list_calendar_event_types",
    description: "List the bookable event types that already exist in the connected calendar (id, title, length).",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "create_calendar_event_type",
    description:
      "Create a new bookable event type in the connected calendar for one service. Only call after the owner said yes to creating it.",
    parameters: {
      type: "object",
      properties: {
        businessName: { type: "string", description: "The business name (used to keep calendar links unique)." },
        title: { type: "string", description: "Service name, e.g. 'AC repair visit'." },
        lengthInMinutes: { type: "integer", description: "How long the appointment is, in minutes." },
      },
      required: ["businessName", "title", "lengthInMinutes"],
    },
  },
  {
    type: "function",
    name: "create_business",
    description:
      "Create the business from the proposed draft. Only after the owner has seen the summary from propose_business and said yes.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "propose_business",
    description:
      "Validate all the details and store them as a draft. Returns a summary: show it to the owner and ask them to confirm. Every service must have a calendar event type id from list/create.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        businessType: { type: "string", description: "e.g. 'HVAC contractor', 'Hair salon'." },
        customerSingular: { type: "string", description: "What they call one customer, e.g. 'client'." },
        customerPlural: { type: "string", description: "Plural, e.g. 'clients'." },
        ownerName: nullableString,
        timezone: { type: "string", description: "IANA timezone, e.g. 'Asia/Singapore'." },
        hours: {
          type: "object",
          description: "Opening hours per day as 'HH:MM-HH:MM' (24 h), or null when closed.",
          properties: Object.fromEntries(DAYS.map((d) => [d, nullableString])),
          required: DAYS,
        },
        services: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              durationMinutes: { type: "integer" },
              calendarEventTypeId: { type: "integer" },
            },
            required: ["name", "durationMinutes", "calendarEventTypeId"],
          },
        },
        faqs: {
          type: "array",
          items: {
            type: "object",
            properties: { question: { type: "string" }, answer: { type: "string" } },
            required: ["question", "answer"],
          },
        },
        restrictedAdvice: { type: "array", items: { type: "string" }, description: "Kinds of advice the AI must never give." },
        emergencyLine: { type: "string", description: "Read word for word when an emergency word is heard." },
        emergencyKeywords: { type: "array", items: { type: "string" } },
      },
      required: [
        "name",
        "businessType",
        "customerSingular",
        "customerPlural",
        "timezone",
        "hours",
        "services",
        "faqs",
        "restrictedAdvice",
        "emergencyLine",
        "emergencyKeywords",
      ],
    },
  },
]

export function setupInstruction(todayIso: string) {
  return `You are the Setup agent for an AI front-desk platform that serves any kind of small business (clinics, home services, salons, law firms, auto repair…). You are talking to a business OWNER who is registering their business. You never talk to their customers.

Today is ${todayIso}.

Your job: interview the owner in plain, friendly language, a few questions at a time, and set up their AI team. Collect:
1. Business name, type of business, and the owner's name.
2. What they call their customers (one and many, e.g. patient/patients, client/clients, customer/customers).
3. Timezone (an IANA name like Asia/Singapore or America/New_York; suggest one from their city).
4. Opening hours for each day (or closed).
5. Services they want the AI to book, each with its length in minutes.
6. A few FAQs with the owner's exact answers (optional; can be none).
7. Advice the AI must never give for this kind of business (e.g. medical advice, legal advice, gas-leak diagnosis).
8. An emergency instruction (what to tell someone in an emergency) and the emergency words that trigger it. If the business has no emergencies, propose a short generic line and let them confirm.

Calendar: every service must be linked to a bookable calendar event type before the business is created.
- Call list_calendar_event_types. If an existing type clearly matches a service (same service and length), offer to use it.
- Otherwise ask: "Shall I create a '<service>' calendar type (<N> min)?" and only call create_calendar_event_type after the owner says yes.

Before creating: call propose_business with all the details. Show the owner the summary it returns and ask "Shall I create it?". Then STOP and wait for their reply. Only when they clearly say yes, call create_business. If they change anything, call propose_business again and re-confirm. When create_business succeeds, tell them their AI team is ready and that they can open their dashboard.

Rules:
- Ask, don't assume. Never invent hours, services, prices or answers for the owner; use exactly what they tell you.
- Keep messages short. Use plain text (no markdown tables).
- If something is unclear (e.g. a time like "late"), ask once to clarify.`
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const strList = (v: unknown, maxItems: number, maxLen: number) =>
  Array.isArray(v) ? [...new Set(v.map((x) => str(x, maxLen)).filter(Boolean))].slice(0, maxItems) : []

/** Validates create_business args into a config, or returns the problems to fix. */
function toConfig(args: Record<string, unknown>): { name: string; config: BusinessConfig } | { errors: string[] } {
  const errors: string[] = []
  const name = str(args.name, 120)
  if (!name) errors.push("name is required")
  const singular = str(args.customerSingular, 40)
  const plural = str(args.customerPlural, 40)
  if (!singular || !plural) errors.push("customerSingular and customerPlural are required")
  const timezone = str(args.timezone, 64)
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone })
  } catch {
    errors.push(`timezone "${timezone}" is not a valid IANA timezone`)
  }
  const hoursIn = (args.hours ?? {}) as Record<string, unknown>
  const hours = {} as BusinessConfig["hours"]
  for (const d of DAYS) {
    const h = hoursIn[d]
    if (h === null || h === undefined || h === "") hours[d] = null
    else if (typeof h === "string" && HOURS.test(h) && h.slice(0, 5) < h.slice(6)) hours[d] = h
    else errors.push(`hours.${d} must be "HH:MM-HH:MM" (open before close) or null`)
  }
  const servicesIn = Array.isArray(args.services) ? args.services : []
  const services = servicesIn
    .map((s) => s as Record<string, unknown>)
    .map((s) => ({
      name: str(s.name, 80),
      duration_minutes: Number(s.durationMinutes),
      calcom_event_type_id: Number(s.calendarEventTypeId),
    }))
  if (services.length === 0) errors.push("at least one service is required")
  for (const s of services) {
    if (!s.name || !Number.isInteger(s.duration_minutes) || s.duration_minutes < 5 || !Number.isInteger(s.calcom_event_type_id)) {
      errors.push(`service "${s.name || "?"}" needs a name, a duration (minutes) and a calendarEventTypeId`)
    }
  }
  const emergencyLine = str(args.emergencyLine, 600)
  if (!emergencyLine) errors.push("emergencyLine is required")
  if (errors.length) return { errors }

  const faqs = (Array.isArray(args.faqs) ? args.faqs : [])
    .map((f) => f as Record<string, unknown>)
    .map((f) => ({ question: str(f.question, 300), answer: str(f.answer, 1000) }))
    .filter((f) => f.question && f.answer)
    .slice(0, 50)

  const config: BusinessConfig = {
    business_type: str(args.businessType, 80) || undefined,
    owner_name: str(args.ownerName, 80) || undefined,
    customer_term: { singular, plural },
    timezone,
    hours,
    services,
    faqs,
    restricted_advice: strList(args.restrictedAdvice, 20, 120),
    rules: { emergency_keywords: strList(args.emergencyKeywords, 50, 60) },
    emergency_line: emergencyLine,
  }
  return { name, config: JSON.parse(JSON.stringify(config)) }
}

const result = (r: Record<string, unknown>): ToolOutcome => ({ kind: "result", result: r })

export type SetupState = {
  /** owner messages so far in this conversation */
  turn: number
  draft: { name: string; config: BusinessConfig; turn: number } | null
  created: { id: string; name: string } | null
}

function summaryOf(name: string, c: BusinessConfig) {
  const hours = DAYS.map((d) => `${d}: ${c.hours[d] ?? "closed"}`).join(", ")
  return [
    `Business: ${name} (${c.business_type ?? "business"}), owner ${c.owner_name ?? "not given"}`,
    `Customers are called: ${c.customer_term?.singular}/${c.customer_term?.plural}`,
    `Timezone: ${c.timezone}`,
    `Hours: ${hours}`,
    `Services: ${c.services.map((s) => `${s.name} (${s.duration_minutes} min, calendar type ${s.calcom_event_type_id})`).join("; ")}`,
    `FAQs: ${c.faqs?.length ? c.faqs.map((f) => `"${f.question}" -> "${f.answer}"`).join("; ") : "none"}`,
    `Never gives: ${c.restricted_advice?.join(", ") || "nothing set"}`,
    `Emergency line: "${c.emergency_line}" (words: ${c.rules?.emergency_keywords?.join(", ") || "none"})`,
  ].join("\n")
}

/** Runs one Setup tool against this conversation's state. */
export async function executeSetupTool(
  name: string,
  args: Record<string, unknown>,
  state: SetupState
): Promise<ToolOutcome> {
  if (name === "list_calendar_event_types") {
    const types = await listEventTypes()
    return result({ ok: true, eventTypes: types.map((t) => ({ id: t.id, title: t.title, lengthInMinutes: t.lengthInMinutes })) })
  }

  if (name === "create_calendar_event_type") {
    const title = str(args.title, 80)
    const length = Number(args.lengthInMinutes)
    const businessName = str(args.businessName, 120)
    if (!title || !Number.isInteger(length) || length < 5 || length > 600) {
      return result({ ok: false, error: "title and lengthInMinutes (5–600) are required" })
    }
    const created = await createEventType({
      title,
      slug: `${slugify(businessName || "business")}-${slugify(title)}`.slice(0, 90),
      lengthInMinutes: length,
    })
    return created.ok
      ? result({ ok: true, eventType: created.eventType })
      : result({ ok: false, error: `calendar refused (${created.httpStatus}): ${created.message}` })
  }

  if (name === "propose_business") {
    if (state.created) return result({ ok: false, error: "This business was already created in this conversation." })
    const parsed = toConfig(args)
    if ("errors" in parsed) return result({ ok: false, error: "fix these and try again", problems: parsed.errors })
    state.draft = { ...parsed, turn: state.turn }
    return result({
      ok: true,
      summaryToShowOwner: summaryOf(parsed.name, parsed.config),
      next: "Show this summary and ask the owner to confirm. Do not call create_business until they reply yes.",
    })
  }

  if (name === "create_business") {
    if (state.created) return result({ ok: false, error: "This business was already created in this conversation." })
    if (!state.draft) return result({ ok: false, error: "No draft yet. Call propose_business first and show the owner the summary." })
    if (state.draft.turn >= state.turn) {
      return result({ ok: false, error: "The owner hasn't seen the summary yet. Show it, ask them to confirm, and wait for their reply." })
    }
    const id = await createBusinessRow(state.draft.name, state.draft.config)
    state.created = { id, name: state.draft.name }
    return result({ ok: true, businessId: id })
  }

  return result({ ok: false, error: `No tool named ${name}.` })
}
