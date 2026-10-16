// Maps public_storefront(link) (migration 20261016001000) to the BusinessProfile shape the
// booking page uses. Pure (no I/O). Customers never see the owner's mobile or internal
// settings, so those come back empty.
import type { BusinessProfile, ServiceRow, StaffRow, Variants } from "./business-profile"
import { configFromProfile, type ProfileRow } from "./profile-mapping.ts"

type Storefront = {
  business: {
    id: string
    name: string
    vertical: string | null
    booking_slug: string | null
    calendar_mode: "calcom" | "requests" | null
    timezone: string | null
    brand_color: string | null
    business_address: string | null
    public_contact: string | null
  }
  profile: Partial<ProfileRow> | null
  services: (Omit<ServiceRow, "active" | "sort_order"> & { price_php: number | string | null })[]
  staff: { id: string; name: string; hours: StaffRow["hours"] }[]
}

const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v))

export function profileFromStorefront(raw: unknown): BusinessProfile | null {
  if (!raw || typeof raw !== "object") return null
  const s = raw as Storefront
  const b = s.business
  const p = s.profile ?? {}
  const profile: ProfileRow = {
    about: p.about ?? null,
    payment_methods: p.payment_methods ?? [],
    walk_ins: p.walk_ins ?? null,
    hmos: p.hmos ?? [],
    service_areas: p.service_areas ?? [],
    emergency_message: p.emergency_message ?? null,
    approval_limits: {},
    faqs: p.faqs ?? [],
    settings: p.settings ?? {},
  }
  return {
    id: b.id,
    name: b.name,
    vertical: b.vertical,
    booking_slug: b.booking_slug,
    owner_mobile: null,
    setup_completed_at: null,
    calendar_mode: b.calendar_mode ?? "requests",
    last_seen_at: null,
    brand_color: b.brand_color,
    business_address: b.business_address,
    public_contact: b.public_contact,
    config: configFromProfile({ timezone: b.timezone, onboarding_state: null }, profile),
    services: (s.services ?? []).map((x, i) => ({
      ...x,
      price_php: num(x.price_php),
      variants: x.variants
        ? (Object.fromEntries(
            Object.entries(x.variants).map(([k, v]) => [k, { price_php: num(v.price_php), duration_minutes: Number(v.duration_minutes) }])
          ) as Variants)
        : null,
      active: true,
      sort_order: i,
    })),
    staff: (s.staff ?? []).map((m) => ({ id: m.id, name: m.name, active: true, hours: m.hours ?? [] })),
  }
}
