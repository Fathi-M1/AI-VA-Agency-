// shadcn/ui Item example "item-icon" (Item with an icon tile, title, description, action)
// Source: https://ui.shadcn.com/docs/components/item (registry: https://ui.shadcn.com/r/styles/new-york-v4/item-icon.json)
// License: MIT (shadcn-ui/ui). Installed via shadcn CLI.
// Adapted: one row per agent (repeated, with separators, as in item-group);
// Lucide icons per agent; a line about this week as the
// description (real: conversations each agent took part in this week, from Supabase);
// a quiet status label instead of the "Review" button; no outline
// per row; an open section (heading + hairline divider, no card surface) with a
// link to Agents.
import * as React from "react"
import {
  BriefcaseIcon,
  CalendarCheckIcon,
  HeadsetIcon,
  LifeBuoyIcon,
  PhoneIncomingIcon,
} from "lucide-react"

import { Separator } from "@/components/ui/separator"
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
import { AppLink } from "@/components/app-link"
import type { AgentView } from "@/server/db/views"

/** One row per agent; `week` is a real line built from Supabase (see the Dashboard). */
export type AgentWeek = Pick<AgentView, "id" | "name"> & { week: string; status: string }

const icon: Record<AgentView["id"], React.ReactNode> = {
  receptionist: <PhoneIncomingIcon />,
  booking: <CalendarCheckIcon />,
  sales: <BriefcaseIcon />,
  support: <LifeBuoyIcon />,
  admin: <HeadsetIcon />,
}

export default function AgentsThisWeek({ agents }: { agents: AgentWeek[] }) {
  return (
    <section aria-labelledby="team-h">
      <div className="flex items-baseline justify-between gap-3 pb-3">
        <div className="flex items-baseline gap-3">
          <h2 id="team-h" className="text-sm font-semibold">Your AI team this week</h2>
          <span className="text-xs text-subtle">What each agent did</span>
        </div>
        <AppLink
          to="/agents"
          className="text-xs text-muted-foreground underline underline-offset-3 hover:text-foreground"
        >
          Agents
        </AppLink>
      </div>
      <Separator />
      <div>
        <ItemGroup className="gap-0 has-data-[size=sm]:gap-0">
          {agents.map((a, index) => (
            <React.Fragment key={a.id}>
              <Item size="sm" className="px-0">
                <ItemMedia variant="icon" className="size-8 rounded-lg bg-secondary text-foreground">
                  {icon[a.id]}
                </ItemMedia>
                <ItemContent className="min-w-0 gap-0.5">
                  <ItemTitle className="text-sm font-medium">{a.name}</ItemTitle>
                  <ItemDescription className="text-xs">{a.week}</ItemDescription>
                </ItemContent>
                <ItemActions className="text-xs text-subtle">{a.status}</ItemActions>
              </Item>
              {index !== agents.length - 1 && <ItemSeparator className="my-0" />}
            </React.Fragment>
          ))}
        </ItemGroup>
      </div>
    </section>
  )
}
