// Business type packs (web/verticals/*.json): every .json file in that folder is loaded
// and checked with zod when the server starts (src/instrumentation.ts imports this
// file), so adding a business type needs no code. A bad pack stops the server with the
// file and field named. Also renders a business's FAQ answers from its own setup data
// and builds its BookingSpec (deterministic, no model involved).
import fs from "node:fs"
import path from "node:path"
import * as Lucide from "lucide-react"
import { z } from "zod"

import type { BookingSpec, SpecQuestion } from "@/lib/booking-engine"
import { duration, listJoin, peso } from "@/lib/format"
import { mergedIntervals, summarizeHours } from "@/lib/hours"
import { activeServices, activeStaff, type BusinessProfile } from "../db/business-profile"

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "must look like 09:00")
const isIcon = (name: string) => /^[A-Z]/.test(name) && name in Lucide
const icon = z.string().refine(isIcon, "must be a Lucide icon name, e.g. Scissors (see lucide.dev)")
const length = z.enum(["short", "shoulder", "long"])

const QuestionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/, "must be lowercase letters, numbers and _"),
  ask: z.string().min(1),
  type: z.enum(["choice", "number", "yes_no", "text"]),
  options: z.array(z.string()).nullable(),
  applies_to: z.union([z.literal("all"), z.array(z.string())]),
  ask_if: z.object({ question_id: z.string(), equals: z.string() }).nullable(),
  required: z.boolean(),
  option_details: z.record(z.object({ hint: z.string().optional(), icon: icon.optional() })).optional(),
  help_prompt: z.string().optional(),
  min: z.number().int().optional(),
  max: z.number().int().optional(),
  summary_template: z.string().optional(),
  summary_skip: z.array(z.string()).optional(),
  variant_map: z.record(length).optional(),
  multiline: z.boolean().optional(),
})

const PackSchema = z
  .object({
    vertical: z.string().regex(/^[a-z][a-z0-9_]{1,40}$/, "must be lowercase letters, numbers and _"),
    display_name: z.string().min(1),
    card_description: z.string().min(1),
    staff_role: z.string().min(1),
    staff_role_plural: z.string().min(1),
    name_placeholder: z.string().min(1),
    staff_name_placeholder: z.string().min(1),
    research_level: z.enum(["researched", "starter"]),
    icon,
    booking_example: z.string().min(1),
    sample_request: z.string().min(1),
    requires_consent: z.boolean().optional(),
    uses_service_areas: z.boolean().optional(),
    accepts_hmo: z.boolean().optional(),
    asks_walk_ins: z.boolean().optional(),
    quantity_question: z.string().optional(),
    address_question: z.string().optional(),
    extra_charges: z
      .array(z.object({ config_key: z.string().min(1), label: z.string().min(1), count_question: z.string().min(1) }))
      .optional(),
    minimum_booking: z.boolean().optional(),
    default_hours: z
      .array(z.object({ weekday: z.number().int().min(0).max(6), start: hhmm, end: hhmm }))
      .min(1),
    services: z
      .array(
        z.object({
          name: z.string().min(1),
          pricing_type: z.enum(["fixed", "by_hair_length", "per_unit"]),
          duration_minutes: z.number().int().positive(),
          variants: z
            .object({
              short: z.object({ duration_minutes: z.number().int().positive() }),
              shoulder: z.object({ duration_minutes: z.number().int().positive() }),
              long: z.object({ duration_minutes: z.number().int().positive() }),
            })
            .nullable(),
          typical_range: z.string().nullable(),
          default_on: z.boolean(),
        })
      )
      .min(1),
    booking_questions: z.array(QuestionSchema),
    faqs: z.array(z.object({ q: z.string().min(1), a_template: z.string().min(1) })),
    emergency_keywords: z.array(z.string().min(1)).min(1),
    emergency_instruction: z.string().min(1),
    setup_tips: z.object({ step1: z.string(), step2: z.string(), step3: z.string(), step4: z.string() }),
    _help: z.string(),
  })
  .superRefine((p, ctx) => {
    const ids = new Set(p.booking_questions.map((q) => q.id))
    const ref = (field: (string | number)[], id: string | undefined) => {
      if (id && !ids.has(id)) ctx.addIssue({ code: "custom", path: field, message: `names a question "${id}" that doesn't exist` })
    }
    p.services.forEach((s, i) => {
      if (s.pricing_type === "by_hair_length" && !s.variants)
        ctx.addIssue({ code: "custom", path: ["services", i, "variants"], message: "needed for by_hair_length" })
    })
    p.booking_questions.forEach((q, i) => {
      if (q.type === "choice" && !q.options?.length)
        ctx.addIssue({ code: "custom", path: ["booking_questions", i, "options"], message: "a choice needs options" })
      if (q.ask_if) ref(["booking_questions", i, "ask_if", "question_id"], q.ask_if.question_id)
    })
    ref(["quantity_question"], p.quantity_question)
    ref(["address_question"], p.address_question)
    p.extra_charges?.forEach((x, i) => ref(["extra_charges", i, "count_question"], x.count_question))
  })

