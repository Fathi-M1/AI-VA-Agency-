// The booking engine, shared by the server (agents, form submit, magic fill) and the
// browser (the live receipt). Pure functions over a serializable BookingSpec built from
// one business's pack + services + team + config. Nothing here knows a business type:
// every special behavior comes from a pack field.
import { duration, peso, plural } from "./format"

export type HairLength = "short" | "shoulder" | "long"

export type SpecQuestion = {
  id: string
  ask: string
  type: "choice" | "number" | "yes_no" | "text"
  /** options with $SERVICES / $STAFF / $HMOS filled in; yes_no → ["Yes","No"] */
  options: string[] | null
  applies_to: "all" | string[]
  ask_if: { question_id: string; equals: string } | null
  required: boolean
  /** a "$STAFF" question (handled by "Who & when" on the booking page) */
  isStaff: boolean
  /** skipped for this business (one team member, or no HMOs) */
  skip: boolean
  option_details: Record<string, { hint?: string; icon?: string }> | null
  help_prompt: string | null
  min: number
  max: number
  summary_template: string | null
  summary_skip: string[]
  variant_map: Record<string, HairLength> | null
  multiline: boolean
}

export type SpecService = {
  name: string
  duration_minutes: number
  price_php: number | null
  pricing_type: "fixed" | "by_hair_length" | "per_unit"
  variants: Record<HairLength, { price_php: number | null; duration_minutes: number }> | null
}

export type SpecStaff = { id: string; name: string; hours: { weekday: number; start_time: string; end_time: string }[] }

export type BookingSpec = {
  business: string
  staffRole: string
  questions: SpecQuestion[]
  services: SpecService[]
  staff: SpecStaff[]
  quantityQuestion: string | null
  addressQuestion: string | null
  extraCharges: { label: string; price: number | null; countQuestion: string }[]
  minimum: number | null
  areas: string[]
}

export type Answers = Record<string, string>

export const applies = (q: SpecQuestion, a: Answers) =>
  !q.skip &&
  (q.applies_to === "all" || q.applies_to.includes(a.service ?? "")) &&
  (!q.ask_if || a[q.ask_if.question_id] === q.ask_if.equals)

/** The next question still to answer, or "done". */
export function nextQuestion(spec: BookingSpec, a: Answers): string {
  return spec.questions.find((q) => applies(q, a) && !(q.id in a))?.id ?? "done"
}

/** Questions that apply now, in order. */
export const activeQuestions = (spec: BookingSpec, a: Answers) => spec.questions.filter((q) => applies(q, a))

/** Drops answers that no longer apply (e.g. after changing the service). */
export function pruneAnswers(spec: BookingSpec, a: Answers): Answers {
  const out = { ...a }
  for (let changed = true; changed; ) {
    changed = false
    for (const q of spec.questions) {
      if (q.id in out && !applies(q, out)) {
        delete out[q.id]
        changed = true
      }
    }
  }
  return out
}

/** Strips a trailing "(…)" for compact labels: "Long (below the shoulders)" → "Long". */
export const shortLabel = (option: string) => option.replace(/\s*\([^)]*\)\s*$/, "")

/** Checks one answer against its question: the stored value, or an error. */
export function checkAnswer(q: SpecQuestion, raw: string): { value: string } | { error: string; options?: string[] } {
  const v = raw.trim()
  if (!v) return q.required ? { error: "An answer is required." } : { value: "" }
  if (q.type === "number") {
    const n = Number(v.replace(/[^\d]/g, ""))
    if (!Number.isInteger(n) || n < q.min || n > q.max) return { error: `Must be a whole number from ${q.min} to ${q.max}.` }
    return { value: String(n) }
  }
  if (q.type === "yes_no") {
    if (/^(y|yes|yeah|yep|oo)\b/i.test(v)) return { value: "Yes" }
    if (/^(n|no|nope|none|hindi)\b/i.test(v)) return { value: "No" }
    return { error: "Must be Yes or No.", options: ["Yes", "No"] }
  }
  if (q.type === "choice" && q.options) {
    const lower = v.toLowerCase()
    const exact = q.options.find((o) => o.toLowerCase() === lower)
    if (exact) return { value: exact }
    const partial = q.options.filter((o) => o.toLowerCase().startsWith(lower) || lower === shortLabel(o).toLowerCase())
    if (partial.length === 1) return { value: partial[0] }
    return { error: "Not one of the options.", options: q.options }
  }
  return { value: v.slice(0, 500) }
}

