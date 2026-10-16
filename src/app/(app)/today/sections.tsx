// Today's sections (server components). Each loads its own real data, so each can show
// its own skeleton and its own "Couldn't load this" state.
import Link from "next/link"
import { CalendarCheckIcon, InboxIcon, MessagesSquareIcon } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { CardTitle, GlassCard } from "@/components/workspace/surface"
import { plural, WEEKDAY_SHORT } from "@/lib/format"
import { anyRequestConfirmed, dateIn, handledSince, needsYou, timeIn, todayBase, todaysAppointments, weekCounts } from "@/server/db/today"
import { activeStaff } from "@/server/db/business-profile"
import { bookingUrl, ticketUrl } from "@/server/booking-url"
import { TZDate } from "@date-fns/tz"

import { NeedsYouList, type DateOption } from "./needs-you-list"
import { Checklist } from "./today-client"

const minutesAgo = (nowMs: number, iso: string) => {
  const m = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60000))
  if (m < 1) return "Just now"
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  return d === 1 ? "Yesterday" : `${d} days ago`
}

export function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-7 w-40 rounded-lg" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- summary */

export async function SummarySentence({ businessId }: { businessId: string }) {
  const [base, appts, needs, handled] = await Promise.all([
    todayBase(businessId),
    todaysAppointments(businessId),
    needsYou(businessId),
    handledSince(businessId),
  ])
  const greet = base.hour < 12 ? "Good morning" : base.hour < 18 ? "Good afternoon" : "Good evening"
  const n = appts.length
  const r = needs.requests.length
  const c = handled.total
  const apptText =
    n === 0 ? "You have no appointments today." : `You have ${plural(n, "appointment")} today, the first at ${timeIn(base.tz, appts[0].start)}.`
  const reqText = r === 0 ? "No booking requests need your answer." : `${plural(r, "booking request")} ${r === 1 ? "needs" : "need"} your answer.`
  const since = base.firstVisit ? "you set up" : "your last visit"
  return (
    <p className="text-lg leading-relaxed text-primary-foreground/90">
      <span className="font-serif text-3xl leading-tight text-primary-foreground">{greet}!</span>{" "}
      {apptText} {reqText} Since {since}, your AI team handled {plural(c, "conversation")}.
    </p>
  )
}

/* ---------------------------------------------------------------- checklist */

export async function ChecklistSection({ businessId }: { businessId: string }) {
  const { profile } = await todayBase(businessId)
  const ob = profile.config.onboarding ?? {}
  const confirmed = await anyRequestConfirmed(businessId)
  const allDone = !!ob.shared_link_at && !!ob.tried_as_customer_at && confirmed
  if (ob.hidden_at || allDone) return null
  const url = profile.booking_slug ? await bookingUrl(profile.booking_slug) : ""
  return (
    <GlassCard className="p-5" aria-labelledby="start-h">
      <CardTitle id="start-h" title="Getting started" />
      <div className="mt-3">
        <Checklist
          url={url}
          slug={profile.booking_slug}
          shared={!!ob.shared_link_at}
          tried={!!ob.tried_as_customer_at}
          confirmed={confirmed}
        />
      </div>
      {profile.calendar_mode === "requests" ? (
        <p className="mt-3 border-t border-border/70 pt-3 text-sm text-muted-foreground">
          Need to change your services or hours? Run setup again from Switch business (demo).
        </p>
      ) : null}
    </GlassCard>
  )
}

/* ---------------------------------------------------------------- needs you */

