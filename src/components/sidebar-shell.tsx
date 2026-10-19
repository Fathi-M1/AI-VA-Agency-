"use client"

// Hover-to-expand for the shadcn Sidebar (collapsible="icon").
// shadcn's Sidebar has no built-in hover mode; this uses its documented
// "Controlled Sidebar" pattern: SidebarProvider open / onOpenChange
// (https://ui.shadcn.com/docs/components/sidebar#controlled-sidebar, MIT).
// The component's own state and styles do the collapsing; this only decides
// when `open` is true: while the pointer (or keyboard focus) is inside it.
// The layout gap stays at icon width, so the expanded sidebar overlays the page
// instead of pushing the content sideways on every hover. The slide itself is
// transform-only (see .sidebar-hover in globals.css), never an animated width.
import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { MobileTabBar } from "@/components/mobile-tab-bar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

const OPEN_DELAY = 100 // ms hover intent, so a passing cursor doesn't expand it
const CLOSE_DELAY = 120

export function SidebarShell({
  children,
  openNeedsYou = 0,
  business,
  businesses,
}: {
  children: React.ReactNode
  openNeedsYou?: number
  business: { id: string; name: string; ownerName: string | null }
  businesses: { id: string; name: string }[]
}) {
  const [open, setOpen] = React.useState(false)
  // The account/business dropdown portals its menu outside the sidebar, so opening it fires
  // a blur-close and then a refocus — the flicker when switching business. While it's open,
  // the sidebar stays expanded and hover-close is ignored.
  const menuOpen = React.useRef(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const schedule = (next: boolean, delay: number) => {
    if (!next && menuOpen.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(next), delay)
  }
  const onMenuOpenChange = (isOpen: boolean) => {
    menuOpen.current = isOpen
    if (isOpen) {
      if (timer.current) clearTimeout(timer.current)
      setOpen(true)
    } else {
      schedule(false, CLOSE_DELAY)
    }
  }
  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return (
    <SidebarProvider
      open={open}
      onOpenChange={setOpen}
      // Workspace sidebar = the /register page's green panel. Colours go through the
      // sidebar's own tokens (desktop inherits these; the mobile Sheet keeps the light ones).
      style={
        {
          "--sidebar-width": "15.5rem",
          "--sidebar": "oklch(0.36 0.065 156)",
          "--sidebar-foreground": "oklch(0.95 0.02 90 / 0.78)",
          "--sidebar-accent": "oklch(1 0 0 / 0.13)",
          "--sidebar-accent-foreground": "oklch(0.99 0.01 85)",
          "--sidebar-border": "oklch(0.3 0.055 158)",
        } as React.CSSProperties
      }
      className="sidebar-hover"
    >
      <AppSidebar
        openNeedsYou={openNeedsYou}
        business={business}
        businesses={businesses}
        onMenuOpenChange={onMenuOpenChange}
        onMouseEnter={() => schedule(true, OPEN_DELAY)}
        onMouseLeave={() => schedule(false, CLOSE_DELAY)}
        onFocusCapture={() => schedule(true, 0)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) schedule(false, 0)
        }}
      />
      {/* Same brand wash as the landing page: soft green fading into beige. */}
      <SidebarInset className="pb-20 md:pb-0 bg-background bg-[radial-gradient(70%_45%_at_100%_0%,color-mix(in_oklch,var(--primary)_14%,var(--background))_0%,transparent_70%),radial-gradient(50%_35%_at_0%_100%,color-mix(in_oklch,var(--primary)_6%,var(--background))_0%,transparent_70%)] bg-fixed">
        {children}
        {/* Phones: bottom tab bar (Today, Conversations, Customers, Settings). */}
        <MobileTabBar />
      </SidebarInset>
    </SidebarProvider>
  )
}