export type Pack = z.infer<typeof PackSchema>
export type BookingQuestion = Pack["booking_questions"][number]

/** Every pack asks for the service first; a pack that leaves it out gets this one. */
const SERVICE_QUESTION: BookingQuestion = {
  id: "service",
  ask: "Which service would you like to book?",
  type: "choice",
  options: ["$SERVICES"],
  applies_to: "all",
  ask_if: null,
  required: true,
}

function loadAll(): Record<string, Pack> {
  const dir = path.join(process.cwd(), "verticals")
  const packs: Record<string, Pack> = {}
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    let raw: unknown
    try {
      raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
    } catch (err) {
      throw new Error(`Business type pack web/verticals/${file} is not valid JSON: ${err instanceof Error ? err.message : err}`)
    }
    const parsed = PackSchema.safeParse(raw)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      throw new Error(`Business type pack web/verticals/${file} is invalid: field "${issue.path.join(".")}" ${issue.message}`)
    }
    const pack = parsed.data
    if (`${pack.vertical}.json` !== file)
      throw new Error(`Business type pack web/verticals/${file}: field "vertical" must be "${file.replace(/\.json$/, "")}"`)
    if (!pack.booking_questions.some((q) => q.id === "service")) pack.booking_questions.unshift(SERVICE_QUESTION)
    packs[pack.vertical] = pack
  }
  if (!packs.other) throw new Error('Business type packs: web/verticals/other.json (the "Other service business" catch-all) is missing')
  return packs
}

const PACKS = loadAll()

export const isVertical = (v: string | null | undefined): v is string => !!v && v in PACKS

export function getPack(vertical: string): Pack {
  const pack = PACKS[vertical]
  if (!pack) throw new Error(`Unknown business type "${vertical}"`)
  return pack
}

/** All packs for the setup screen: researched types first, then starters A–Z, "other" last. */
export function packList(): Pack[] {
  return Object.values(PACKS).sort((a, b) => {
    if (a.vertical === "other") return 1
    if (b.vertical === "other") return -1
    if (a.research_level !== b.research_level) return a.research_level === "researched" ? -1 : 1
    return a.display_name.localeCompare(b.display_name)
  })
}

/* ---------------------------------------------------------------- hours */

/** Per weekday (0 = Sunday): the team's merged working intervals ("09:00"-"12:00", ...). */
export function openIntervals(b: Pick<BusinessProfile, "staff">): [string, string][][] {
  return mergedIntervals(b.staff.filter((m) => m.active).flatMap((m) => m.hours))
}

/** "Monday to Saturday: 9:00 AM – 12:00 PM and 1:00 PM – 6:00 PM. Closed on Sunday." */
export function hoursSummary(b: Pick<BusinessProfile, "staff">): string {
  return summarizeHours(openIntervals(b))
}

/* ---------------------------------------------------------------- booking spec */

/** The booking engine's view of one business (serializable; also sent to the browser). */
export function buildSpec(b: BusinessProfile): BookingSpec {
  const pack = getPack(b.vertical!)
  const staff = activeStaff(b)
  const hmos = b.config.hmos ?? []
  const services = activeServices(b)
  const questions: SpecQuestion[] = pack.booking_questions.map((q) => {
    const raw = q.options ?? []
    const isStaff = raw.includes("$STAFF")
    const options =
      q.type === "yes_no"
        ? ["Yes", "No"]
        : q.options
          ? raw.flatMap((o) =>
              o === "$SERVICES" ? services.map((s) => s.name) : o === "$STAFF" ? staff.map((m) => m.name) : o === "$HMOS" ? hmos : [o]
            )
          : null
    return {
      id: q.id,
      ask: q.ask,
      type: q.type,
      options,
      applies_to: q.applies_to,
      ask_if: q.ask_if,
      required: q.required,
      isStaff,
      skip: (isStaff && staff.length <= 1) || (raw.includes("$HMOS") && hmos.length === 0),
      option_details: q.option_details ?? null,
      help_prompt: q.help_prompt ?? null,
      min: q.min ?? 1,
      max: q.max ?? 20,
      summary_template: q.summary_template ?? null,
      summary_skip: q.summary_skip ?? [],
      variant_map: q.variant_map ?? null,
      multiline: q.multiline ?? false,
    }
  })
  const cfg = b.config as Record<string, unknown>
  const money = (v: unknown) => (typeof v === "number" && v > 0 ? v : null)
  return {
    business: b.name,
    staffRole: pack.staff_role,
    questions,
    services: services.map((s) => ({
      name: s.name,
      duration_minutes: s.duration_minutes,
      price_php: s.price_php,
      pricing_type: s.pricing_type,
      variants: s.variants,
    })),
    staff: staff.map((m) => ({ id: m.id, name: m.name, hours: m.hours })),
    quantityQuestion: pack.quantity_question ?? null,
    addressQuestion: pack.address_question ?? null,
    extraCharges: (pack.extra_charges ?? []).map((x) => ({ label: x.label, price: money(cfg[x.config_key]), countQuestion: x.count_question })),
    minimum: pack.minimum_booking ? money(b.config.minimum_booking_php) : null,
    areas: pack.uses_service_areas ? (b.config.service_areas ?? []) : [],
  }
}