export async function NeedsYouSection({ businessId }: { businessId: string }) {
  const [base, needs] = await Promise.all([todayBase(businessId), needsYou(businessId)])
  const { profile, tz } = base
  const count = needs.requests.length + needs.items.length

  // Next 30 days, in the business timezone, for the confirm sheet.
  const now = new TZDate(base.nowMs, tz)
  const dates: DateOption[] = Array.from({ length: 30 }, (_, i) => {
    const d = new TZDate(now.getFullYear(), now.getMonth(), now.getDate() + i, tz)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const label = `${WEEKDAY_SHORT[d.getDay()]}, ${new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(d)}`
    return { value, label, weekday: d.getDay() }
  })

  return (
    <section aria-labelledby="needs-h" className="@container flex flex-col gap-3">
      <h2 id="needs-h" className="flex items-center gap-2 px-1 font-serif text-2xl leading-tight">
        Needs you
        {count ? (
          <span className="rounded-full bg-warning px-2.5 py-0.5 font-sans text-sm font-semibold text-[oklch(0.25_0.05_60)]">
            {count}
          </span>
        ) : null}
      </h2>
      <NeedsYouList
        business={profile.name}
        staff={activeStaff(profile).map((m) => ({ id: m.id, name: m.name, hours: m.hours }))}
        dates={dates}
        requests={await Promise.all(
          needs.requests.map(async (r) => ({
            ...r,
            received: minutesAgo(base.nowMs, r.createdAt),
            ticketUrl: r.source === "form" && r.ticketToken && profile.booking_slug ? await ticketUrl(profile.booking_slug, r.ticketToken) : null,
          }))
        )}
        items={needs.items.map((i) => ({ ...i, received: minutesAgo(base.nowMs, i.createdAt) }))}
      />
    </section>
  )
}

/* ---------------------------------------------------------------- appointments */

export async function AppointmentsSection({ businessId }: { businessId: string }) {
  const [{ tz }, appts] = await Promise.all([todayBase(businessId), todaysAppointments(businessId)])
  return (
    <GlassCard className="p-5" aria-labelledby="appts-h">
      <CardTitle id="appts-h" title="Today's appointments" />
      {appts.length ? (
        <ol className="mt-3 flex flex-col divide-y divide-border/70">
          {appts.map((a) => (
            <li key={a.id} className="flex items-start gap-4 py-3">
              <span className="w-20 shrink-0 text-base font-semibold tabular-nums">{timeIn(tz, a.start)}</span>
              <span className="min-w-0">
                <span className="block text-base font-medium">{a.customer}</span>
                <span className="block text-base text-muted-foreground">
                  {a.service}
                  {a.teamMember ? ` · ${a.teamMember}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-base text-muted-foreground">
          <CalendarCheckIcon className="size-5" aria-hidden="true" /> No appointments today yet.
        </p>
      )}
    </GlassCard>
  )
}

/* ---------------------------------------------------------------- handled */

export async function HandledSection({ businessId }: { businessId: string }) {
  const [{ tz, nowMs }, handled] = await Promise.all([todayBase(businessId), handledSince(businessId)])
  const todayKey = dateIn(tz, new Date(nowMs).toISOString())
  return (
    <GlassCard className="p-5" aria-labelledby="handled-h">
      <CardTitle id="handled-h" title="Handled by your AI team" />
      {handled.recent.length ? (
        <>
          <ul className="mt-3 flex flex-col divide-y divide-border/70">
            {handled.recent.map((h) => (
              <li key={h.id}>
                <Link href={`/conversations?open=${h.id}`} className="flex items-start gap-3 py-3 hover:bg-muted/40">
                  <MessagesSquareIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-medium">{h.customer}</span>
                    <span className="block text-base text-muted-foreground">{h.outcome}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {dateIn(tz, h.at) === todayKey ? timeIn(tz, h.at) : dateIn(tz, h.at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/conversations" className="mt-2 inline-flex min-h-11 items-center text-base font-medium text-primary underline-offset-4 hover:underline">
            See all conversations
          </Link>
        </>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-base text-muted-foreground">
          <InboxIcon className="size-5 shrink-0" aria-hidden="true" /> No conversations yet. Share your booking link to get started.
        </p>
      )}
    </GlassCard>
  )
}

/* ---------------------------------------------------------------- this week */

export async function WeekSection({ businessId }: { businessId: string }) {
  const w = await weekCounts(businessId)
  const tiles = [
    { label: "Conversations", value: w.conversations },
    { label: "Booking requests", value: w.requests },
    { label: "Confirmed bookings", value: w.confirmed },
  ]
  return (
    <GlassCard className="p-5" aria-labelledby="week-h">
      <CardTitle id="week-h" title="This week" />
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col-reverse gap-1 rounded-xl border border-primary/15 bg-[color-mix(in_oklch,var(--primary)_6%,var(--card))] p-3">
            <dt className="text-sm leading-tight text-muted-foreground">{t.label}</dt>
            <dd className="font-serif text-3xl leading-none tabular-nums">{t.value}</dd>
          </div>
        ))}
      </dl>
    </GlassCard>
  )
}
