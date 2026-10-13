// Shared class recipes so every screen uses the Dashboard's exact treatments.

/** Uppercase section label (Dashboard: "THIS WEEK YOU RECOVERED"). */
export const eyebrow =
  "text-[0.71875rem] font-semibold uppercase tracking-[0.14em] text-subtle"

/** The one raised surface per screen (Dashboard: "2 things need you"): green glass edge. */
export const raised =
  "rounded-xl border border-primary/15 bg-card shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_12px_32px_-20px_color-mix(in_oklch,var(--primary)_50%,transparent)]"

/** Quiet grouped list container: hairline border, no fill. */
export const quiet = "rounded-xl border border-border"

/** Side panel (Sheet) content, used by every list → detail screen. */
export const panel = "gap-0 bg-card p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"

/** Primary action button: brand green gradient (matches the landing page). */
export const primaryBtn =
  "h-10 gap-2 rounded-[9px] px-5 text-sm font-semibold bg-[linear-gradient(135deg,oklch(0.48_0.085_150)_0%,var(--primary)_55%,oklch(0.33_0.06_158)_100%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_6px_16px_-8px_color-mix(in_oklch,var(--primary)_75%,transparent)] hover:brightness-110"

/** Secondary button sizing that sits next to a primary. */
export const secondaryBtn = "h-10 rounded-[9px] border-input bg-transparent px-4 text-sm font-medium"
