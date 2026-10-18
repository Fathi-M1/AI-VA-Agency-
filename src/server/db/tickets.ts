// A booking request's public ticket (/book/[slug]/t/[token]), found by its private token only.
// Anyone with the link can open it, so it reads through public_ticket (a narrow function an
// anonymous customer may call) and shows only what's safe: first name, never the mobile.
import type { BusinessProfile } from "./business-profile"
import { db } from "./client"
import { ticketFromPublic, type Ticket } from "./ticket-mapping"

export type { Ticket } from "./ticket-mapping"

export async function getTicket(business: BusinessProfile, token: string): Promise<Ticket | null> {
  if (token.length < 32) return null // reference codes never open a ticket
  const { data, error } = await db().rpc("public_ticket", { p_token: token })
  if (error || !data) return null
  // The token must belong to the business in the link.
  if ((data as { business?: { booking_slug?: string } }).business?.booking_slug !== business.booking_slug) return null
  return ticketFromPublic(data, token)
}
