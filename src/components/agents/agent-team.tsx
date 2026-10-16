"use client"

// Agents: one row per agent, each opening a profile in a wide shadcn Sheet.
// Parts (all MIT): shadcn Avatar + AvatarBadge, Sheet (documented width override), Item;
// Origin UI comp-420 badges.
// Real data only: what each agent can actually do (its wired tools), the line it says
// when it takes over, this week's counts and its recent conversations (Supabase).
// Setup & Admin is shown as not built yet.
import { useState } from "react"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import StatusDotBadge from "@/components/comp-420"
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { avatarTint } from "@/lib/avatar"
import { eyebrow, panel, quiet } from "@/lib/styles"
import type { AgentView } from "@/server/db/views"

const outcomeTone = { Booked: "accent", "Needs you": "warning", Open: "hollow" } as const

export function AgentTeam({ agents }: { agents: AgentView[] }) {
  const [openId, setOpenId] = useState<AgentView["id"] | null>(null)
  const open = agents.find((a) => a.id === openId) ?? null
  const customerFacing = agents.filter((a) => a.id !== "admin")
  const ownerOnly = agents.filter((a) => a.id === "admin")

  const renderGroup = (label: string, items: AgentView[]) => (
    <section aria-label={label} className="mb-12">
      <p className={`${eyebrow} mb-4`}>{label}</p>
      <ul className={`${quiet} divide-y divide-border`}>
        {items.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => setOpenId(a.id)}
              className="group flex w-full items-center gap-4 px-6 py-5 text-left focus-visible:outline-none"
            >
              <Avatar className="size-10">
                <AvatarFallback className={`text-sm font-semibold ${avatarTint(a.name)}`}>{a.name[0]}</AvatarFallback>
                <AvatarBadge className={a.live ? "bg-primary" : "bg-muted-foreground/50"} />
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-base font-medium group-hover:underline group-focus-visible:underline">
                  {a.name}
                  <ChevronRightIcon aria-hidden="true" className="size-4 text-subtle" />
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{a.job}</span>
                <span className="mt-1.5 block text-xs text-subtle">
                  {a.live ? a.stats.map((s) => `${s.value} ${(s.value === 1 ? s.one : s.label).toLowerCase()}`).join(" · ") : "Not built yet"}
                </span>
              </span>
              <StatusDotBadge tone={a.live ? "accent" : "hollow"} status={false}>
                {a.live ? "Live" : "Not built yet"}
              </StatusDotBadge>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )

  return (
    <>
      {renderGroup("Talks to your customers", customerFacing)}
      {renderGroup("Only for you", ownerOnly)}

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className={`${panel} overflow-y-auto data-[side=right]:sm:max-w-2xl`}>
          {open ? <AgentProfile a={open} /> : null}
        </SheetContent>
      </Sheet>
    </>
  )
}

function AgentProfile({ a }: { a: AgentView }) {
  return (
    <>
      <SheetHeader className="gap-0 border-b border-border px-8 pt-8 pb-6">
        <div className="flex items-center gap-4 pr-8">
          <Avatar size="lg" className="size-14">
            <AvatarFallback className={`text-lg font-semibold ${avatarTint(a.name)}`}>{a.name[0]}</AvatarFallback>
            <AvatarBadge className={a.live ? "bg-primary" : "bg-muted-foreground/50"} />
          </Avatar>
          <div className="min-w-0">
            <SheetTitle className="text-2xl font-semibold tracking-[-0.01em]">{a.name}</SheetTitle>
            <SheetDescription className="text-sm">{a.job}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-9 px-8 py-7">
        {a.live ? (
          <>
            <section aria-label="This week">
              <p className={`${eyebrow} mb-3`}>This week</p>
              <div className="grid grid-cols-2 gap-3">
                {a.stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-border px-4 py-3">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section aria-label="What it can do">
              <p className={`${eyebrow} mb-3`}>What it can do</p>
              <ul className="flex flex-wrap gap-1.5">
                {a.tools.map((t) => (
                  <li key={t}>
                    <StatusDotBadge tone="quiet" status={false}>
                      {t}
                    </StatusDotBadge>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-subtle">These are its only tools. It can&apos;t do anything else.</p>
            </section>

            {a.handoffLine ? (
              <section aria-label="When it takes over">
                <p className={`${eyebrow} mb-2`}>When it takes over</p>
                <p className="text-sm">The Receptionist says &ldquo;{a.handoffLine}&rdquo; and hands the conversation over.</p>
              </section>
            ) : null}

            <section aria-label="Recent conversations">
              <p className={`${eyebrow} mb-2`}>Recent conversations</p>
              {a.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">None yet.</p>
              ) : (
                <ItemGroup className="gap-0 has-data-[size=sm]:gap-0">
                  {a.recent.map((c, i) => (
                    <div key={c.id}>
                      <Item asChild size="sm" className="px-2 hover:bg-secondary">
                        <Link href={`/conversations?open=${c.id}`}>
                          <ItemContent className="min-w-0 gap-0.5">
                            <ItemTitle className="text-sm font-medium">{c.customer}</ItemTitle>
                            <ItemDescription className="text-xs">{c.when}</ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <StatusDotBadge tone={outcomeTone[c.outcome]} status={false}>
                              {c.outcome}
                            </StatusDotBadge>
                            <ChevronRightIcon aria-hidden="true" className="size-4 text-subtle" />
                          </ItemActions>
                        </Link>
                      </Item>
                      {i < a.recent.length - 1 ? <ItemSeparator className="my-0" /> : null}
                    </div>
                  ))}
                </ItemGroup>
              )}
            </section>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Not built yet. When it is, it will walk you through setup (services, hours, calendar, safety rules)
            and then help with back-office chores.
          </p>
        )}
      </div>
    </>
  )
}