/* ---------------------------------------------------------------- estimate */

export type Estimate = { price: number | null; duration_minutes: number; notes: string[] }

/** Deterministic price and time (no model math). Null until a service is chosen. */
export function computeEstimate(spec: BookingSpec, a: Answers): Estimate | null {
  const svc = spec.services.find((s) => s.name === a.service)
  if (!svc) return null
  const notes: string[] = []
  let price: number | null
  let minutes: number

  if (svc.pricing_type === "by_hair_length" && svc.variants) {
    const vq = spec.questions.find((q) => q.variant_map && q.id in a)
    const key = vq?.variant_map?.[a[vq.id]] ?? "short"
    price = svc.variants[key].price_php
    minutes = svc.variants[key].duration_minutes
  } else if (svc.pricing_type === "per_unit") {
    const units = Math.max(1, Number((spec.quantityQuestion && a[spec.quantityQuestion]) || 1))
    minutes = svc.duration_minutes * units
    if (svc.price_php === null) price = null
    else {
      price = svc.price_php * units
      for (const x of spec.extraCharges) {
        const count = Number(a[x.countQuestion] || 0)
        if (x.price && count) price += x.price * count
      }
      if (spec.minimum && price < spec.minimum) {
        price = spec.minimum
        notes.push(`Minimum booking of ${peso(spec.minimum)} applies.`)
      }
    }
  } else {
    price = svc.price_php
    minutes = svc.duration_minutes
  }

  const address = spec.addressQuestion ? a[spec.addressQuestion] : undefined
  if (address && spec.areas.length && !spec.areas.some((ar) => address.toLowerCase().includes(ar.toLowerCase()))) {
    notes.push("We may not cover this area yet — the team will confirm.")
  }
  return { price, duration_minutes: minutes, notes }
}

export const estimateText = (e: Estimate) =>
  `${e.price === null ? "Price on request" : peso(e.price)} · about ${duration(e.duration_minutes)}`

/* ---------------------------------------------------------------- summary */

function fill(template: string, value: string) {
  const n = Number(value)
  return template.replace("{value}", shortLabel(value)).replace("{s}", Number.isFinite(n) && n === 1 ? "" : "s")
}

/** The key details, e.g. ["Long hair"], ["2 units", "1 inverter"], ["Dog", "Bantay"]. */
export function keyDetails(spec: BookingSpec, a: Answers): string[] {
  const out: string[] = []
  for (const q of spec.questions) {
    const v = a[q.id]
    if (!v || q.id === "service" || q.isStaff || !applies(q, a) || q.summary_skip.includes(v)) continue
    if (q.summary_template) out.push(fill(q.summary_template, v))
    else if (q.type === "choice") out.push(shortLabel(v))
    else if (q.type === "number") out.push(String(v))
  }
  return out
}

/** "Rebond · Long hair · Stylist: Joy" */
export function shortDetails(spec: BookingSpec, a: Answers, staffName?: string | null) {
  const staffQ = spec.questions.find((q) => q.isStaff)
  const who = staffName ?? (staffQ ? a[staffQ.id] : undefined)
  return [a.service, ...keyDetails(spec, a), who && who !== "Anyone available" ? `${spec.staffRole}: ${who}` : ""]
    .filter(Boolean)
    .join(" · ")
}

export { plural }

/* ---------------------------------------------------------------- who & when */

