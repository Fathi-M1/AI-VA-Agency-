// A business with everything set up through /setup: its row (incl. the 004 columns),
// services, team and team hours. Every read is scoped by business id (or booking link).
import { getBusinessRow, normalizeConfig, type BusinessConfig } from "./business-config"
import { db } from "./client"

/** A business type id: the name of a pack file in web/verticals (e.g. "salon"). */
export type Vertical = string
export type HairLength = "short" | "shoulder" | "long"
export type Variants = Record<HairLength, { price_php: number | null; duration_minutes: number }>

export type ServiceRow = {
  id: string
  name: string
  duration_minutes: number
  price_php: number | null
  pricing_type: "fixed" | "by_hair_length" | "per_unit"
  variants: Variants | null
  active: boolean
  sort_order: number
}

export type StaffHours = { weekday: number; start_time: string; end_time: string }
export type StaffRow = { id: string; name: string; active: boolean; hours: StaffHours[] }

export type BusinessProfile = {
  id: string
  name: string
  vertical: Vertical | null
  booking_slug: string | null
  owner_mobile: string | null
  setup_completed_at: string | null
  calendar_mode: "calcom" | "requests"
  last_seen_at: string | null
  /** Set by /setup (migration 005); null before it ran or when not set. */
  brand_color: string | null
  business_address: string | null
  public_contact: string | null
  config: BusinessConfig
  services: ServiceRow[]
  staff: StaffRow[]
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`DB ${what} failed: ${error?.message ?? "no row"}`)
}

// "*" so the app keeps working whichever migrations have run (missing columns read as null).
const COLUMNS = "*"

const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v))

async function withDetails(row: Record<string, unknown>): Promise<BusinessProfile> {
  const id = row.id as string
  const [services, staff, hours] = await Promise.all([
    db()
      .from("services")
      .select("id, name, duration_minutes, price_php, pricing_type, variants, active, sort_order")
      .eq("business_id", id)
      .order("sort_order"),
    db().from("staff").select("id, name, active, created_at").eq("business_id", id).order("created_at"),
    db().from("staff_hours").select("staff_id, weekday, start_time, end_time").eq("business_id", id),
  ])
  if (services.error) fail("load services", services.error)
  if (staff.error) fail("load staff", staff.error)
  if (hours.error) fail("load staff hours", hours.error)
  return {
    id,
    name: row.name as string,
    vertical: (row.vertical as Vertical | null) ?? null,
    booking_slug: (row.booking_slug as string | null) ?? null,
    owner_mobile: (row.owner_mobile as string | null) ?? null,
    setup_completed_at: (row.setup_completed_at as string | null) ?? null,
    calendar_mode: (row.calendar_mode as "calcom" | "requests") ?? "requests",
    last_seen_at: (row.last_seen_at as string | null) ?? null,
    brand_color: (row.brand_color as string | null) ?? null,
    business_address: (row.business_address as string | null) ?? null,
    public_contact: (row.public_contact as string | null) ?? null,
    config: normalizeConfig(row.config as Partial<BusinessConfig>),
    services: (services.data ?? []).map((s) => ({
      ...(s as ServiceRow),
      price_php: num(s.price_php),
      variants: s.variants
        ? (Object.fromEntries(
            Object.entries(s.variants as Variants).map(([k, v]) => [
              k,
              { price_php: num(v.price_php), duration_minutes: Number(v.duration_minutes) },
            ])
          ) as Variants)
        : null,
    })),
    staff: (staff.data ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      active: m.active,
      hours: (hours.data ?? [])
        .filter((h) => h.staff_id === m.id)
        .map((h) => ({ weekday: h.weekday, start_time: h.start_time.slice(0, 5), end_time: h.end_time.slice(0, 5) }))
        .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)),
    })),
  }
}

export async function getBusinessProfile(businessId: string): Promise<BusinessProfile> {
  const { data, error } = await db().from("businesses").select(COLUMNS).eq("id", businessId).single()
  if (error || !data) {
    // Before migration 004 the new columns don't exist; fall back to the base row.
    if (error?.message.includes("does not exist")) {
      const row = await getBusinessRow(businessId)
      return {
        ...row,
        vertical: null,
        booking_slug: null,
        owner_mobile: null,
        setup_completed_at: null,
        calendar_mode: "calcom",
        last_seen_at: null,
        brand_color: null,
        business_address: null,
        public_contact: null,
        services: [],
        staff: [],
      }
    }
    fail("load business", error)
  }
  return withDetails(data)
}

/** The business behind a public booking link, or null if the link isn't active. */
export async function getBusinessBySlug(slug: string): Promise<BusinessProfile | null> {
  const { data, error } = await db().from("businesses").select(COLUMNS).eq("booking_slug", slug).maybeSingle()
  if (error) fail("load business by link", error)
  return data ? withDetails(data) : null
}

/** Active services / team, in display order. */
export const activeServices = (b: BusinessProfile) => b.services.filter((s) => s.active)
export const activeStaff = (b: BusinessProfile) => b.staff.filter((s) => s.active)

/** Merges a patch into config (read-modify-write; callers pass only what changes). */
export async function patchConfig(businessId: string, patch: Partial<BusinessConfig>) {
  const { data, error } = await db().from("businesses").select("config").eq("id", businessId).single()
  if (error || !data) fail("load config", error)
  const { error: e2 } = await db()
    .from("businesses")
    .update({ config: { ...(data.config as object), ...patch } })
    .eq("id", businessId)
  if (e2) fail("save config", e2)
}
