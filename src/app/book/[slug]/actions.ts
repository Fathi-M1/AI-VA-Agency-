"use server"

// "Send request" on the booking page: deterministic, no model. Checks everything again,
// runs the safety net on the customer's text answers, upserts the customer by mobile,
// and creates the booking request with a reference code, then returns the code for
// the ticket page.
import {
  activeQuestions,
  computeEstimate,
  missingFor,
  shortDetails,
  validateFill,
  type Answers,
  type TimeOfDay,
} from "@/lib/booking-engine"
import { normalizeMobile } from "@/lib/format"
import { linkVisitCustomer, logToConversation, safetyCheck } from "@/server/agent/orchestrator"
import { loadStorefront } from "@/server/booking-page"
import { asServiceRole, db } from "@/server/db/client"

// Writing to this business's conversation (the agent's log) needs the service role; the
// business comes only from the booking link. The booking request itself goes through the
// narrow public function as an anonymous customer.
const asLog = <T,>(fn: () => Promise<T>) => asServiceRole("booking form conversation log (one business, by booking link)", fn)

export type SubmitInput = {
  sessionId: string
  answers: Answers
  staffId: string // a team member's id, or "any"
  day: string
  timeOfDay: TimeOfDay
  name: string
  mobile: string
  email: string
  consent: boolean
  /** What the customer first typed on the page ("Fill it for me"), kept for the transcript. */
  note?: string
}

export type SubmitResult =
  | { ok: true; token: string; code: string }
  | { ok: false; emergency: string }
  | { ok: false; errors: Record<string, string> }
  | { ok: false; error: string }

const TOD_LABEL = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" } as const
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function submitRequest(slug: string, input: SubmitInput): Promise<SubmitResult> {
  const loaded = await loadStorefront(slug)
  if (!loaded) return { ok: false, error: "This booking link isn't active." }
  const { business, store, pack } = loaded
  const spec = store.spec
  const sessionId = String(input.sessionId ?? "").slice(0, 100)

  // Re-validate every choice against the business's real options.
  const fill = validateFill(spec, store.days, {
    service: input.answers.service,
    answers: Object.entries(input.answers)
      .filter(([k]) => k !== "service")
      .map(([question_id, value]) => ({ question_id, value: String(value) })),
    staff: input.staffId === "any" ? "Anyone available" : spec.staff.find((m) => m.id === input.staffId)?.name ?? null,
    day: input.day,
    time_of_day: input.timeOfDay,
  })
  if (spec.staff.length <= 1) fill.staffId = spec.staff[0]?.id ?? "any"
  const errors: Record<string, string> = {}
  for (const k of missingFor(spec, fill)) errors[k] = "Please answer this."
  if (!fill.staffId) errors.staff = "Pick a team member or Anyone available."

  const name = String(input.name ?? "").trim().slice(0, 80)
  const mobile = normalizeMobile(String(input.mobile ?? ""))
  const email = String(input.email ?? "").trim().toLowerCase().slice(0, 120)
  if (!name) errors.name = "Enter your name."
  if (!mobile) errors.mobile = "Enter an 11-digit mobile number starting with 09."
  if (email && !EMAIL.test(email)) errors.email = "Enter a valid email, or leave it blank."
  if (pack.requires_consent && !input.consent) errors.consent = "Please tick the box to agree."
  if (Object.keys(errors).length) return { ok: false, errors }

  // Safety net on everything the customer typed.
  const typed = activeQuestions(spec, fill.answers)
    .filter((q) => q.type === "text" && fill.answers[q.id])
    .map((q) => fill.answers[q.id])
  if (typed.length) {
    const emergency = await asLog(() => safetyCheck(business.id, sessionId, "web", typed.join("\n")))
    if (emergency) return { ok: false, emergency }
  }

  const estimate = computeEstimate(spec, fill.answers)
  const staffId = fill.staffId && fill.staffId !== "any" ? fill.staffId : null
  const staffName = staffId ? spec.staff.find((m) => m.id === staffId)?.name : null
  const day = store.days.find((d) => d.value === fill.day)!
  const tod = fill.timeOfDay!
  const summary = shortDetails(spec, fill.answers, staffName)

  try {
    // One conversation per real request: the customer's own words (if they used "Fill it
    // for me"), then what Booking sent. The customer is named by create_booking_request below.
    const note = String(input.note ?? "").trim().slice(0, 500)
    const conversationId = await asLog(() => logToConversation(business.id, sessionId, "web", [
      ...(note ? [{ role: "customer" as const, agent: null, content: note }] : []),
      { role: "agent", agent: "booking", content: `Booking request sent: ${summary} · ${day.long} · ${TOD_LABEL[tod]}.` },
    ]))
    // The same narrow function the public storefront uses: customer by mobile, booking
    // request, reference code and private ticket token, in one transaction.
    const { data, error } = await db().rpc("create_booking_request", {
      p_link: store.slug,
      req: {
        name,
        mobile,
        email,
        consent: !!input.consent,
        service: fill.answers.service,
        staff_id: staffId,
        conversation_id: conversationId,
        details: {
          answers: Object.fromEntries(activeQuestions(spec, fill.answers).filter((q) => fill.answers[q.id]).map((q) => [q.id, fill.answers[q.id]])),
          summary,
          estimate,
          notes: [],
        },
        preferred_day: day.value,
        preferred_time_of_day: tod,
        requested_time_text: `${day.long} · ${TOD_LABEL[tod]}`,
      },
    })
    if (error || !data) {
      console.error("[book/submit] request failed:", error?.message ?? "no data")
      return { ok: false, error: "We couldn't send your request. Check your connection and try again." }
    }
    const made = data as { ticket_token: string; reference_code: string; customer_id: string }
    await asLog(() => linkVisitCustomer(business.id, sessionId, { id: made.customer_id, name, mobile }))
    return { ok: true, token: made.ticket_token, code: made.reference_code }
  } catch (err) {
    console.error("[book/submit]", err instanceof Error ? err.message : "unknown error")
    return { ok: false, error: "We couldn't send your request. Check your connection and try again." }
  }
}
