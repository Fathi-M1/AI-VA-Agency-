import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getBusinessProfile } from "@/server/db/business-profile"
import { bookingUrl } from "@/server/booking-url"
import { getCurrentBusinessId } from "@/server/tenant"
import { getPack, isVertical } from "@/server/verticals"

import { LiveView } from "./live-view"

export const metadata: Metadata = { title: "You're live" }

// "You're live" (Part C): the booking link, how to share it, and how the team works.
export default async function LivePage() {
  const business = await getBusinessProfile(await getCurrentBusinessId())
  if (!business.booking_slug || !isVertical(business.vertical)) redirect("/setup")
  const pack = getPack(business.vertical)
  return (
    <LiveView
      name={business.name}
      slug={business.booking_slug}
      url={await bookingUrl(business.booking_slug)}
      bookingExample={pack.booking_example}
      sampleRequest={pack.sample_request}
    />
  )
}
