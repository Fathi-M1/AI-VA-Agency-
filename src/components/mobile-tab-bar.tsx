"use client"

// Phone navigation for owner pages: a bottom tab bar with 4 tabs (icon + label).
// Adapted from Shadcn UI Blocks "Mobile Navigation Tabs" (tabs-08), MIT
// (https://www.shadcnui-blocks.com/components/tabs, github.com/akash3444/shadcn-ui-blocks):
// same grid of four, icon over label, active marked by a top border. Adapted: real
// links (it's navigation, not tabs), fixed to the bottom, safe-area padding, 44px+ targets.
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HomeIcon, MessageSquareIcon, SettingsIcon, UsersIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const TABS = [
  { title: "Today", href: "/today", icon: HomeIcon },
  { title: "Conversations", href: "/conversations", icon: MessageSquareIcon },
  { title: "Customers", href: "/customers", icon: UsersIcon },
  { title: "Settings", href: "/settings", icon: SettingsIcon },
]

export function MobileTabBar() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-4">
        {TABS.map(({ title, href, icon: Icon }) => {
          const active = pathname === href
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 border-transparent px-1 text-[13px] font-medium text-muted-foreground",
                  active && "border-primary text-primary"
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
