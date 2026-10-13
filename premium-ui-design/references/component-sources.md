# Component Catalog — no-login sites to search and use

**Every source here is browsable and usable without a login.** They render component
code on the page; you read/copy it or install via the noted method. Match a source's
style to the product's direction, verify the licence **at the source**, and — if none
of them has a fitting component — **say so and ask the user to search manually. Never
hand-build a substitute.**

Verified current as of **Sep 2026**. Names shift (NextUI → HeroUI; Tailwind UI became
Tailwind Plus and is now closed to new customers — omitted here). If a link 404s,
search for the current home before assuming it's gone.

Licence shorthand: **MIT / Apache-2.0 / ISC / CC0** = free commercial, no attribution.
**Freemium** = free core, browsable, paid Pro tier. **Commons Clause** = usable in a
product but not resellable. Flag anything paid/attribution to the user.

---

## Index by need — jump to the right shelf

| You need… | Search these first |
| --- | --- |
| **Base components** (button, input, dialog, menu) | shadcn/ui → HeroUI → Mantine → daisyUI |
| **Headless primitives** to style yourself | Radix UI, Base UI, React Aria |
| **Marketing sections** (hero, features, pricing, FAQ, CTA) | Tailark, Kokonut UI, Origin UI, Magic UI, Aceternity |
| **Block/registry marketplaces** | 21st.dev, shadcnblocks, Shadcn Studio, ReUI |
| **Animated / motion** | Aceternity, Magic UI, Motion Primitives, React Bits, Cult UI |
| **Number displays / count-ups** | NumberFlow, Magic UI Number Ticker, Motion Primitives |
| **Dashboard shell + charts + KPIs** | Tremor, shadcn charts, AlignUI |
| **Data tables** | TanStack Table (+ shadcn table), HeroUI table |
| **Forms & auth** | shadcn/ui (+ react-hook-form + zod), Origin UI, Kokonut |
| **Icons** | Lucide → Tabler → Phosphor → Simple Icons (brand logos) |
| **Fonts** | Fontshare, Google Fonts (Typewolf for pairing reference) |

---

## Foundation component systems (pick one, stay in it)

- **shadcn/ui** — https://ui.shadcn.com — MIT. The default base; the whole block
  ecosystem installs into it via `npx shadcn@latest add`. React/Next.
- **HeroUI** (was NextUI, v3) — https://www.heroui.com — MIT. React Aria + Tailwind v4,
  more styling out of the box than shadcn.
- **Mantine** — https://mantine.dev — MIT. 120+ components **and** hooks; great for
  data-dense tools.
- **daisyUI** — https://daisyui.com — MIT. Tailwind plugin, class-based, ~35 themes, any framework.
- **Untitled UI React** — https://www.untitledui.com/react — free tier (browsable) +
  paid. Figma-matched, polished neutral product UI.
- Headless (style everything yourself): **Radix UI** https://www.radix-ui.com (MIT) ·
  **Base UI** https://base-ui.com (MIT) · **React Aria** https://react-spectrum.adobe.com/react-aria (Apache-2.0).

## shadcn blocks & registries (sections + marketplaces)

- **Tailark** — https://tailark.com — freemium. Marketing blocks on shadcn.
- **Origin UI** — https://originui.com — MIT. 500+ components/blocks, restrained/neutral.
- **Kokonut UI** — https://kokonutui.com — freemium. Hero, pricing, auth, dashboard sections.
- **21st.dev** — https://21st.dev — freemium, browsable. Big community shadcn marketplace (filter hard — don't grab by "popular").
- **shadcnblocks** — https://www.shadcnblocks.com — freemium. 1,500+ blocks/templates (React/Next/Astro/Vue/Svelte).
- **Shadcn Studio** — https://shadcnstudio.com — freemium. Components, blocks, templates.
- **ReUI** — https://reui.io — MIT. 900+ shadcn patterns, app-oriented.
- **Kibo UI** — https://www.kibo-ui.com — free. Fills shadcn gaps (kanban, gantt, editors).

## Animated / motion (use sparingly — one considered moment beats motion everywhere)

- **Aceternity UI** — https://ui.aceternity.com — free core + Pro. Motion-rich landing components; installs via shadcn CLI.
- **Magic UI** — https://magicui.design — MIT + Pro. 150+ animated components, pairs with shadcn.
- **Motion Primitives** — https://motion-primitives.com — free + premium. Tasteful interaction primitives.
- **React Bits** — https://www.reactbits.dev — **MIT + Commons Clause** (usable in a product, not resellable). Text animations, backgrounds, creative bits.
- **Cult UI** — https://www.cult-ui.com — MIT. Refined animated components.
- **Animate UI** — https://animate-ui.com — free. Motion-first shadcn components.

## Number displays

- **NumberFlow** — https://number-flow.barvian.me (npm `@number-flow/react`) — MIT.
  Animated number with correct first paint (server-renders the real value) and
  reduced-motion on by default. Best for a hero figure / KPI count.
- **Magic UI Number Ticker** — https://magicui.design/docs/components/number-ticker — MIT (counts up from 0).
- **Motion Primitives Animated/Sliding Number** — https://motion-primitives.com — MIT.

## Dashboard / app / data

- **Tremor** — https://tremor.so — free. Dashboard blocks, KPI cards, charts (React).
- **shadcn/ui charts** — https://ui.shadcn.com/charts — MIT, Recharts-based, themable.
- **AlignUI** — https://www.alignui.com — free + paid. Polished dashboard components (Figma-matched).
- **TanStack Table** — https://tanstack.com/table — MIT. Headless table logic; pair with shadcn table markup.
- **Recharts** https://recharts.org · **visx** https://airbnb.io/visx · **Nivo** https://nivo.rocks — all MIT, for charts.

## Icons (pick one family, match stroke to your type)

- **Lucide** — https://lucide.dev — ISC. ~1,600, the shadcn default.
- **Tabler** — https://tabler.io/icons — MIT. 5,900+ in one stroke language (dashboards).
- **Phosphor** — https://phosphoricons.com — MIT. 9,000+, 6 weights.
- **Heroicons** — https://heroicons.com — MIT. Tailwind team; outline/solid/mini.
- **Iconoir** — https://iconoir.com — MIT. Light, airy.
- **Material Symbols** — https://fonts.google.com/icons — Apache-2.0, variable.
- **Simple Icons** — https://simpleicons.org — CC0. Brand logos ("sign in with…").
- **Hugeicons** — https://hugeicons.com — free tier + Pro. 40k+.

## Fonts

- **Fontshare** — https://www.fontshare.com — free commercial. Satoshi, General Sans,
  Switzer, Clash Display, Cabinet Grotesk.
- **Google Fonts** — https://fonts.google.com — free/open. Inter, Geist, Space Grotesk,
  IBM Plex, Instrument Serif, Fraunces, Sora, Manrope.
- **Typewolf** — https://www.typewolf.com — pairing reference (not a font host).
