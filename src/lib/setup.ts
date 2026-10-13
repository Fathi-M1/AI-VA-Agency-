// The /setup draft: what the owner fills in across the four steps, how it starts from
// a business type pack, and the rules each step checks. Shared by the setup screen
// (inline errors, disabled buttons) and the save action (checked again on the server).
// Nothing here knows a business type: per-type fields come from pack flags.
import { toMinutes } from "./format"

/** A business type id (a pack file name in web/verticals). */
export type Vertical = string
export type HairLength = "short" | "shoulder" | "long"
export const HAIR_LENGTHS: { key: HairLength; label: string }[] = [
  { key: "short", label: "Short" },
  { key: "shoulder", label: "Shoulder length" },
  { key: "long", label: "Long" },
]

/** The parts of a pack the setup screen needs (sent from the server). */
export type PackLite = {
  vertical: Vertical
  display_name: string
  card_description: string
  staff_role: string
  name_placeholder: string
  staff_name_placeholder: string
  default_hours: { weekday: number; start: string; end: string }[]
  services: {
    name: string
    pricing_type: "fixed" | "by_hair_length" | "per_unit"
    duration_minutes: number
    variants: Record<HairLength, { duration_minutes: number }> | null
    typical_range: string | null
    default_on: boolean
  }[]
  emergency_instruction: string
  setup_tips: { step1: string; step2: string; step3: string; step4: string }
  accepts_hmo: boolean
  asks_walk_ins: boolean
  uses_service_areas: boolean
  extra_charges: { config_key: string; label: string }[]
  minimum_booking: boolean
}

export type Shift = { start: string; end: string }

export type DraftService = {
  key: string
  name: string
  on: boolean
  pricing_type: "fixed" | "by_hair_length" | "per_unit"
  duration: number
  price: string
  variants: Record<HairLength, { duration: number; price: string }> | null
  typical_range: string | null
}

export type DraftStaff = {
  key: string
  name: string
  days: number[]
  shifts: Shift[]
  /** "Set different hours for some days": shifts per weekday, or null for one set. */
  perDay: Record<number, Shift[]> | null
}

export type SetupDraft = {
  step: 0 | 1 | 2 | 3 | 4
  /** the furthest step the owner has opened (completed steps are clickable) */
  reached?: number
  vertical: Vertical | null
  /** The business type the services and team below were filled from. */
  filledFor: Vertical | null
  name: string
  brandColor: string
  services: DraftService[]
  payment: string[]
  walkIns: boolean
  hmos: string[]
  /** extra charges per unit, by the pack's config_key (e.g. addon_inverter_php) */
  extras: Record<string, string>
  minimum: string
  staff: DraftStaff[]
  areas: string[]
  emergency: string
  mobile: string
  refundLimit: string
  address: string
  publicContact: string
}

export const PAYMENT_OPTIONS = ["Cash", "GCash", "Maya", "Bank transfer", "Card"]
export const HMO_OPTIONS = ["Maxicare", "Intellicare", "Medicard", "PhilCare", "Cocolife", "Avega", "Kaiser", "Insular Health Care"]
export const DRAFT_KEY = "setup-draft"

/** Booking page colors (white text passes 4.5:1 on each; see the Prompt-02 report). */
export const BRAND_COLORS = [
  { name: "Forest", hex: "#1F5A43" },
  { name: "Ocean", hex: "#1D5C8F" },
  { name: "Plum", hex: "#6B3A7A" },
  { name: "Terracotta", hex: "#A84B26" },
  { name: "Charcoal", hex: "#2F3437" },
  { name: "Rose", hex: "#A8344F" },
] as const
export const DEFAULT_BRAND = BRAND_COLORS[0].hex

export const emptyDraft = (): SetupDraft => ({
  step: 0,
  vertical: null,
  filledFor: null,
  name: "",
  brandColor: DEFAULT_BRAND,
  services: [],
  payment: [],
  walkIns: true,
  hmos: [],
  extras: {},
  minimum: "",
  staff: [],
  areas: [],
  emergency: "",
  mobile: "",
  refundLimit: "1000",
  address: "",
  publicContact: "",
})

