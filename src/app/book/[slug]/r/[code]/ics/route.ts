// "Add to calendar": an .ics file (RFC 5545) for a confirmed booking.
import { getBusinessBySlug } from "@/server/db/business-profile"
import { getTicket } from "@/server/db/tickets"

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")

export async function GET(_request: Request, { params }: RouteContext<"/book/[slug]/r/[code]/ics">) {
  const { slug, code } = await params
  const business = await getBusinessBySlug(slug)
  const ticket = business ? await getTicket(business, code) : null
  if (!business || !ticket?.confirmed) return new Response("Not found", { status: 404 })

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI VA Agency//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ticket.code}@${slug}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(ticket.confirmed.start)}`,
    `DTEND:${stamp(ticket.confirmed.end)}`,
    `SUMMARY:${esc(`${ticket.service} at ${business.name}`)}`,
    `DESCRIPTION:${esc(`Ticket ${ticket.code}${ticket.teamMember ? ` · with ${ticket.teamMember}` : ""}`)}`,
    ...(business.business_address ? [`LOCATION:${esc(business.business_address)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ticket.code}.ics"`,
    },
  })
}
