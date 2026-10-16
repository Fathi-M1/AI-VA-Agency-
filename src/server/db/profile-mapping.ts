// The one place that maps a business's stored knowledge (businesses.timezone /
// onboarding_state + business_profile row) ⇄ the BusinessConfig shape the app uses.
// Splits exactly like migration 20261016000700_business_profile.sql; pure (no I/O).
import type { BusinessConfig } from "./business-config"

export type ProfileRow = {
  about: string | null
  payment_methods: string[]
  walk_ins: boolean | null
  hmos: string[]
  service_areas: string[]
  emergency_message: string | null
  approval_limits: Record<string, unknown>
  faqs: unknown[]
  settings: Record<string, unknown>
}

/** Config keys that have their own column (or live on businesses); the rest → settings. */
const OWN_COLUMN = new Set([
  "about",
  "payment_methods",
  "walk_ins",
  "hmos",
  "service_areas",
  "emergency_instruction",
  "emergency_line",
  "approval_limits",
  "refund_approval_limit_php",
  "faqs",
  "timezone",
  "onboarding",
])

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [])

export function profileFromConfig(c: Partial<BusinessConfig> & Record<string, unknown>): {
  profile: ProfileRow
  timezone: string
  onboarding_state: Record<string, unknown>
} {
  const settings = Object.fromEntries(Object.entries(c).filter(([k, v]) => !OWN_COLUMN.has(k) && v !== undefined))
  const approval: Record<string, unknown> = { ...(c.approval_limits ?? {}) }
  if (c.refund_approval_limit_php !== undefined) approval.refund_over = c.refund_approval_limit_php
  return {
    timezone: c.timezone || "Asia/Manila",
    onboarding_state: (c.onboarding as Record<string, unknown>) ?? {},
    profile: {
      about: typeof c.about === "string" ? c.about : null,
      payment_methods: arr(c.payment_methods),
      walk_ins: typeof c.walk_ins === "boolean" ? c.walk_ins : null,
      hmos: arr(c.hmos),
      service_areas: arr(c.service_areas),
      emergency_message: c.emergency_instruction ?? c.emergency_line ?? null,
      approval_limits: approval,
      faqs: Array.isArray(c.faqs) ? c.faqs : [],
      settings,
    },
  }
}

const NO_HOURS: BusinessConfig["hours"] = { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null }

export function configFromProfile(
  b: { timezone: string | null; onboarding_state: Record<string, unknown> | null },
  p: ProfileRow | null
): BusinessConfig & Record<string, unknown> {
  const s = (p?.settings ?? {}) as Record<string, unknown>
  const emergency = p?.emergency_message ?? ""
  return {
    ...s,
    timezone: b.timezone || "Asia/Manila",
    hours: (s.hours as BusinessConfig["hours"]) ?? NO_HOURS,
    services: (s.services as BusinessConfig["services"]) ?? [],
    // One name per value, so a screen that edits it and saves the whole config back
    // can't be overruled by a stale copy (readers fall back to emergency_line).
    emergency_line: emergency,
    ...(p?.about ? { about: p.about } : {}),
    ...(p && p.payment_methods.length ? { payment_methods: p.payment_methods } : {}),
    ...(p && p.walk_ins !== null ? { walk_ins: p.walk_ins } : {}),
    ...(p && p.hmos.length ? { hmos: p.hmos } : {}),
    ...(p && p.service_areas.length ? { service_areas: p.service_areas } : {}),
    ...(p && p.faqs.length ? { faqs: p.faqs as BusinessConfig["faqs"] } : {}),
    ...(p && Object.keys(p.approval_limits ?? {}).length ? { approval_limits: p.approval_limits as BusinessConfig["approval_limits"] } : {}),
    ...(b.onboarding_state && Object.keys(b.onboarding_state).length ? { onboarding: b.onboarding_state as BusinessConfig["onboarding"] } : {}),
  }
}
