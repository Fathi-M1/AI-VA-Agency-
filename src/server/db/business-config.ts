// One business's configuration (the businesses.config jsonb), in one place.
// Everything business-specific lives here: what the agents know, what the owner app
// shows, and what Settings (and later the Setup agent) edits. New businesses = new rows.
import type { Weekday } from "../agent/knowledge/types"
import { db } from "./client"
import { configFromProfile, profileFromConfig, type ProfileRow } from "./profile-mapping"

export type BusinessConfig = {
  business_type?: string
  owner_name?: string
  customer_term?: { singular: string; plural: string }
  address?: string
  timezone: string
  hours: Record<Weekday, string | null>
  services: { name: string; duration_minutes: number; calcom_event_type_id: number }[]
  faqs?: { question: string; answer: string }[]
  restricted_advice?: string[]
  rules?: { emergency_keywords?: string[] }
  emergency_line: string
  on_call?: { from: string; until: string; number: string }
  approval_limits?: { refund_over?: number }
  avg_job_value?: number
  // Set by /setup (businesses that take booking requests; see migration 004).
  payment_methods?: string[]
  walk_ins?: boolean
  hmos?: string[]
  addon_inverter_php?: number
  addon_over_1_5hp_php?: number
  minimum_booking_php?: number
  service_areas?: string[]
  emergency_instruction?: string
  refund_approval_limit_php?: number
  pack_version?: number
  /** Today's getting-started checklist. */
  onboarding?: { shared_link_at?: string; tried_as_customer_at?: string; hidden_at?: string }
}

export type BusinessRow = { id: string; name: string; config: BusinessConfig }

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`DB ${what} failed: ${error?.message ?? "no row"}`)
}

const NO_HOURS: Record<Weekday, string | null> = {
  mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null,
}

/** Fills the fields every screen expects, so businesses created by /setup (whose
 *  services, team and hours live in their own tables) load safely everywhere. */
export function normalizeConfig(c: Partial<BusinessConfig> | null): BusinessConfig {
  const config = c ?? {}
  return {
    ...config,
    timezone: config.timezone ?? "Asia/Manila",
    hours: config.hours ?? NO_HOURS,
    services: config.services ?? [],
    emergency_line: config.emergency_line ?? config.emergency_instruction ?? "",
  }
}

// A business's knowledge lives in businesses (timezone, onboarding state) and its
// business_profile row (migration 20261016000700); profile-mapping.ts turns them into the
// BusinessConfig shape the rest of the app uses, and back.
export const BUSINESS_WITH_PROFILE = "id, name, timezone, onboarding_state, business_profile(*)"

type ProfileEmbed = ProfileRow | ProfileRow[] | null
const one = (p: ProfileEmbed) => (Array.isArray(p) ? (p[0] ?? null) : p)

/** The app's config for a businesses row selected with BUSINESS_WITH_PROFILE. */
export function configOfRow(row: { timezone: string | null; onboarding_state: Record<string, unknown> | null; business_profile: ProfileEmbed }) {
  return normalizeConfig(configFromProfile(row, one(row.business_profile)))
}

export async function getBusinessRow(businessId: string): Promise<BusinessRow> {
  const { data, error } = await db().from("businesses").select(BUSINESS_WITH_PROFILE).eq("id", businessId).single()
  if (error || !data) fail("load business", error)
  return { id: data.id, name: data.name, config: configOfRow(data) }
}

/** Saves a business's config into businesses + business_profile. */
export async function saveBusinessConfig(businessId: string, config: BusinessConfig) {
  const { profile, timezone, onboarding_state } = profileFromConfig(config)
  const { error } = await db().from("businesses").update({ timezone, onboarding_state }).eq("id", businessId)
  if (error) fail("save business", error)
  const { error: e2 } = await db()
    .from("business_profile")
    .upsert({ business_id: businessId, ...profile, updated_at: new Date().toISOString() }, { onConflict: "business_id" })
  if (e2) fail("save business profile", e2)
}

/** Replaces the name and config of one business (callers merge their changes first). */
export async function saveBusinessRow(businessId: string, name: string, config: BusinessConfig) {
  const { error } = await db().from("businesses").update({ name }).eq("id", businessId)
  if (error) fail("save business", error)
  await saveBusinessConfig(businessId, config)
}

/** Neutral defaults for fields a business hasn't set yet. */
export const customerTermOf = (c: BusinessConfig) => c.customer_term ?? { singular: "customer", plural: "customers" }

/** Creates a new business (a new tenant: new rows, no new code). Returns its id. */
export async function createBusinessRow(name: string, config: BusinessConfig): Promise<string> {
  const { timezone } = profileFromConfig(config)
  const { data, error } = await db().from("businesses").insert({ name, timezone }).select("id").single()
  if (error || !data) fail("create business", error)
  await saveBusinessConfig(data.id, config)
  return data.id
}
