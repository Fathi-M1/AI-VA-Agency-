import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { HeroFigure } from "@/components/dashboard/hero-figure"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { usd, type WeekSummary } from "@/lib/dashboard-data"
import { eyebrow, primaryBtn } from "@/lib/styles"

/* 1 · The one loud thing: what the AI team earned this week. */
export function RecoveredHero({ week }: { week: WeekSummary }) {
  return (
    <section aria-labelledby="recovered-h">
      <p id="recovered-h" className={eyebrow}>
        This week you recovered
      </p>
      <p className="mt-3.5 flex flex-wrap items-baseline gap-x-4 font-serif text-7xl leading-[0.9] tracking-[-0.01em] text-[oklch(0.36_0.07_155)]">
        <HeroFigure current={week.recovered} previous={week.recovered - week.recoveredDelta} />
      </p>
      <p className="mt-5 max-w-[40ch] text-xl leading-normal text-muted-foreground">
        {week.booked} {week.booked === 1 ? "job" : "jobs"} booked from {week.conversations}{" "}
        {week.conversations === 1 ? "conversation" : "conversations"}.{" "}
        {week.afterHoursBooked} of them came in after hours, when no one would
        have picked up.
      </p>
      <p className="mt-3.5 text-xs text-subtle">
        {week.avgJobValue > 0
          ? `Estimated from your average job value of ${usd(week.avgJobValue)}. `
          : "Shows $0 until you set your average job value. "}
        <HowCalculated week={week} />
      </p>
    </section>
  )
}

/* Progressive disclosure: the formula stays one click away, never on the canvas. */
function HowCalculated({ week }: { week: WeekSummary }) {
  return (
    <Popover>
      <PopoverTrigger className="text-muted-foreground underline underline-offset-3 hover:text-foreground">
        How this is calculated
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 bg-card">
        <PopoverHeader>
          <PopoverTitle className="text-sm font-semibold">
            {week.booked} bookings × {usd(week.avgJobValue)}
          </PopoverTitle>
          <PopoverDescription className="text-xs">
            Every booking your AI team made this week, at your average job
            value. Only counting the {week.afterHoursBooked} after-hours
            bookings, it&apos;s {usd(week.afterHoursBooked * week.avgJobValue)}.
          </PopoverDescription>
        </PopoverHeader>
        <Link
          href="/settings?tab=business"
          className="mt-3 inline-block text-xs font-medium text-foreground underline underline-offset-3"
        >
          Change your average job value
        </Link>
      </PopoverContent>
    </Popover>
  )
}

/* 2 · Quiet supporting facts.
   Tailark "Mist" stats/one: https://tailark.com/blocks/mist/stats
   Source: https://github.com/tailark/blocks/blob/main/registry/bases/radix/mist/blocks/stats/one.tsx
   License: MIT (tailark/blocks). Structure copied: a grid of stat cells split by
   divide-x (divide-y when stacked), each a value plus its label.
   Adapted: no Card surface (hairline top/bottom rules instead), four equal
   columns across the full grid width (as the block's equal columns), left-aligned,
   label above value, the Dashboard's type scale. */
export function WeekGlance({ week }: { week: WeekSummary }) {
  const stats = [
    { label: "Conversations", value: String(week.conversations) },
    { label: "After hours", value: String(week.afterHours) },
    { label: "Booked", value: String(week.booked) },
    { label: "Avg first reply", value: `${week.firstReplySeconds}s` },
  ]
  return (
    <div
      aria-label="This week at a glance"
      role="group"
      className="grid grid-cols-2 border-y border-border *:py-5 *:pr-7 sm:grid-cols-4 sm:divide-x sm:divide-border sm:*:not-first:pl-7"
    >
      {stats.map((stat) => (
        <div key={stat.label}>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.01em] tabular-nums text-foreground">
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  )
}

/* 3 · The one action. The only elevated surface and the only accent button.
   shadcn/ui Card: https://ui.shadcn.com/docs/components/card (MIT), installed via
   `npx shadcn@latest add card`. Adapted: hairline border instead of the ring, no
   footer tint or rule, spacing matched to the approved card. */
export function NeedsYou({ week }: { week: WeekSummary }) {
  if (week.needsYou.length === 0) {
    return (
      <Card
        aria-label="Nothing needs you"
        className="h-full gap-1 rounded-xl border border-border bg-transparent px-7 py-6 ring-0"
      >
        <CardTitle className="text-lg font-semibold">Nothing needs you this week</CardTitle>
        <CardDescription className="text-sm">
          {week.autoResolved} needs-you items were marked done this week.
        </CardDescription>
      </Card>
    )
  }

  const n = week.needsYou.length
  return (
    <Card
      aria-labelledby="needs-h"
      role="region"
      className="h-full gap-0 rounded-xl border border-primary/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_12px_32px_-20px_color-mix(in_oklch,var(--primary)_50%,transparent)] bg-card py-6 ring-0 [--card-spacing:--spacing(7)]"
    >
      <CardHeader className="items-baseline gap-2 max-sm:grid-cols-1">
        <CardTitle>
          <h2 id="needs-h" className="text-lg font-semibold">
            {n} {n === 1 ? "thing needs" : "things need"} you
          </h2>
        </CardTitle>
        <CardAction className="row-span-1 self-baseline text-xs text-subtle max-sm:col-start-1 max-sm:row-start-2 max-sm:justify-self-start">
          {week.autoResolved} more were resolved automatically
        </CardAction>
      </CardHeader>

      <CardContent>
        <ItemGroup className="mt-3.5 mb-5 gap-0">
          {week.needsYou.map((item) => (
            <Item
              key={item.id}
              asChild
              className="rounded-none border-0 border-t border-border px-0 py-3.5 hover:bg-transparent [a]:hover:bg-transparent"
            >
              <Link href="/needs-you">
                <ItemContent className="min-w-0 gap-0.5">
                  <ItemTitle className="text-base font-medium group-hover/item:underline">
                    {item.who} · {item.action}
                  </ItemTitle>
                  <ItemDescription className="text-sm">{item.why}</ItemDescription>
                </ItemContent>
                <ItemActions className="self-start pt-0.5 text-xs whitespace-nowrap text-subtle">
                  {item.due}
                </ItemActions>
              </Link>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>

      <CardFooter className="border-t-0 bg-transparent pt-0 pb-6">
        <Button asChild className={primaryBtn}>
          <Link href="/needs-you">
            Review {n === 1 ? "it" : "these"}
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