/* ---------------------------------------------------------------- FAQs */

const LENGTH_LABEL = { short: "short hair", shoulder: "shoulder-length hair", long: "long hair" } as const

/** Placeholder values. A list is [item, ...] where an item may be null (no value). */
function placeholderValues(b: BusinessProfile, pack: Pack): Record<string, string | (string | null)[]> {
  const c = b.config as typeof b.config & Record<string, unknown>
  const services = activeServices(b)
  const perUnit = services.filter((s) => s.pricing_type === "per_unit")
  const hmos = c.hmos ?? []

  const priceOf = (s: (typeof services)[number]): string | null => {
    if (s.pricing_type === "by_hair_length" && s.variants) {
      const parts = (Object.keys(LENGTH_LABEL) as (keyof typeof LENGTH_LABEL)[])
        .filter((k) => s.variants![k].price_php !== null)
        .map((k) => `${peso(s.variants![k].price_php!)} for ${LENGTH_LABEL[k]}`)
      return parts.length ? `${s.name}: ${listJoin(parts)}.` : null
    }
    if (s.price_php === null) return null
    return `${s.name}: ${peso(s.price_php)}${s.pricing_type === "per_unit" ? " per unit" : ""}.`
  }
  const extras = (pack.extra_charges ?? [])
    .map((x) => ({ label: x.label, price: c[x.config_key] }))
    .filter((x): x is { label: string; price: number } => typeof x.price === "number" && x.price > 0)

  return {
    hmos: hmos.length ? listJoin(hmos) : "",
    walk_in_answer:
      c.walk_ins === false ? "No, we don't take walk-ins. Please book ahead." : "Yes, walk-ins are welcome.",
    hmo_card_line: hmos.length ? " and your HMO card" : "",
    payment_methods: listJoin(c.payment_methods ?? []),
    hours_summary: hoursSummary(b),
    service_durations: services.map((s) => {
      if (s.pricing_type === "by_hair_length" && s.variants)
        return `${s.name}: about ${duration(s.variants.short.duration_minutes)} for short hair, up to ${duration(s.variants.long.duration_minutes)} for long hair.`
      return `${s.name}: about ${duration(s.duration_minutes)}${s.pricing_type === "per_unit" ? " per unit" : ""}.`
    }),
    staff_names: listJoin(activeStaff(b).map((m) => m.name)),
    service_prices: services.map(priceOf),
    service_areas: listJoin(c.service_areas ?? []),
    per_unit_durations: listJoin(perUnit.map((s) => `${duration(s.duration_minutes)} per unit for ${s.name.toLowerCase()}`)),
    per_unit_prices: perUnit.map(priceOf),
    addon_line: extras.map((x) => ` ${x.label}: +${peso(x.price)} per unit.`).join(""),
    minimum_line: pack.minimum_booking && c.minimum_booking_php ? ` Minimum booking: ${peso(c.minimum_booking_php)}.` : "",
    business_address: b.business_address ?? "",
  }
}

/** One FAQ answer. `{key}` is filled in; `{key|text}` uses `text` when the owner left
 *  it empty (the whole answer becomes `text`, or for lists, each item without a value). */
function renderTemplate(template: string, values: ReturnType<typeof placeholderValues>, serviceNames: string[]) {
  let whole: string | null = null
  const out = template.replace(/\{(\w+)(?:\|([^}]*))?\}/g, (_, key: string, fallback?: string) => {
    const v = values[key]
    if (Array.isArray(v)) {
      const items = v.map((item, i) =>
        item ?? `${serviceNames[i] ?? ""}: ${fallback ?? "the team will confirm the price."}`.replace(/^: /, "")
      )
      if (!items.length && fallback) whole = fallback
      return items.join(" ")
    }
    if (!v && fallback) whole = fallback
    return v ?? ""
  })
  return (whole ?? out).replace(/\.\./g, ".").trim()
}

/** The business's FAQ answers, filled in from its own data. */
export function renderFaqs(b: BusinessProfile): { question: string; answer: string }[] {
  if (!isVertical(b.vertical)) return []
  const pack = getPack(b.vertical)
  const values = placeholderValues(b, pack)
  const services = activeServices(b)
  return pack.faqs.map((f) => {
    // List placeholders need the matching service names for items without a value.
    const names = f.a_template.includes("per_unit_prices")
      ? services.filter((s) => s.pricing_type === "per_unit").map((s) => s.name)
      : services.map((s) => s.name)
    return { question: f.q, answer: renderTemplate(f.a_template, values, names) }
  })
}
