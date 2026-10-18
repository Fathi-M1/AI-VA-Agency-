// Maps public_ticket(token) (migration 20261016001000) to the ticket page's Ticket shape.
// Pure (no I/O). The function already returns only what's safe: first name, no mobile.
import { time12 } from "../../lib/format.ts"

export type Ticket = {
  /** display only */
  code: string
  token: string
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

type PublicTicket = {
  reference_code: string
  status: string
  service: string
  details: { summary?: string; answers?: Record<string, string>; estimate?: Ticket["estimate"] } | null
  requested_time_text: string | null
  slot_start: string | null
  slot_end: string | null
  staff_id: string | null
  team_member: string | null
  first_name: string | null
  business: { timezone: string | null }
}

export function ticketFromPublic(raw: unknown, token: string): Ticket | null {
  if (token.length < 32 || !raw || typeof raw !== "object") return null // reference codes never open a ticket
  const t = raw as PublicTicket
  const tz = t.business?.timezone || "Asia/Manila"
  const d = t.details ?? {}
  let confirmed: Ticket["confirmed"] = null
  if (t.status === "confirmed" && t.slot_start) {
    const at = new Date(t.slot_start)
    const date = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(at)
    const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at)
    confirmed = {
      label: [date, time12(hhmm), t.team_member ? `with ${t.team_member}` : ""].filter(Boolean).join(" · "),
      start: t.slot_start,
      end: t.slot_end ?? t.slot_start,
    }
  }
  return {
    code: t.reference_code,
    token,
    status: t.status,
    firstName: t.first_name ?? "",
    service: t.service,
    details: d.summary ?? t.service,
    answers: d.answers ?? {},
    staffId: t.staff_id,
    teamMember: t.team_member,
    preferred: t.requested_time_text,
    confirmed,
    estimate: d.estimate ?? null,
  }
}
