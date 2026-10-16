// Dashboard, in the workspace design language (see components/workspace/surface.tsx).
// Real data only (Supabase): the greeting uses the owner's name, every number is this
// week's real count, and revenue shows $0 until an average job value is set.
// Parts: NumberFlow hero figure (MIT), Origin UI comp-91 download button (MIT),
// Lucide icons (ISC).
import Link from "next/link"
import {
  BotIcon,
  BriefcaseIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  LifeBuoyIcon,
  MessagesSquareIcon,
  MoonIcon,
  PhoneIncomingIcon,
  TimerIcon,
  TriangleAlertIcon,
} from "lucide-react"

import DownloadReportButton from "@/components/comp-91"
import { HeroFigure } from "@/components/dashboard/hero-figure"
import { CardTitle, GlassCard, GlassChip, GlassTile, HeroPanel, LivePulse, PillButton } from "@/components/workspace/surface"
import { usd, type WeekSummary } from "@/lib/dashboard-data"

export function DashboardHero({
  greeting,
  ownerName,
  businessName,
  week,
  liveAgents,
  report,
}: {
  greeting: string
  ownerName: string | null
  businessName: string
  week: WeekSummary
  liveAgents: number
  report: { text: string; fileName: string }
}) {
  const firstName = ownerName?.replace(/^(dr|mr|mrs|ms)\.?\s+/i, "").split(" ")[0]
  const tiles = [
    { icon: MessagesSquareIcon, label: "Conversations", value: String(week.conversations) },
    { icon: CalendarCheckIcon, label: "Booked", value: String(week.booked) },
    { icon: MoonIcon, label: "After hours", value: String(week.afterHours) },
    { icon: TimerIcon, label: "Avg first reply", value: `${week.firstReplySeconds}s` },
  ]
  return (
    <HeroPanel>
      <div className="grid gap-10 p-7 sm:p-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <GlassChip onGreen>
              <CalendarDaysIcon className="size-4 opacity-80" aria-hidden="true" />
              {week.weekLabel}
            </GlassChip>
            <GlassChip onGreen>
              <LivePulse className="text-[oklch(0.88_0.12_145)]" />
              {liveAgents} agents live
            </GlassChip>
          </div>

          <h1 className="mt-7 font-serif text-5xl leading-[0.95] tracking-[-0.01em] sm:text-6xl">
            {greeting}
            {firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-4 max-w-md text-lg text-primary-foreground/85">
            Here&apos;s how your AI team did at {businessName} this week.
          </p>

          <div className="mt-auto pt-8">
            <p className="text-xs font-semibold tracking-[0.14em] text-primary-foreground/70 uppercase">Recovered this week</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 font-serif text-6xl leading-none">
              <HeroFigure current={week.recovered} previous={week.recovered - week.recoveredDelta} />
            </div>
            <p className="mt-3 text-sm text-primary-foreground/75">
              {week.avgJobValue > 0 ? (
                <>From {week.booked} bookings × your average job value of {usd(week.avgJobValue)}.</>
              ) : (
                <>
                  Shows $0 until you set your average job value.{" "}
                  <Link href="/settings" className="font-medium text-primary-foreground underline underline-offset-4">
                    Set it
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <DownloadReportButton
              weekLabel={week.weekLabel}
              reportText={report.text}
              fileName={report.fileName}
              className="group relative h-10 gap-2 rounded-full border-primary-foreground/25 bg-primary-foreground/10 px-4 text-sm font-medium text-primary-foreground backdrop-blur-xl hover:bg-primary-foreground/15 hover:text-primary-foreground disabled:opacity-100"
            />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3">
            {tiles.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex flex-col justify-between gap-6 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/[0.08] p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] backdrop-blur-xl"
              >
                <GlassTile onGreen>
                  <Icon />
                </GlassTile>
                <div>
                  <p className="text-sm text-primary-foreground/75">{label}</p>
                  <p className="mt-1 font-serif text-4xl leading-none tabular-nums">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HeroPanel>
  )
}

export function NeedsYouCard({ week }: { week: WeekSummary }) {
  const n = week.needsYou.length
  return (
    <GlassCard className="flex h-full flex-col p-6 sm:p-7" aria-labelledby="needs-h">
      <CardTitle
        id="needs-h"
        title={n ? `${n} ${n === 1 ? "thing needs" : "things need"} you` : "Nothing needs you"}
        subtitle={`${week.autoResolved} resolved automatically this week`}
        action={
          n ? (
            <PillButton href="/needs-you" variant="primary">
              Review <ChevronRightIcon aria-hidden="true" />
            </PillButton>
          ) : null
        }
      />
      {n === 0 ? (
        <div className="mt-6 mb-6 flex items-center gap-3 rounded-xl border border-dashed border-primary/20 p-5">
          <GlassTile>
            <CircleCheckIcon />
          </GlassTile>
          <p className="text-sm text-muted-foreground">You&apos;re all caught up. Items show up here the moment the AI needs you.</p>
        </div>
      ) : (
        <ul className="mt-6 mb-6 flex flex-col gap-2">
          {week.needsYou.map((item) => (
            <li key={item.id}>
              <Link
                href="/needs-you"
                className="group flex items-center gap-4 rounded-xl border border-transparent p-3 transition hover:border-[color-mix(in_oklch,var(--warning)_35%,transparent)] hover:bg-[color-mix(in_oklch,var(--warning)_7%,var(--background))]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--warning)_18%,var(--background))] text-[oklch(0.45_0.12_60)] ring-1 ring-[color-mix(in_oklch,var(--warning)_35%,transparent)]">
                  <TriangleAlertIcon className="size-[46%]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">
                    {item.who} · {item.action}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">{item.why}</span>
                </span>
                <span className="hidden text-xs whitespace-nowrap text-subtle sm:block">{item.due}</span>
                <ChevronRightIcon className="size-4 text-subtle transition group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-auto border-t border-border/70 pt-4 text-xs text-subtle">
        These are requests your AI team isn&apos;t allowed to handle alone, such as refunds, disputes and anything
        outside your rules.
      </p>
    </GlassCard>
  )
}

const AGENT_ICON = {
  receptionist: PhoneIncomingIcon,
  booking: CalendarCheckIcon,
  sales: BriefcaseIcon,
  support: LifeBuoyIcon,
  admin: BotIcon,
} as const

export function TeamCard({ agents }: { agents: { id: keyof typeof AGENT_ICON; name: string; week: string; status: string }[] }) {
  return (
    <GlassCard className="flex h-full flex-col p-6 sm:p-7" aria-labelledby="team-h">
      <CardTitle
        id="team-h"
        title="Your AI team"
        subtitle="What each agent did this week"
        action={
          <Link href="/agents" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Agents
          </Link>
        }
      />
      <ul className="mt-6 flex flex-col gap-3">
        {agents.map((a) => {
          const Icon = AGENT_ICON[a.id]
          return (
            <li key={a.id} className="flex items-center gap-3.5">
              <GlassTile className="size-10">
                <Icon />
              </GlassTile>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium">{a.name}</p>
                <p className="truncate text-sm text-muted-foreground">{a.week}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-[color-mix(in_oklch,var(--primary)_7%,var(--background))] px-2.5 py-1 text-xs font-medium text-primary">
                <LivePulse className="size-1.5" />
                {a.status}
              </span>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}
