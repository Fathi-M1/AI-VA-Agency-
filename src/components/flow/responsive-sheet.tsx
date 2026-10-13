"use client"

// Bottom sheet on phones, centered dialog (max 520px) on tablet and laptop.
// shadcn Sheet + Dialog (MIT): https://ui.shadcn.com/docs/components/sheet,
// https://ui.shadcn.com/docs/components/dialog
import * as React from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import { useIsDesktop } from "./flow-ui"

export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  /** visible description; when absent, the title is repeated for screen readers */
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const wide = useIsDesktop()
  const desc = description ? (
    <span className="text-base leading-relaxed text-foreground/85">{description}</span>
  ) : (
    <span className="sr-only">{title}</span>
  )
  if (wide) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("max-h-[90svh] gap-0 overflow-y-auto bg-background p-0 sm:max-w-[520px]", className)}>
          <DialogHeader className="px-6 pt-6 pb-1 text-left">
            <DialogTitle className="pr-8 font-serif text-2xl font-normal">{title}</DialogTitle>
            <DialogDescription asChild>{desc}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-6 pt-3 pb-6">{children}</div>
        </DialogContent>
      </Dialog>
    )
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={cn("max-h-[90svh] gap-0 overflow-y-auto rounded-t-3xl bg-background p-0", className)}>
        <SheetHeader className="px-5 pt-6 pb-1">
          <SheetTitle className="pr-8 font-serif text-2xl font-normal">{title}</SheetTitle>
          <SheetDescription asChild>{desc}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
