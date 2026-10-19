// Shared class recipes so every screen uses the Dashboard's exact treatments.

/** Uppercase section label (Dashboard: "THIS WEEK YOU RECOVERED"). */
export const eyebrow =
  "text-[0.71875rem] font-semibold uppercase tracking-[0.14em] text-subtle"

/** The one raised surface per screen (Dashboard: "2 things need you"): card radius + raised
 *  elevation token (design-system.md). */
export const raised = "rounded-2xl border border-primary/15 bg-card shadow-[var(--elevate-raised)]"

/** Quiet grouped list container: hairline border, no fill. Card radius. */
export const quiet = "rounded-2xl border border-border"

/** Side panel (Sheet) content, used by every list → detail screen. */
export const panel = "gap-0 bg-card p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"

/** Primary action button: the one green pill (design-system.md — solid --primary, no
 *  bespoke gradient/shadow, so it matches everywhere and works in dark). */
export const primaryBtn = "h-10 gap-2 rounded-full px-5 text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110"

/** Secondary button that sits next to a primary: outline pill. */
export const secondaryBtn = "h-10 rounded-full border border-input bg-transparent px-4 text-sm font-medium hover:bg-secondary"
