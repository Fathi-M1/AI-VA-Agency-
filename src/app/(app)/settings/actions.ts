"use server"

// Saves Settings into the business (businesses + business_profile, via business-config.ts). Every field
// is validated here; services are not edited from Settings (they're linked to calendar
// event types and will be managed by the Setup agent).
// NOTE: there is no login yet, so this is as open as the rest of the app. Add auth
// before real use (Server Actions can be called without going through the UI).
import { refresh } from "next/cache"

import type { Weekday } from "@/server/agent/knowledge/types"
import { getBusinessRow, saveBusinessRow, type BusinessConfig } from "@/server/db/business-config"
import { getCurrentBusinessId } from "@/server/tenant"

export type SettingsInput = {
  name: string
  businessType: string
  customerSingular: string
  customerPlural: string
  ownerName: string
  address: string
  timezone: string
  hours: Record<Weekday, { open: string; close: string } | null>
  avgJobValue: string
  faqs: { question: string; answer: string }[]
  restrictedAdvice: string[]
  emergencyLine: string
  emergencyKeywords: string[]
  onCall: { from: string; until: string; number: string }
  refundOver: string
}

export type SaveResult = { ok: true } | { ok: false; error: string }

const DAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const clean = (s: string, max: number) => s.trim().slice(0, max)
const cleanList = (xs: string[], maxItems: number, maxLen: number) =>
  [...new Set(xs.map((x) => clean(x, maxLen)).filter(Boolean))].slice(0, maxItems)

function money(s: string, label: string): number | undefined | string {
  const t = s.replace(/[$,\s]/g, "")
  if (!t) return undefined
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return `${label} must be a number of 0 or more.`
  return Math.round(n * 100) / 100
}

export async function saveSettings(input: SettingsInput): Promise<SaveResult> {
  const name = clean(input.name, 120)
  if (!name) return { ok: false, error: "Business name can't be empty." }
  const singular = clean(input.customerSingular, 40)
  const plural = clean(input.customerPlural, 40)
  if (!singular || !plural) return { ok: false, error: "Say what you call your customers (one and many)." }
  const emergencyLine = clean(input.emergencyLine, 600)
  if (!emergencyLine) return { ok: false, error: "The emergency instruction can't be empty." }

  const timezone = clean(input.timezone, 64)
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone })
  } catch {
    return { ok: false, error: `"${timezone}" isn't a valid timezone (use one like Asia/Singapore).` }
  }

  const hours = {} as BusinessConfig["hours"]
  for (const d of DAYS) {
    const h = input.hours[d]
    if (!h) {
      hours[d] = null
      continue
    }
    if (!TIME.test(h.open) || !TIME.test(h.close) || h.open >= h.close) {
      return { ok: false, error: `Opening hours for ${d.toUpperCase()} need an opening time before the closing time.` }
    }
    hours[d] = `${h.open}-${h.close}`
  }

  const avg = money(input.avgJobValue, "Average job value")
  if (typeof avg === "string") return { ok: false, error: avg }
  const refundOver = money(input.refundOver, "The refund limit")
  if (typeof refundOver === "string") return { ok: false, error: refundOver }

  const onCall = {
    from: input.onCall.from.trim(),
    until: input.onCall.until.trim(),
    number: clean(input.onCall.number, 40),
  }
  if ((onCall.from && !TIME.test(onCall.from)) || (onCall.until && !TIME.test(onCall.until))) {
    return { ok: false, error: "On-call times must be like 17:00." }
  }

  const faqs = input.faqs
    .map((f) => ({ question: clean(f.question, 300), answer: clean(f.answer, 1000) }))
    .filter((f) => f.question && f.answer)
    .slice(0, 50)

  // Merge onto the current config so fields Settings doesn't edit (services) are kept.
  const businessId = await getCurrentBusinessId()
  const current = await getBusinessRow(businessId)
  const config: BusinessConfig = {
    ...current.config,
    business_type: clean(input.businessType, 80) || undefined,
    customer_term: { singular, plural },
    owner_name: clean(input.ownerName, 80) || undefined,
    address: clean(input.address, 200) || undefined,
    timezone,
    hours,
    faqs,
    restricted_advice: cleanList(input.restrictedAdvice, 20, 120),
    emergency_line: emergencyLine,
    rules: { ...current.config.rules, emergency_keywords: cleanList(input.emergencyKeywords, 50, 60) },
    on_call: onCall.from || onCall.until || onCall.number ? onCall : undefined,
    approval_limits: refundOver === undefined ? undefined : { refund_over: refundOver },
    avg_job_value: avg,
  }
  await saveBusinessRow(businessId, name, JSON.parse(JSON.stringify(config)))
  refresh()
  return { ok: true }
}
