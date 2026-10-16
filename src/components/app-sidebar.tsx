"use client"

// shadcn/ui sidebar blocks, combined:
// - sidebar-03 (brand header + flat menu): https://ui.shadcn.com/r/styles/radix-nova/sidebar-03.json
// - sidebar-07 (collapse to icons): https://ui.shadcn.com/r/styles/radix-nova/sidebar-07.json
//   → collapsible="icon", icon + label per SidebarMenuButton.
// Expands on hover via SidebarShell (controlled open state), so the rail and the
// per-item tooltips are left out: hovering already reveals the labels.
// Browse: https://ui.shadcn.com/blocks/sidebar. License: MIT (shadcn-ui/ui).
// Adapted: the business's own name and owner (from Supabase), nav with Lucide icons, the Needs you count via
// SidebarMenuBadge, logo square in ink rather than the accent, spacing tuned to the
// approved layout, the Needs you badge kept visible (as a small count on the
// icon) when collapsed, and a footer with the live-status badge (Origin UI
// comp-420) that hides when collapsed. The hover slide respects reduced motion.
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BotIcon,
  CalendarDaysIcon,
  HomeIcon,
  LayoutDashboardIcon,
  MessagesSquareIcon,
  SettingsIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react"

import { useAppPath } from "@/components/app-link"
import { LivePulse } from "@/components/workspace/surface"
import { LogoMark } from "@/components/brand/logo"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const NAV = [
  { title: "Today", to: "/today", icon: HomeIcon },
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Conversations", to: "/conversations", icon: MessagesSquareIcon },
  { title: "Needs you", to: "/needs-you", icon: TriangleAlertIcon, countsNeedsYou: true },
  { title: "Agents", to: "/agents", icon: BotIcon },
  { title: "Calendar", to: "/calendar", icon: CalendarDaysIcon },
  { title: "Customers", to: "/customers", icon: UsersIcon },
  { title: "Settings", to: "/settings", icon: SettingsIcon },
]

export function AppSidebar({
  openNeedsYou = 0,
  business,
  businesses,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  /** Real count of open needs-you items (Supabase), read by the app layout. */
  openNeedsYou?: number
  /** The business this account is for, from its Supabase row. */
  business: { id: string; name: string; ownerName: string | null }
  /** The businesses the signed-in user belongs to (account menu). */
  businesses: { id: string; name: string }[]
}) {
  const pathname = usePathname()
  const toApp = useAppPath()

  return (
    <Sidebar
      collapsible="icon"
      // Expanded on hover it overlays the page; the edge shadow and the transform
      // slide live in globals.css (.sidebar-hover).
      className="border-r border-sidebar-border [&_[data-slot=sidebar-inner]]:bg-[linear-gradient(170deg,oklch(0.34_0.062_157)_0%,var(--primary)_55%,color-mix(in_oklch,var(--primary)_75%,oklch(0.92_0.03_85))_100%)]"
      {...props}
    >
      <SidebarHeader className="px-3 pt-6 pb-0 group-data-[collapsible=icon]:px-2">
        <TeamSwitcher current={business} businesses={businesses} />
      </SidebarHeader>

      <SidebarContent className="px-2 pt-[27px] group-data-[collapsible=icon]:px-0">
        <SidebarGroup>
          <SidebarMenu className="gap-0.5">
            {NAV.map((item) => {
              const href = toApp(item.to)
              const active = pathname === href
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    className="h-9 gap-3 rounded-xl px-3 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-accent-foreground data-active:shadow-[inset_0_1px_0_rgb(255_255_255/0.18),inset_0_0_0_1px_rgb(255_255_255/0.12)] [&_svg]:text-sidebar-foreground data-active:[&_svg]:text-sidebar-accent-foreground"
                  >
                    <Link href={href} aria-current={active ? "page" : undefined}>
                      <item.icon aria-hidden="true" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.countsNeedsYou && openNeedsYou > 0 ? (
                    <SidebarMenuBadge
                      className="right-2.5 rounded-full bg-warning px-2 text-[0.71875rem] font-semibold text-[oklch(0.25_0.05_60)] peer-data-[size=default]/menu-button:top-[7px] peer-hover/menu-button:text-[oklch(0.25_0.05_60)] peer-data-active/menu-button:text-[oklch(0.25_0.05_60)] group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:min-w-4 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:text-[10px] group-data-[collapsible=icon]:right-auto group-data-[collapsible=icon]:left-3.5 group-data-[collapsible=icon]:peer-data-[size=default]/menu-button:top-0"
                      aria-label={`${openNeedsYou} need you`}
                    >
                      {openNeedsYou}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 px-5 pb-7 group-data-[collapsible=icon]:hidden">
        {/* Receptionist, Booking, Sales and Support run; Setup & Admin isn't built yet. */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-sidebar-accent-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] backdrop-blur-xl">
            <LivePulse className="size-1.5 text-[oklch(0.88_0.12_145)]" />
            4 of 5 agents live
          </span>
        </div>
        <Link href="/" className="mt-1 flex items-center gap-1.5 text-xs text-sidebar-foreground hover:text-sidebar-accent-foreground">
          <LogoMark className="h-3.5 w-auto" onDark />
          AI VA Agency
        </Link>
      </SidebarFooter>
    </Sidebar>
  )
}
