// Workspace design language, taken from the /register page so every screen of the SMB
// workspace speaks the same way:
// - HeroPanel: the deep green gradient panel (beige text, soft beige glow)
// - GlassCard: light frosted card on the beige canvas
// - GlassTile: frosted icon tile (on green or on beige)
// - CardTitle: serif section heading + quiet subtitle + optional action
// - LivePulse: the "online" pulse dot
// - PillButton: round green-gradient action (a page inside the current business)
import * as React from "react"
import { AppLink } from "@/components/app-link"
import { cn } from "@/lib/utils"

export function HeroPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl bg-[linear-gradient(150deg,oklch(0.36_0.065_156)_0%,var(--primary)_38%,color-mix(in_oklch,var(--primary)_58%,oklch(0.92_0.03_85))_100%)] text-primary-foreground shadow-[0_24px_60px_-32px_color-mix(in_oklch,var(--primary)_80%,transparent)]",
        className
      )}
    >
      {/* the register panel's soft beige glow, bottom right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-40 size-[30rem] rounded-full bg-[radial-gradient(circle,oklch(0.92_0.03_85/0.35)_0%,transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-24 size-[22rem] rounded-full bg-[radial-gradient(circle,oklch(0.75_0.1_150/0.25)_0%,transparent_70%)]"
      />
      <div className="relative">{children}</div>
    </section>
  )
}

export function GlassCard({
  className,
  children,
  as: Tag = "section",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
  return (
    <Tag
      className={cn(
        "relative rounded-2xl border border-border/80 bg-card/85 shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_14px_40px_-28px_color-mix(in_oklch,var(--primary)_55%,transparent)] backdrop-blur",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function GlassTile({
  children,
  onGreen = false,
  className,
}: {
  children: React.ReactNode
  onGreen?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl [&_svg]:size-[46%]",
        onGreen
          ? "bg-primary-foreground/15 text-primary-foreground ring-1 ring-primary-foreground/15"
          : "border border-primary/15 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_8%,white),color-mix(in_oklch,var(--primary)_20%,var(--background)))] text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.75)]",
        className ?? "size-9"
      )}
    >
      {children}
    </span>
  )
}

export function CardTitle({
  title,
  subtitle,
  action,
  id,
  className,
}: {
  title: string
  subtitle?: React.ReactNode
  action?: React.ReactNode
  id?: string
  className?: string
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 id={id} className="font-serif text-2xl leading-tight tracking-[-0.01em] text-foreground">
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 pt-1">{action}</div> : null}
    </div>
  )
}

export function LivePulse({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2", className)} aria-hidden="true">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-50 motion-reduce:animate-none" />
      <span className="relative inline-flex size-2 rounded-full bg-current" />
    </span>
  )
}

export function PillButton({
  to,
  children,
  variant = "primary",
  className,
}: {
  /** Page inside the current business (the path after /app/[businessId]). */
  to: string
  children: React.ReactNode
  variant?: "primary" | "glass" | "ghost"
  className?: string
}) {
  return (
    <AppLink
      to={to}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition [&_svg]:size-4",
        variant === "primary" &&
          "bg-[linear-gradient(135deg,oklch(0.5_0.09_150),var(--primary)_55%,oklch(0.32_0.06_158))] text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_8px_20px_-10px_color-mix(in_oklch,var(--primary)_80%,transparent)] hover:brightness-110",
        variant === "glass" &&
          "border border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground backdrop-blur-xl hover:bg-primary-foreground/15",
        variant === "ghost" && "border border-primary/20 bg-background/70 text-foreground hover:border-primary/40",
        className
      )}
    >
      {children}
    </AppLink>
  )
}

/** A frosted chip, e.g. the week label in the hero. */
export function GlassChip({ children, onGreen = false, className }: { children: React.ReactNode; onGreen?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium backdrop-blur-xl",
        onGreen
          ? "border border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]"
          : "border border-primary/20 bg-background/70 text-foreground shadow-sm",
        className
      )}
    >
      {children}
    </span>
  )
}
