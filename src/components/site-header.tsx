// shadcn/ui block dashboard-01 → components/site-header.tsx, with the header row
// from sidebar-07's page (SidebarTrigger + vertical Separator + title).
// Sources: https://ui.shadcn.com/r/styles/radix-nova/dashboard-01.json
//          https://ui.shadcn.com/r/styles/radix-nova/sidebar-07.json
// License: MIT (shadcn-ui/ui). Copied from the block sources.
// Adapted: no bottom border or fixed header height (the Dashboard's top bar is
// quiet); the title slot takes the week pagination; an actions slot on the right
// that wraps to its own row on narrow screens.
// On desktop the sidebar expands on hover, so the trigger and separator only
// show on mobile, where the sidebar opens as a sheet.
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader({
  title,
  actions,
  className = "",
}: {
  title: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={`flex min-h-9 shrink-0 items-center gap-2 ${className}`}>
      <div className="flex w-full flex-wrap items-center gap-2">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto md:hidden"
        />
        {title}
        {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
