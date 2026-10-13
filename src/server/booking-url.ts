// The full public booking link for a business, built from the request's own host.
// https in production; plain http on localhost (https://localhost wouldn't open).
import { headers } from "next/headers"

/** This site's origin, from the request (e.g. "https://example.com"). */
export async function siteOrigin() {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
  const proto = h.get("x-forwarded-proto") ?? (local ? "http" : "https")
  return `${proto}://${host}`
}

export async function bookingUrl(slug: string) {
  return `${await siteOrigin()}/book/${slug}`
}

/** The customer's ticket page for a booking request. */
export async function ticketUrl(slug: string, code: string) {
  return `${await siteOrigin()}/book/${slug}/r/${code}`
}
