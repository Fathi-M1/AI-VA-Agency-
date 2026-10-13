import type { Metadata } from "next"

import { PackIcon } from "@/components/pack-icon"
import { FlowCanvas } from "@/components/flow/flow-ui"
import { validateFill } from "@/lib/booking-engine"
import { greetingFor } from "@/lib/booking-copy"
import { loadStorefront } from "@/server/booking-page"
import { getBusinessBySlug } from "@/server/db/business-profile"
import { getPack, isVertical } from "@/server/verticals"

import { BookChat } from "./book-chat"
import { BookingPage } from "./booking-page"

export async function generateMetadata({ params }: PageProps<"/book/[slug]">): Promise<Metadata> {
  const business = await getBusinessBySlug((await params).slug)
  return { title: business ? `${business.name} · Book online` : "Booking link not active" }
}

const NotActive = () => (
  <FlowCanvas className="flex items-center justify-center px-4">
    <main className="mx-auto max-w-[480px] text-center">
      <p className="text-lg">This booking link isn&apos;t active. Please contact the business directly.</p>
    </main>
  </FlowCanvas>
)

// Public booking page for one business (Journey C, "Tap it or tell it"). No app
// navigation. Businesses on the live Cal.com calendar (Cruz Family Dental) keep their
// chat booking page unchanged.
export default async function BookPage({ params, searchParams }: PageProps<"/book/[slug]">) {
  const { slug } = await params
  const business = await getBusinessBySlug(slug)
  if (!business) return <NotActive />
  if (business.calendar_mode === "calcom") {
    const pack = isVertical(business.vertical) ? getPack(business.vertical) : null
    return (
      <BookChat
        slug={slug}
        business={business.name}
        requiresConsent={!!pack?.requires_consent}
        usesServiceAreas={!!pack?.uses_service_areas}
        greeting={greetingFor(business.name)}
      />
    )
  }
  const loaded = await loadStorefront(slug)
  if (!loaded) return <NotActive />
  const { store } = loaded

  // "Request another time" links prefill the form (?service=…&a.<question>=…&staff=…).
  const sp = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const prefill = validateFill(store.spec, store.days, {
    service: one(sp.service) ?? null,
    answers: Object.entries(sp)
      .filter(([k]) => k.startsWith("a."))
      .map(([k, v]) => ({ question_id: k.slice(2), value: one(v) ?? "" })),
    staff: one(sp.staff) ?? null,
  })

  // Option icons (from the pack), rendered here so the full icon set stays on the server.
  const optionIcons: Record<string, Record<string, React.ReactNode>> = {}
  for (const q of store.spec.questions) {
    for (const [option, d] of Object.entries(q.option_details ?? {})) {
      if (d.icon) (optionIcons[q.id] ??= {})[option] = <PackIcon name={d.icon} className="size-6" />
    }
  }

  return <BookingPage store={store} optionIcons={optionIcons} prefill={prefill} />
}
