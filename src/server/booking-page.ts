// Everything the public booking page needs about one business, from real data only:
// its storefront (brand color, live open/closed status, fact chips, address), its
// BookingSpec (services, questions, team, prices), the next 14 days, and the Ask
// panel's starter chips. All of it driven by the business's pack + setup answers.
import { TZDate } from "@date-fns/tz"

import type { BookingSpec, DayOption } from "@/lib/booking-engine"
import { WEEKDAY_SHORT } from "@/lib/format"
import { openStatus } from "@/lib/hours"
import { DEFAULT_BRAND } from "@/lib/setup"

import { getBusinessBySlug, type BusinessProfile } from "./db/business-profile"
import { buildSpec, getPack, isVertical, openIntervals, type Pack } from "./verticals"

export type Storefront = {
  slug: string
  name: string
  brand: string
  status: { open: boolean; text: string }
  chips: string[]
  address: string | null
  requiresConsent: boolean
  placeholder: string
  starters: string[]
  days: DayOption[]
  spec: BookingSpec
  publicContact: string | null
}

/** Now, in the business timezone. */
export function nowIn(tz: string) {
  const now = new TZDate(Date.now(), tz)
  return { now, weekday: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() }
}

/** The next 14 days: "Today", "Tomorrow", then "Sat 17". */
export function nextDays(tz: string, count = 14): DayOption[] {
  const { now } = nowIn(tz)
  return Array.from({ length: count }, (_, i) => {
    const d = new TZDate(now.getFullYear(), now.getMonth(), now.getDate() + i, tz)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const long = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(d)
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : `${WEEKDAY_SHORT[d.getDay()]} ${d.getDate()}`
    return { value, label, long, weekday: d.getDay() }
  })
}

/** Up to 4 fact chips from real config. */
function factChips(b: BusinessProfile, pack: Pack): string[] {
  const pay = (b.config.payment_methods ?? []).map((m) => `${m} accepted`)
  const extra: string[] = []
  if (pack.asks_walk_ins && b.config.walk_ins !== false) extra.push("Walk-ins welcome")
  const areas = b.config.service_areas ?? []
  if (pack.uses_service_areas && areas.length) extra.push(`Serves ${areas.slice(0, 2).join(", ")}`)
  if (pack.accepts_hmo && (b.config.hmos ?? []).length) extra.push("HMO accepted")
  // Payment first (at most 2 so the type-specific facts still fit), then the rest.
  return [...pay.slice(0, 2), ...extra, ...pay.slice(2)].slice(0, 4)
}

export function storefrontOf(b: BusinessProfile): Storefront {
  const pack = getPack(b.vertical!)
  const tz = b.config.timezone
  const { weekday, minutes } = nowIn(tz)
  const starters = ["Prices", "Hours", "Payment"]
  if (b.business_address) starters.push("Location")
  else if (pack.uses_service_areas) starters.push("Do you serve my area?")
  else if (pack.accepts_hmo) starters.push("HMO")
  return {
    slug: b.booking_slug!,
    name: b.name,
    brand: b.brand_color ?? DEFAULT_BRAND,
    status: openStatus(openIntervals(b), { weekday, minutes }),
    chips: factChips(b, pack),
    address: b.business_address,
    requiresConsent: !!pack.requires_consent,
    placeholder: `e.g. ${pack.sample_request.split(" · ").join(", ")}`,
    starters,
    days: nextDays(tz),
    spec: buildSpec(b),
    publicContact: b.public_contact,
  }
}

/** The storefront behind a booking link, or null if the link isn't active. */
export async function loadStorefront(slug: string): Promise<{ business: BusinessProfile; pack: Pack; store: Storefront } | null> {
  const business = await getBusinessBySlug(slug)
  if (!business || !isVertical(business.vertical) || !business.booking_slug) return null
  return { business, pack: getPack(business.vertical), store: storefrontOf(business) }
}
