"use client"

// Person detail, opened from a Customers row inside the shadcn Sheet.
// Parts (all already pulled): shadcn Avatar, Tabs (MIT); Origin UI comp-420 status
// badges and Timeline (https://coss.com/origin, MIT).
// Real data only: the customer row and its bookings + conversations from Supabase.
// (The identity box, notes and Text/Call/Book buttons were removed: no real source.)
import * as React from "react"
import { ChevronRightIcon } from "lucide-react"

import StatusDotBadge from "@/components/comp-420"
import { TimelineList } from "@/components/timeline-list"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { avatarTint, initials } from "@/lib/avatar"
import type { CustomerView } from "@/server/db/views"
import { AppLink } from "@/components/app-link"

export type CustomerStatus = "Needs you" | "Booked by AI"
export type CustomerRow = CustomerView & { statuses: CustomerStatus[]; order: number }

// Restrained: amber only for what needs you, the accent only for the AI.
export const statusTone = {
  "Needs you": "warning",
  "Booked by AI": "accent",
} as const

export function CustomerDetail({ c }: { c: CustomerRow }) {
  return (
    <>
      <SheetHeader className="gap-0 border-b border-border px-7 pt-7 pb-6">
        <div className="flex items-center gap-4 pr-8">
          <Avatar className="size-12">
            <AvatarFallback className={`text-sm font-medium ${avatarTint(c.name)}`}>
              {initials(c.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <SheetTitle className="text-2xl font-semibold tracking-[-0.01em]">{c.name}</SheetTitle>
            <SheetDescription className="text-sm">First seen {c.firstSeen}</SheetDescription>
          </div>
        </div>
        {c.statuses.length ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {c.statuses.map((s) => (
              <StatusDotBadge key={s} tone={statusTone[s]} status={false}>
                {s}
              </StatusDotBadge>
            ))}
          </div>
        ) : null}
      </SheetHeader>

      <div className="flex flex-col gap-8 px-7 py-7">
        <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-2.5 text-sm">
          <dt className="text-muted-foreground">Next visit</dt>
          <dd className="font-medium">{c.nextVisit ?? "None booked"}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{c.email ?? "Not on file"}</dd>
          {c.phone ? (
            <>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="tabular-nums">{c.phone}</dd>
            </>
          ) : null}
        </dl>

        <Tabs defaultValue="bookings">
          <TabsList variant="line" className="mb-5 h-auto! gap-6 border-b border-border p-0">
            <TabsTrigger value="bookings" className="px-0 pb-2.5 text-sm">
              Bookings · {c.bookings.length}
            </TabsTrigger>
            <TabsTrigger value="conversations" className="px-0 pb-2.5 text-sm">
              Conversations · {c.conversations.length}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            {c.bookings.length ? (
              <TimelineList
                items={c.bookings.map((b) => ({
                  at: b.when,
                  text: `${b.service} · ${b.status}${b.upcoming ? " · upcoming" : ""}`,
                  strong: true,
                }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            )}
          </TabsContent>

          <TabsContent value="conversations">
            {c.conversations.length ? (
              // Each conversation opens its transcript on the Conversations screen.
              <ItemGroup className="gap-0 has-data-[size=sm]:gap-0">
                {c.conversations.map((cv, i) => (
                  <React.Fragment key={cv.id}>
                    <Item asChild size="sm" className="px-2 hover:bg-secondary">
                      <AppLink to={`/conversations?open=${cv.id}`}>
                        <ItemContent className="min-w-0 gap-0.5">
                          <ItemTitle className="text-sm font-medium">
                            {cv.firstMessage ? `“${cv.firstMessage}”` : "No messages"}
                          </ItemTitle>
                          <ItemDescription className="text-xs">
                            {cv.when} · {cv.channel} · {cv.messageCount} messages
                            {cv.agents.length ? ` · ${cv.agents.join(" → ")}` : ""}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <ChevronRightIcon aria-hidden="true" className="size-4 text-subtle" />
                        </ItemActions>
                      </AppLink>
                    </Item>
                    {i !== c.conversations.length - 1 && <ItemSeparator className="my-0" />}
                  </React.Fragment>
                ))}
              </ItemGroup>
            ) : (
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
