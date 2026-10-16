// A booking request's public ticket (/book/[slug]/r/[code]). Anyone with the link can
// open it, so it returns only what's safe to show: first name, never the mobile.
import { time12 } from "@/lib/format"

import type { BusinessProfile } from "./business-profile"
import { db } from "./client"

export type Ticket = {
  code: string
  status: "requested" | "confirmed" | "declined" | string
  firstName: string
  service: string
  details: string
  answers: Record<string, string>
  staffId: string | null
  teamMember: string | null
  preferred: string | null
  confirmed: { label: string; start: string; end: string } | null
  estimate: { price: number | null; duration_minutes: number; notes: string[] } | null
}

export async function getTicket(business: BusinessProfile, code: string): Promise<Ticket | null> {
  const { data, error } = await db()
    .from("bookings")
    .select("reference_code, status, service, details, staff_id, requested_time_text, slot_start, slot_end, customers(name)")
    .eq("business_id", business.id)
    .eq("reference_code", code.toUpperCase())
    .maybeSingle()
  if (error || !data) return null
  const tz = business.config.timezone
  const d = (data.details ?? {}) as { summary?: string; answers?: Record<string, string>; estimate?: Ticket["estimate"] }
  const name = (data.customers as unknown as { name: string | null } | null)?.name ?? ""
  const staff = business.staff.find((m) => m.id === data.staff_id)?.name ?? null
  let confirmed: Ticket["confirmed"] = null
  if (data.status === "confirmed" && data.slot_start) {
    const date = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(new Date(data.slot_start))
    const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(data.slot_start))
    confirmed = {
      label: [date, time12(hhmm), staff ? `with ${staff}` : ""].filter(Boolean).join(" · "),
      start: data.slot_start,
      end: data.slot_end ?? data.slot_start,
    }
  }
  return {
    code: data.reference_code!,
    status: data.status,
    firstName: name.trim().split(/\s+/)[0] ?? "",
    service: data.service,
    details: d.summary ?? data.service,
    answers: d.answers ?? {},
    staffId: data.staff_id,
    teamMember: staff,
    preferred: data.requested_time_text,
    confirmed,
    estimate: d.estimate ?? null,
  }
}