let seq = 0
export const newKey = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`

export function servicesFromPack(pack: PackLite): DraftService[] {
  return pack.services.map((s, i) => ({
    key: `svc-${i}`,
    name: s.name,
    on: s.default_on,
    pricing_type: s.pricing_type,
    duration: s.duration_minutes,
    price: "",
    variants: s.variants
      ? {
          short: { duration: s.variants.short.duration_minutes, price: "" },
          shoulder: { duration: s.variants.shoulder.duration_minutes, price: "" },
          long: { duration: s.variants.long.duration_minutes, price: "" },
        }
      : null,
    typical_range: s.typical_range,
  }))
}

export function staffFromPack(pack: PackLite, name = ""): DraftStaff {
  const days = [...new Set(pack.default_hours.map((h) => h.weekday))].sort()
  const shiftsOf = (d: number) =>
    pack.default_hours.filter((h) => h.weekday === d).map((h) => ({ start: h.start, end: h.end }))
  const first = shiftsOf(days[0])
  const same = days.every((d) => JSON.stringify(shiftsOf(d)) === JSON.stringify(first))
  return {
    key: newKey("staff"),
    name,
    days,
    shifts: first,
    perDay: same ? null : Object.fromEntries(days.map((d) => [d, shiftsOf(d)])),
  }
}

/** The shifts a member works on one weekday. */
export const shiftsOn = (m: DraftStaff, day: number): Shift[] =>
  m.days.includes(day) ? (m.perDay ? (m.perDay[day] ?? m.shifts) : m.shifts) : []

/** All of a member's working hours as rows for staff_hours. */
export const staffHours = (m: DraftStaff) =>
  m.days.flatMap((d) => shiftsOn(m, d).map((s) => ({ weekday: d, start_time: s.start, end_time: s.end })))

/* ---------------------------------------------------------------- rules */

export const MOBILE_RE = /^09\d{9}$/
const isMoney = (v: string) => v.trim() === "" || (/^\d+(\.\d{1,2})?$/.test(v.trim()) && Number(v) >= 0)

/** A phone number customers can call, or a Messenger / web link. Empty is fine. */
export function isPublicContact(v: string) {
  const s = v.trim()
  if (!s) return true
  if (/^(https?:\/\/|m\.me\/|www\.)\S+$/i.test(s)) return true
  return /^\+?[\d\s()-]{7,16}$/.test(s) && s.replace(/\D/g, "").length >= 7
}

export type Errors = Record<string, string>

export function step1Errors(d: SetupDraft): Errors {
  const e: Errors = {}
  if (!d.vertical) e.vertical = "Pick your business type."
  const n = d.name.trim().length
  if (n < 2 || n > 60) e.name = "Enter your business name (2 to 60 characters)."
  return e
}

export function step2Errors(d: SetupDraft, pack: PackLite | null): Errors {
  const e: Errors = {}
  if (!d.services.some((s) => s.on)) e.services = "Turn on at least one service."
  for (const s of d.services) {
    if (!s.name.trim()) e[`${s.key}-name`] = "Add a name for this service."
    if (s.variants) {
      for (const { key } of HAIR_LENGTHS) {
        if (!(s.variants[key].duration > 0)) e[`${s.key}-${key}-time`] = "Pick a time."
        if (!isMoney(s.variants[key].price)) e[`${s.key}-${key}-price`] = "Enter a price of 0 or more, or leave it blank."
      }
    } else {
      if (!(s.duration > 0)) e[`${s.key}-time`] = "Pick a time."
      if (!isMoney(s.price)) e[`${s.key}-price`] = "Enter a price of 0 or more, or leave it blank."
    }
  }
  if (!d.payment.length) e.payment = "Pick at least one way to pay."
  for (const x of pack?.extra_charges ?? []) {
    if (!isMoney(d.extras[x.config_key] ?? "")) e[`extra-${x.config_key}`] = "Enter an amount of 0 or more, or leave it blank."
  }
  if (pack?.minimum_booking && !isMoney(d.minimum)) e.minimum = "Enter an amount of 0 or more, or leave it blank."
  return e
}

export function shiftErrors(shifts: Shift[]): string | null {
  if (shifts.some((s) => toMinutes(s.end) <= toMinutes(s.start))) return "End time must be after start time."
  const sorted = [...shifts].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  for (let i = 1; i < sorted.length; i++) {
    if (toMinutes(sorted[i].start) < toMinutes(sorted[i - 1].end)) return "These shifts overlap. Adjust one of them."
  }
  return null
}

export function step3Errors(d: SetupDraft, pack: PackLite | null): Errors {
  const e: Errors = {}
  for (const m of d.staff) {
    if (!m.name.trim()) e[`${m.key}-name`] = "Add a name."
    if (!m.days.length) e[`${m.key}-days`] = "Pick at least one working day."
    if (m.perDay) {
      for (const day of m.days) {
        const err = shiftErrors(shiftsOn(m, day))
        if (err) e[`${m.key}-day-${day}`] = err
      }
    } else {
      const err = shiftErrors(m.shifts)
      if (err) e[`${m.key}-shifts`] = err
    }
  }
  if (!d.staff.length) e.staff = "Add a name."
  if (pack?.uses_service_areas && !d.areas.length) e.areas = "Add at least one area you serve."
  return e
}

export function step4Errors(d: SetupDraft): Errors {
  const e: Errors = {}
  if (!d.emergency.trim()) e.emergency = "Add the message your AI team shows in an emergency."
  if (!MOBILE_RE.test(d.mobile.trim())) e.mobile = "Enter an 11-digit mobile number starting with 09."
  if (!isMoney(d.refundLimit) || d.refundLimit.trim() === "") e.refundLimit = "Enter an amount of 0 or more."
  if (d.address.trim().length > 200) e.address = "Keep the address under 200 characters."
  if (!isPublicContact(d.publicContact)) e.publicContact = "Enter a phone number or a Messenger link (for example m.me/yourpage)."
  return e
}

export const stepErrors = (step: SetupDraft["step"], d: SetupDraft, pack: PackLite | null): Errors =>
  step === 1 ? step1Errors(d) : step === 2 ? step2Errors(d, pack) : step === 3 ? step3Errors(d, pack) : step === 4 ? step4Errors(d) : {}

/** Booking link base: lowercase, spaces to hyphens, other characters removed. */
export function slugBase(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}
