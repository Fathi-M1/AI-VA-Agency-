import type { Metadata } from "next"
import { CalendarPlusIcon, MapPinIcon, MessageCircleIcon, RotateCcwIcon } from "lucide-react"

import { estimateText } from "@/lib/booking-engine"
import { DEFAULT_BRAND } from "@/lib/setup"
import { cn } from "@/lib/utils"
import { storefrontOf } from "@/server/booking-page"
import { getBusinessBySlug } from "@/server/db/business-profile"
import { getTicket } from "@/server/db/tickets"
import { isVertical } from "@/server/verticals"

import { StorefrontHeader } from "../../storefront-header"
import { CopyTicketLink, TicketRefresher } from "./ticket-client"

export const metadata: Metadata = { title: "Your booking ticket", robots: { index: false } }

const actionCls =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-base font-medium hover:border-[var(--brand)]"
const brandCls =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-6 text-base font-semibold text-white hover:brightness-110"

/** tel: for numbers, the link itself for Messenger / web links. */
function contactHref(v: string) {
  const s = v.trim()
  if (/^(https?:\/\/)/i.test(s)) return s
  if (/^(m\.me\/|www\.)/i.test(s)) return `https://${s}`
  return `tel:${s.replace(/[^\d+]/g, "")}`
}

// Ticket & live status (B8): one ticket card, centered (max 560px), the business's
// storefront header above it. Shows the first name only; never the mobile number.
export default async function TicketPage({ params }: PageProps<"/book/[slug]/r/[code]">) {
  const { slug, code } = await params
  const business = await getBusinessBySlug(slug)
  const ticket = business ? await getTicket(business, code) : null
  const brand = business?.brand_color ?? DEFAULT_BRAND

  if (!business || !ticket) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4">
        <p className="max-w-[480px] text-center text-lg">We can&apos;t find this ticket. Check the link or contact the business.</p>
      </div>
    )
  }

  const store = isVertical(business.vertical) && business.booking_slug ? storefrontOf(business) : null
  const status =
    ticket.status === "confirmed"
      ? { label: "Confirmed", cls: "bg-[oklch(0.93_0.06_150)] text-[oklch(0.35_0.09_150)]" }
      : ticket.status === "declined"
        ? { label: "Not available", cls: "bg-muted text-foreground" }
        : { label: "Waiting for confirmation", cls: "bg-[color-mix(in_oklch,var(--warning)_25%,var(--card))] text-[oklch(0.38_0.09_60)]" }

  // "Request another time": back to the form with the same service and details.
  const again = new URLSearchParams({ service: ticket.service })
  for (const [k, v] of Object.entries(ticket.answers)) if (k !== "service") again.set(`a.${k}`, v)
  if (ticket.teamMember) again.set("staff", ticket.teamMember)

  const rows: [string, string][] = [
    ["Service", ticket.service],
    ...(ticket.details && ticket.details !== ticket.service ? ([["Details", ticket.details.replace(`${ticket.service} · `, "")]] as [string, string][]) : []),
    ...(ticket.teamMember && !ticket.confirmed ? ([["Team member", ticket.teamMember]] as [string, string][]) : []),
    ticket.confirmed ? ["When", ticket.confirmed.label] : ["Preferred time", ticket.preferred ?? "—"],
    ...(ticket.estimate ? ([["Estimate", estimateText(ticket.estimate)]] as [string, string][]) : []),
  ]

  return (
    <div className="min-h-svh bg-background pb-16" style={{ "--brand": brand } as React.CSSProperties}>
      <StorefrontHeader name={business.name} status={store?.status} address={store?.address} />
      <TicketRefresher waiting={ticket.status === "requested"} />

      <main className="mx-auto mt-8 w-full max-w-[560px] px-4">
        <article className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_24px_60px_-36px_rgb(0_0_0/0.35)]">
          <div className="h-1.5 bg-[var(--brand)]" aria-hidden="true" />
          <div className="px-6 pt-6 pb-7 text-center">
            <p className="text-base text-muted-foreground">
              {ticket.firstName ? `${ticket.firstName}'s booking request at` : "Booking request at"} {business.name}
            </p>
            <h1 className="mt-3 font-mono text-4xl font-semibold tracking-[0.12em] sm:text-5xl">{ticket.code}</h1>
            <p className={cn("mt-4 inline-flex rounded-full px-4 py-1.5 text-base font-semibold", status.cls)}>{status.label}</p>
            {ticket.status === "requested" ? (
              <p className="mt-4 text-base text-foreground/85">
                {business.name} will confirm by text or call. You can come back to this page anytime.
              </p>
            ) : null}
            {ticket.status === "confirmed" && ticket.confirmed ? <p className="mt-4 text-lg font-semibold">{ticket.confirmed.label}</p> : null}
            {ticket.status === "declined" ? <p className="mt-4 text-base">Sorry, {business.name} can&apos;t take this request.</p> : null}
          </div>

          {/* perforation */}
          <div className="relative" aria-hidden="true">
            <div className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-background" />
            <div className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-background" />
            <div className="mx-6 border-t-2 border-dashed border-border" />
          </div>

          <dl className="flex flex-col divide-y divide-border/70 px-6 py-3">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-3 text-base">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium break-words">{v}</dd>
              </div>
            ))}
          </dl>
          {ticket.estimate?.notes.length ? (
            <div className="px-6 pb-2">
              {ticket.estimate.notes.map((n) => (
                <p key={n} className="text-sm text-muted-foreground">
                  {n}
                </p>
              ))}
            </div>
          ) : null}
          {ticket.status === "confirmed" && business.business_address ? (
            <p className="flex items-start gap-2 px-6 pb-5 text-base">
              <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {business.business_address}
            </p>
          ) : null}
        </article>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          {ticket.status === "confirmed" ? (
            <a href={`/book/${slug}/r/${ticket.code}/ics`} download={`${ticket.code}.ics`} className={brandCls}>
              <CalendarPlusIcon className="size-5" aria-hidden="true" /> Add to calendar
            </a>
          ) : null}
          {ticket.status === "declined" ? (
            <a href={`/book/${slug}?${again.toString()}`} className={brandCls}>
              <RotateCcwIcon className="size-5" aria-hidden="true" /> Request another time
            </a>
          ) : null}
          <CopyTicketLink className={actionCls} />
          {business.public_contact ? (
            <a href={contactHref(business.public_contact)} className={actionCls} target={contactHref(business.public_contact).startsWith("http") ? "_blank" : undefined} rel="noopener">
              <MessageCircleIcon className="size-5" aria-hidden="true" /> Message {business.name}
            </a>
          ) : null}
        </div>
      </main>
    </div>
  )
}
