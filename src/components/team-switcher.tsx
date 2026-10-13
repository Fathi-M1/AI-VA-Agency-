"use client"

// shadcn/ui sidebar-07 "TeamSwitcher" (https://ui.shadcn.com/r/styles/radix-nova/sidebar-07.json),
// License: MIT (shadcn-ui/ui). Structure kept: SidebarMenuButton trigger with logo tile +
// name + subtitle, DropdownMenu listing the items, separator, "Add" row.
// Adapted: lists real businesses (Supabase); choosing one switches the app via a Server
// Action (cookie, dev-only until logins exist); "Add business" opens /setup; the
// logo tile is the business's initial in ink; Lucide icons instead of IconPlaceholder.
import * as React from "react"
import Link from "next/link"
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react"

import { switchBusiness } from "@/app/(app)/business-actions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"

const Initial = ({ name, className = "", glass = false }: { name: string; className?: string; glass?: boolean }) => (
  <div
    aria-hidden="true"
    className={`flex aspect-square shrink-0 items-center justify-center rounded-[10px] font-serif leading-none text-white ${
      glass
        ? "border border-white/25 bg-white/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.3)] backdrop-blur-xl"
        : "bg-[linear-gradient(135deg,oklch(0.6_0.1_150)_0%,var(--primary)_55%,oklch(0.32_0.06_158)_100%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
    } ${className}`}
  >
    {name.charAt(0).toLowerCase()}
  </div>
)

export function TeamSwitcher({
  current,
  businesses,
}: {
  current: { id: string; name: string; ownerName: string | null }
  businesses: { id: string; name: string }[]
}) {
  const { isMobile } = useSidebar()
  const [pending, startTransition] = React.useTransition()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="gap-3 rounded-xl hover:bg-sidebar-accent active:bg-sidebar-accent data-[state=open]:bg-sidebar-accent"
              aria-busy={pending}
            >
              <Initial name={current.name} glass className="size-[34px] text-xl group-data-[collapsible=icon]:size-8" />
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold tracking-tight text-sidebar-accent-foreground">{current.name}</span>
                {current.ownerName ? (
                  <span className="truncate text-xs text-sidebar-foreground">{current.ownerName}</span>
                ) : null}
              </div>
              <ChevronsUpDownIcon aria-hidden="true" className="ml-auto size-4 text-sidebar-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="start" side={isMobile ? "bottom" : "right"} sideOffset={4}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Businesses (dev switcher)</DropdownMenuLabel>
            {businesses.map((b) => (
              <DropdownMenuItem
                key={b.id}
                className="gap-2 p-2"
                disabled={b.id === current.id}
                onClick={() => startTransition(() => void switchBusiness(b.id))}
              >
                <Initial name={b.name} className="size-6 rounded-md text-sm" />
                <span className="truncate">{b.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link href="/setup">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <PlusIcon className="size-4" />
                </div>
                <span className="font-medium text-muted-foreground">Add business</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
