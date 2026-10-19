# Design system & consistency plan (2026-10-19)

The palette and type tokens are good and deliberate (warm paper, one green accent,
Instrument Serif + Inter, amber reserved for "needs you / waiting"). The inconsistency is
in **application**, not the tokens. This doc is the single source of truth every surface
follows — owner app, customer storefront, and onboarding.

## Audit — what's inconsistent today
- **Radius:** ~18 different corner radii in use (`rounded-full/xl/2xl/3xl/lg/md/sm` plus
  one-offs `[9px] [7px] [2px] [4px] [10px] [3rem]`). No scale discipline.
- **Elevation:** 10+ bespoke `shadow-[…]` strings. Depth differs per component.
- **Buttons:** 5+ primary-CTA implementations across ~33 files (`PillButton`, `brandCls`,
  `primaryBtn`, `bg-primary`, `bg-[var(--brand)]`). The main action looks different per page.
- **Two greens, no rule:** owner app uses `--primary` (deep green); customer pages use the
  per-business `--brand`. Both are valid but the boundary isn't documented, so screens drift.
- **Cards:** the "one card per section, no card-in-card" rule (CLAUDE.md) is not held
  everywhere — onboarding stacks form + preview + tip cards; some sections nest.
- **Type application:** serif headings and big serif numbers are used unevenly; mono appears
  in places it shouldn't; a few all-caps labels (an AI tell) slip in.

## The system (what everything must follow)

### Radius — 3 steps only (tie to `--radius` = 9px)
- **control** `rounded-lg` (inputs, small buttons, chips)
- **card** `rounded-2xl` (any surface/section card)
- **pill** `rounded-full` (primary CTAs, status badges, avatars)
Delete every one-off (`[9px] [7px] [2px] …`). `rounded-3xl` → card. `rounded-md/sm` → control.

### Elevation — 3 named tokens (add to globals.css, use utilities)
- **flat** none (default on paper)
- **raised** one soft shadow for cards that lift off the page
- **overlay** one stronger shadow for sheets/popovers/dropdowns
Kill bespoke `shadow-[…]`; the green-tinted inset-highlight stays ONLY on the hero panel.

### Buttons — one component, four variants
Route every button through one `Button` (variants: **primary** green pill, **secondary**
outline, **ghost** quiet, **link** underline). Retire `PillButton`, `brandCls`,
`primaryBtn`, ad-hoc `bg-[var(--brand)]` buttons. On customer pages the primary variant uses
`--brand`; in the owner app it uses `--primary`. Same shape, size, and states everywhere.

### Color boundary (documented)
- **Owner app** (everything under `/app`, sign-in): green `--primary` system.
- **Customer storefront** (`/book/…`, ticket): the business's `--brand` for its accent;
  neutrals and layout identical to the owner app so it's clearly the same product.
- **Status, fixed everywhere:** amber = needs you / waiting; green = confirmed / live;
  neutral = declined / closed; red = destructive only.

### Type scale (apply consistently)
- **Display / page title:** Instrument Serif, large.
- **Section title:** Instrument Serif, medium (the `CardTitle` pattern).
- **Body / UI:** Inter. **Labels:** Inter medium, sentence case — never all-caps.
- **Numbers that are the point** (hero stats): serif. **Mono:** reference codes only.
- Line length < 70ch for serif body.

### Layout & cards
- One card (`GlassCard`) per section; never a card inside a card. Separate sections with
  spacing (24 mobile / 32 up), not nested borders.
- Page = `max-w-[1280px]`, 16px side gutter on phones. Mobile-first; verify 390 / 768 / 1280.
- Canonical patterns (build once, reuse): page header, section + `CardTitle`, stat tile,
  list row, empty state, form field, stepper, calendar, status badge, primary/secondary CTA.
  Catalog components keep their source + license comment (premium-ui-design rule).

## Staged redesign (consistent across all three areas)
- **Stage A — codify the system:** radius/elevation tokens, the one `Button`, confirm
  `GlassCard`/`CardTitle`/field primitives; a lint-style check for stray radii/shadows/CTAs.
  Low risk, unifies instantly.
- **Stage B — owner app** surfaces to the system (Today, Dashboard, Conversations,
  Customers, Needs you, Agents, Calendar, Settings, live, sign-in).
- **Stage C — customer storefront** (booking page, calendar, ticket) to the system.
- **Stage D — onboarding** full visual redesign (all 4 steps) on the system.

Each stage: brainstorm the specific screen intent → apply the system → test at 390/768/1280.
