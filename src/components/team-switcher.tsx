"use client"

// shadcn/ui sidebar-07 "TeamSwitcher" (https://ui.shadcn.com/r/styles/radix-nova/sidebar-07.json),
// License: MIT (shadcn-ui/ui). Structure kept: SidebarMenuButton trigger with logo tile +
// name + subtitle, DropdownMenu listing the items, separator, "Add" row.
// Adapted: the account menu. Lists the businesses the signed-in user belongs to (links
// to each one's Today; access is re-checked on every page), "Add business" opens
// onboarding, and "Sign out" ends the session. The logo tile is the business's initial
// in ink; Lucide icons instead of IconPlaceholder.
import * as React from "react"
import Link from "next/link"
import { ChevronsUpDownIcon, LogOutIcon, MoonIcon, PlusIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { signOut } from "@/app/auth/actions"
import { appPath } from "@/lib/app-path"
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
    className={`flex aspect-square shrink-0 items-center justify-center rounded-lg font-serif leading-none text-white ${
      glass
        ? "border border-white/25 bg-white/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.3)] backdrop-blur-xl"
        : "bg-[linear-gradient(135deg,oklch(0.6_0.1_150)_0%,var(--primary)_55%,oklch(0.32_0.06_158)_100%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
    } ${className}`}
  >
    {name.charAt(0).toLowerCase()}
  </div>
)

// Light / dark for the owner app (customers never see this; the storefront stays light).
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === "dark"
  return (
    <DropdownMenuItem
      className="gap-2 p-2"
      onSelect={(e) => {
        e.preventDefault()
        setTheme(dark ? "light" : "dark")
      }}
    >
      {dark ? <SunIcon className="size-4" aria-hidden="true" /> : <MoonIcon className="size-4" aria-hidden="true" />}
      {dark ? "Light mode" : "Dark mode"}
    </DropdownMenuItem>
  )
}

export function TeamSwitcher({
  current,
  businesses,
  onOpenChange,
}: {
  current: { id: string; name: string; ownerName: string | null }
  businesses: { id: string; name: string }[]
  onOpenChange?: (open: boolean) => void
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu onOpenChange={onOpenChange}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="gap-3 rounded-xl hover:bg-sidebar-accent active:bg-sidebar-accent data-[state=open]:bg-sidebar-accent"
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
            <DropdownMenuLabel className="text-xs text-muted-foreground">Your businesses</DropdownMenuLabel>
            {businesses.map((b) => (
              <DropdownMenuItem key={b.id} asChild className="gap-2 p-2" disabled={b.id === current.id}>
                <Link href={appPath(b.id, "/today")} aria-current={b.id === current.id ? "page" : undefined}>
                  <Initial name={b.name} className="size-6 rounded-md text-sm" />
                  <span className="truncate">{b.name}</span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link href="/app/onboarding">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <PlusIcon className="size-4" />
                </div>
                <span className="font-medium text-muted-foreground">Add business</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <ThemeToggle />
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem asChild className="w-full gap-2 p-2">
                <button type="submit">
                  <LogOutIcon className="size-4" aria-hidden="true" />
                  Sign out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
