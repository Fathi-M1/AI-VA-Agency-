"use client"

// Needs you: queue + detail in one two-pane frame.
// Pulled parts (all MIT):
// - Two-pane frame: shadcn Resizable, https://ui.shadcn.com/docs/components/resizable
// - Toolbar: shadcn dashboard-01 site header + Tabs.
// - Queue rows: shadcn Avatar (initials) + Origin UI comp-420 dot badge.
// - Empty state: shadcn Empty, "empty-demo" example
//   (https://ui.shadcn.com/r/styles/new-york-v4/empty-demo.json), Tabler → Lucide.
// Real data only: rows from the needs_you_items table with their customer and the
// conversation that led to them. Read-only: nothing here changes a row.
// (The on-call badge, countdowns, promises, flags and resolve buttons were removed:
// no real source for them yet.)
import * as React from "react"
import { CheckCheckIcon } from "lucide-react"

import StatusDotBadge from "@/components/comp-420"
import { RichText } from "@/components/rich-text"
import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { avatarTint, initials } from "@/lib/avatar"
import { eyebrow, raised } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { NeedsYouView } from "@/server/db/views"

// Colour carries meaning only: open = amber, anything else (handled) = green.
const toneOf = (e: NeedsYouView) => (e.status === "open" ? "warning" : "accent")
const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function NeedsYouWorkspace({ items }: { items: NeedsYouView[] }) {
  const isMobile = useIsMobile()
  const [view, setView] = React.useState<"open" | "resolved">("open")
  const open = items.filter((e) => e.status === "open")
  const resolved = items.filter((e) => e.status !== "open")
  const list = view === "open" ? open : resolved
  const [selectedId, setSelectedId] = React.useState<string | null>(open[0]?.id ?? null)
  const selected = list.find((e) => e.id === selectedId) ?? list[0] ?? null

  const toolbar = (
    <SiteHeader
      className="mb-6 flex-wrap"
      title={
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-semibold">Needs you</h1>
          <span className="text-xs whitespace-nowrap text-subtle">
            {open.length ? `${open.length} need${open.length === 1 ? "s" : ""} you` : "All clear"}
          </span>
        </div>
      }
      actions={
        <Tabs value={view} onValueChange={(v) => setView(v as "open" | "resolved")}>
          <TabsList className="h-9! rounded-lg bg-secondary">
            <TabsTrigger value="open" className="rounded-md px-3 text-sm">
              Open · {open.length}
            </TabsTrigger>
            <TabsTrigger value="resolved" className="rounded-md px-3 text-sm">
              Resolved · {resolved.length}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
    />
  )

  const queue = (
    <section aria-label="Needs you queue" className="h-full">
      <ul className="flex flex-col">
        {list.map((e) => {
          const active = selected?.id === e.id
          return (
            <li key={e.id} className="border-b border-border">
              <button
                onClick={() => setSelectedId(e.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-card focus-visible:bg-card focus-visible:outline-none",
                  active && "bg-card shadow-[inset_2px_0_0_var(--foreground)]"
                )}
              >
                <Avatar className="size-9">
                  <AvatarFallback className={`text-xs font-medium ${avatarTint(e.who)}`}>
                    {initials(e.who)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{e.who}</span>
                    <StatusDotBadge tone={toneOf(e)} status={false}>
                      {statusLabel(e.status)}
                    </StatusDotBadge>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">{e.reason}</span>
                  <span className="mt-1.5 block text-xs text-subtle">{e.when}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )

  const detail = selected ? (
    <section aria-label="Selected item" className="px-6 py-6 sm:px-8">
      <NeedsYouDetail e={selected} />
    </section>
  ) : null

  const empty = (
    <Empty className="py-20">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-secondary">
          <CheckCheckIcon />
        </EmptyMedia>
        <EmptyTitle className="text-lg font-semibold">
          {view === "open" ? "You're all caught up" : "Nothing resolved yet"}
        </EmptyTitle>
        <EmptyDescription className="text-sm">
          {view === "open"
            ? "Nothing is waiting for you. When the AI can't answer something, it shows up here."
            : "Items you mark done will show up here."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )

  return (
    <div className="w-full">
      {toolbar}
      <div className="border-y border-border">
        {list.length === 0 ? (
          empty
        ) : isMobile ? (
          <div>
            {queue}
            {detail}
          </div>
        ) : (
          <ResizablePanelGroup orientation="horizontal" className="min-h-[640px]">
            <ResizablePanel defaultSize="32" minSize="24" maxSize="44" className="border-r-0">
              {queue}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize="68">{detail}</ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  )
}

function NeedsYouDetail({ e }: { e: NeedsYouView }) {
  const c = e.conversation
  return (
    <div className="max-w-[760px]">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <StatusDotBadge tone={toneOf(e)} status={false}>
          {statusLabel(e.status)}
        </StatusDotBadge>
        <span className="text-xs text-subtle">Logged {e.when}</span>
      </div>
      <h2 className="mb-7 text-2xl font-semibold tracking-[-0.01em]">{e.reason}</h2>

      <div className={`${raised} mb-9 px-7 py-6`}>
        <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-2.5 text-sm">
          <dt className="text-muted-foreground">Customer</dt>
          <dd className="font-medium">{e.who}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{e.email ?? "Not on file"}</dd>
          {c ? (
            <>
              <dt className="text-muted-foreground">Conversation</dt>
              <dd>
                {c.channel} · {c.when} · {c.agents.join(" → ") || "no agent"}
              </dd>
            </>
          ) : null}
        </dl>
      </div>

      <section aria-label="The conversation">
        <p className={`${eyebrow} mb-4`}>The conversation</p>
        {c && c.transcript.length ? (
          <ol className="flex flex-col gap-3.5">
            {c.transcript.map((t, i) => (
              <li key={i} className="grid grid-cols-[96px_1fr] gap-3 text-sm">
                <span className="pt-0.5 text-xs text-subtle">
                  {t.who} <span className="tabular-nums">{t.at}</span>
                </span>
                <RichText text={t.text} className={t.role === "agent" ? "text-muted-foreground" : ""} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No conversation is linked to this item.</p>
        )}
      </section>
    </div>
  )
}