export type TimeOfDay = "morning" | "afternoon" | "evening"
export const TIMES_OF_DAY: { key: TimeOfDay; label: string; from: number; to: number }[] = [
  { key: "morning", label: "Morning", from: 0, to: 12 * 60 },
  { key: "afternoon", label: "Afternoon", from: 12 * 60, to: 17 * 60 },
  { key: "evening", label: "Evening", from: 17 * 60, to: 24 * 60 },
]

const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

/** Shifts on a weekday for one team member, or for anyone (staffId null). */
function shiftsFor(spec: BookingSpec, staffId: string | null, weekday: number) {
  const people = staffId ? spec.staff.filter((m) => m.id === staffId) : spec.staff
  return people.flatMap((m) => m.hours.filter((h) => h.weekday === weekday))
}

/** Is anyone (or this person) working that weekday? */
export const worksOn = (spec: BookingSpec, staffId: string | null, weekday: number) => shiftsFor(spec, staffId, weekday).length > 0

/** Times of day that overlap the person's (or anyone's) hours that weekday. */
export function openTimesOfDay(spec: BookingSpec, staffId: string | null, weekday: number): TimeOfDay[] {
  const shifts = shiftsFor(spec, staffId, weekday)
  return TIMES_OF_DAY.filter((t) => shifts.some((h) => mins(h.start_time) < t.to && mins(h.end_time) > t.from)).map((t) => t.key)
}

export type DayOption = { value: string; label: string; long: string; weekday: number }

/* ---------------------------------------------------------------- validated fill */

export type RawFill = {
  service?: string | null
  answers?: { question_id: string; value: string }[]
  staff?: string | null
  day?: string | null
  time_of_day?: string | null
}

export type Fill = {
  answers: Answers
  /** a team member's id, "any" for "Anyone available", or undefined when not given */
  staffId?: string
  day?: string
  timeOfDay?: TimeOfDay
}

/** Keeps only values that match this business's real services, options, team, open
 *  days and times; everything else is dropped (never invented). */
export function validateFill(spec: BookingSpec, days: DayOption[], raw: RawFill): Fill {
  const answers: Answers = {}
  const svc = raw.service && spec.services.find((s) => s.name.toLowerCase() === raw.service!.trim().toLowerCase())
  if (svc) answers.service = svc.name
  const given = new Map((raw.answers ?? []).map((a) => [a.question_id, a.value]))
  for (const q of spec.questions) {
    if (q.id === "service" || q.isStaff || !given.has(q.id) || !applies(q, answers)) continue
    const checked = checkAnswer(q, String(given.get(q.id) ?? ""))
    if ("value" in checked && checked.value) answers[q.id] = checked.value
  }
  const out: Fill = { answers }
  const who = raw.staff?.trim().toLowerCase()
  if (who) {
    if (who === "anyone available" || who === "anyone") out.staffId = "any"
    else {
      const m = spec.staff.find((x) => x.name.toLowerCase() === who)
      if (m) out.staffId = m.id
    }
  }
  const staffFilter = out.staffId && out.staffId !== "any" ? out.staffId : null
  const day = raw.day ? days.find((d) => d.value === raw.day) : undefined
  if (day && worksOn(spec, staffFilter, day.weekday)) out.day = day.value
  const tod = TIMES_OF_DAY.find((t) => t.key === raw.time_of_day)?.key
  if (tod && (!out.day || openTimesOfDay(spec, staffFilter, day!.weekday).includes(tod))) out.timeOfDay = tod
  return out
}

/** What's still needed: "service", question ids, "day", "time_of_day". */
export function missingFor(spec: BookingSpec, f: Fill): string[] {
  const missing: string[] = []
  if (!f.answers.service) missing.push("service")
  for (const q of spec.questions) {
    if (q.id === "service" || q.isStaff || !q.required || !applies(q, f.answers)) continue
    if (!f.answers[q.id]) missing.push(q.id)
  }
  if (!f.day) missing.push("day")
  if (!f.timeOfDay) missing.push("time_of_day")
  return missing
}
