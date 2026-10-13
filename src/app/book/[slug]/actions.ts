"use server"

// "Send request" on the booking page: deterministic, no model. Checks everything again,
// runs the safety net on the customer's text answers, upserts the contact by mobile,
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
import { linkVisitContact, logToConversation, safetyCheck } from "@/server/agent/orchestrator"
import { loadStorefront } from "@/server/booking-page"
import { db } from "@/server/db/client"
import { upsertContactByMobile } from "@/server/db/store"

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
}

export type SubmitResult =
  | { ok: true; code: string }
  | { ok: false; emergency: string }
  | { ok: false; errors: Record<string, string> }
  | { ok: false; error: string }

const TOD_LABEL = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" } as const
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** "Bella Hair Studio" → "BH"; "Juan's" → "JU". */
function initials(name: string) {
  const words = name.replace(/[^A-Za-z\s]/g, "").split(/\s+/).filter(Boolean)
  const two = words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? "BK").slice(0, 2)
  return two.toUpperCase().padEnd(2, "K")
}

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
    const emergency = await safetyCheck(business.id, sessionId, "web", typed.join("\n"))
    if (emergency) return { ok: false, emergency }
  }

  const estimate = computeEstimate(spec, fill.answers)
  const staffId = fill.staffId && fill.staffId !== "any" ? fill.staffId : null
  const staffName = staffId ? spec.staff.find((m) => m.id === staffId)?.name : null
  const day = store.days.find((d) => d.value === fill.day)!
  const tod = fill.timeOfDay!
  const summary = shortDetails(spec, fill.answers, staffName)

  try {
    const contact = await upsertContactByMobile(business.id, {
      mobile: mobile!,
      name,
      consentAt: pack.requires_consent ? new Date().toISOString() : null,
    })
    if (email) {
      // Optional email: saved unless another contact of this business already uses it.
      await db().from("contacts").update({ email }).eq("business_id", business.id).eq("id", contact.id).is("email", null)
    }
    const conversationId = await logToConversation(business.id, sessionId, "web", [
      { role: "agent", agent: "booking", content: `Booking request sent from the form: ${summary} · ${day.long} · ${TOD_LABEL[tod]}.` },
    ])
    await linkVisitContact(business.id, sessionId, contact)

    const row = {
      business_id: business.id,
      contact_id: contact.id,
      conversation_id: conversationId,
      service: fill.answers.service,
      staff_id: staffId,
      details: {
        answers: Object.fromEntries(activeQuestions(spec, fill.answers).filter((q) => fill.answers[q.id]).map((q) => [q.id, fill.answers[q.id]])),
        summary,
        estimate,
        notes: [],
      },
      requested_time_text: `${day.long} · ${TOD_LABEL[tod]}`,
      preferred_day: day.value,
      preferred_time_of_day: tod,
      customer_mobile: mobile,
      status: "requested",
      source: "form",
    }
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = `${initials(business.name)}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`
      const { error } = await db().from("bookings").insert({ ...row, reference_code: code })
      if (!error) return { ok: true, code }
      if (error.code !== "23505") {
        console.error("[book/submit] insert failed:", error.message)
        return { ok: false, error: "We couldn't send your request. Check your connection and try again." }
      }
    }
    return { ok: false, error: "We couldn't send your request. Please try again." }
  } catch (err) {
    console.error("[book/submit]", err instanceof Error ? err.message : "unknown error")
    return { ok: false, error: "We couldn't send your request. Check your connection and try again." }
  }
}
