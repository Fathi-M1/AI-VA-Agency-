// shadcn/ui Item example "item-group" (a list of people with avatars and separators)
// Source: https://ui.shadcn.com/docs/components/item (registry: https://ui.shadcn.com/r/styles/new-york-v4/item-group.json)
// License: MIT (shadcn-ui/ui). Installed via shadcn CLI.
// Data: the real last conversations from Supabase.
// Adapted: the last conversations instead of team members; initials in the avatar
// (no photos); channel + time as the description; the outcome as an Origin
// comp-420 status badge instead of the "+" button; an open section (heading +
// hairline divider, no card surface) with a "View all" link; tighter item size.
import * as React from "react"
import Link from "next/link"
import { UserRoundIcon } from "lucide-react"

import StatusDotBadge from "@/components/comp-420"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { avatarTint } from "@/lib/avatar"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import type { ConversationView, Outcome } from "@/server/db/views"

// Same colours as the Conversations screen: booked = green, needs you = amber.
const tone: Record<Outcome, "accent" | "warning" | "hollow"> = {
  Booked: "accent",
  "Needs you": "warning",
  Open: "hollow",
}

const initials = (name: string) =>
  name.startsWith("(") ? "#" : name.split(" ").map((p) => p[0]).slice(0, 2).join("")

export default function RecentActivity({ items }: { items: ConversationView[] }) {
  return (
    <section aria-labelledby="activity-h" className="rounded-2xl border border-border/80 bg-card/85 shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_14px_40px_-28px_color-mix(in_oklch,var(--primary)_55%,transparent)] backdrop-blur p-7">
      <div className="flex items-start justify-between gap-3 pb-4">
        <div>
          <h2 id="activity-h" className="font-serif text-2xl leading-tight tracking-[-0.01em]">Recent activity</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{`The last ${items.length} conversations`}</p>
        </div>
        <Link
          href="/conversations"
          className="pt-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          View all
        </Link>
      </div>
      <div>
        <ItemGroup className="gap-0 has-data-[size=sm]:gap-0">
          {items.map((c, index) => (
            <React.Fragment key={c.id}>
              <Item asChild size="sm" className="-mx-2 rounded-xl px-2 py-2.5 hover:bg-[color-mix(in_oklch,var(--primary)_6%,var(--background))]">
                <Link href={`/conversations?open=${c.id}`}>
                <ItemMedia>
                  <Avatar className="size-9">
                    {c.customerId ? (
                      <AvatarFallback className={`text-xs font-medium ${avatarTint(c.customer)}`}>
                        {initials(c.customer)}
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-secondary text-subtle">
                        <UserRoundIcon className="size-4" aria-hidden="true" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                </ItemMedia>
                <ItemContent className="min-w-0 gap-0.5">
                  <ItemTitle className="text-[15px] font-medium">{c.customer}</ItemTitle>
                  <ItemDescription className="text-xs">
                    {c.channel} · {c.when} · {c.agents.join(" → ") || "no agent"}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <StatusDotBadge tone={tone[c.outcome]} status={false}>
                    {c.outcome}
                  </StatusDotBadge>
                </ItemActions>
                </Link>
              </Item>
              {index !== items.length - 1 && <ItemSeparator className="my-0" />}
            </React.Fragment>
          ))}
        </ItemGroup>
      </div>
    </section>
  )
}
