"use client"

// Building blocks for the owner flow (/setup, /setup/live, /today) and the customer
// booking page, in the workspace design language (see components/workspace/surface.tsx).
// All are adaptations of installed components (MIT): shadcn Field, Input, Select,
// ToggleGroup and Button (https://ui.shadcn.com); nothing hand-rolled beyond styling.
// Sizes follow the flow's rules: 16px text, 44px+ tap targets, a 48px primary button.
import * as React from "react"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export const inputCls = "h-12 rounded-xl bg-card px-3.5 text-base md:text-base"
export const selectCls =
  "w-full rounded-xl bg-card px-3.5 text-base data-[size=default]:h-12 [&_[data-slot=select-value]]:text-base"
export const linkCls =
  "inline-flex min-h-11 items-center gap-1.5 text-base font-medium text-primary underline-offset-4 hover:underline focus-visible:underline"
export const quietLinkCls =
  "inline-flex min-h-11 items-center gap-1.5 text-base text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"

/** Label on top, control, one-line helper and the inline instruction (error) below. */
export function FieldBlock({
  id,
  label,
  helper,
  error,
  children,
  className,
}: {
  id?: string
  label: React.ReactNode
  helper?: React.ReactNode
  error?: string | null
  children: React.ReactNode
  className?: string
}) {
  return (
    <Field className={cn("gap-2", className)} data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id} className="text-base font-medium">
        {label}
      </FieldLabel>
      {children}
      {helper ? <FieldDescription className="text-sm leading-snug">{helper}</FieldDescription> : null}
      {error ? <FieldError id={id ? `${id}-error` : undefined} className="text-sm">{error}</FieldError> : null}
    </Field>
  )
}

/** A number input with a ₱ prefix. */
export function MoneyInput({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  label,
  className,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  invalid?: boolean
  label?: string
  className?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-base text-muted-foreground">
        ₱
      </span>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        onBlur={onBlur}
        className={cn(inputCls, "pl-8 tabular-nums")}
      />
    </div>
  )
}

const chipItemCls =
  "h-11 min-w-11 rounded-full border border-border bg-card px-4 text-base font-normal shadow-none hover:bg-muted data-[state=on]:border-primary data-[state=on]:bg-[color-mix(in_oklch,var(--primary)_10%,var(--card))] data-[state=on]:font-medium data-[state=on]:text-primary"

/** Multi-select chips (tap, don't type). */
export function Chips({
  label,
  options,
  value,
  onChange,
  className,
  itemClassName,
}: {
  label: string
  options: { value: string; label: React.ReactNode }[]
  value: string[]
  onChange: (v: string[]) => void
  className?: string
  itemClassName?: string
}) {
  return (
    <ToggleGroup
      type="multiple"
      aria-label={label}
      value={value}
      onValueChange={onChange}
      spacing={2}
      className={cn("flex-wrap", className)}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} className={cn(chipItemCls, itemClassName)}>
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Single-choice chips that wrap (e.g. decline reasons). */
export function ChoiceChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <ToggleGroup type="single" aria-label={label} value={value} onValueChange={(v) => v && onChange(v)} spacing={2} className="flex-wrap">
      {options.map((o) => (
        <ToggleGroupItem key={o} value={o} className={chipItemCls}>
          {o}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Yes / No style segmented control (single choice). */
export function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(v) => v && onChange(v)}
      spacing={0}
      variant="outline"
      className="w-full rounded-xl bg-card"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-12 flex-1 text-base data-[state=on]:bg-[color-mix(in_oklch,var(--primary)_12%,var(--card))] data-[state=on]:font-medium data-[state=on]:text-primary"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** The one primary button per screen: full width, 48px, green gradient. "Blocked"
 *  looks disabled (aria-disabled) but still takes a tap, so it can reveal what's missing. */
export const PrimaryAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { blocked?: boolean; loading?: boolean; loadingText?: string }
>(function PrimaryAction({ blocked, loading, loadingText, className, children, onClick, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-disabled={blocked || loading || undefined}
      disabled={loading}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-base font-semibold text-primary-foreground transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        "bg-[linear-gradient(135deg,oklch(0.5_0.09_150),var(--primary)_55%,oklch(0.32_0.06_158))] shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_10px_24px_-12px_color-mix(in_oklch,var(--primary)_80%,transparent)]",
        blocked || loading ? "cursor-not-allowed opacity-50" : "hover:brightness-110 active:translate-y-px",
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="size-5" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  )
})

/** Bottom bar that sticks on phones and sits under the content on desktop. */
export function StickyFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-4 mt-auto flex flex-col gap-1 bg-[linear-gradient(to_top,var(--background)_70%,transparent)] px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] md:static md:mx-0 md:bg-none md:px-0",
        className
      )}
    >
      {children}
    </div>
  )
}

/** true on screens 768px and up (side panel instead of bottom sheet). */
export function useIsDesktop() {
  const [desktop, setDesktop] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const update = () => setDesktop(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return desktop
}

const noop = () => () => {}
/** false while server-rendering and hydrating, true once running in the browser. */
export function useMounted() {
  return React.useSyncExternalStore(noop, () => true, () => false)
}

/** The beige canvas with the brand wash, shared by the owner flow screens. */
export function FlowCanvas({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "min-h-svh bg-background bg-[radial-gradient(90%_45%_at_100%_0%,color-mix(in_oklch,var(--primary)_14%,var(--background))_0%,transparent_70%),radial-gradient(60%_35%_at_0%_100%,color-mix(in_oklch,var(--primary)_7%,var(--background))_0%,transparent_70%)]",
        className
      )}
    >
      {children}
    </div>
  )
}
