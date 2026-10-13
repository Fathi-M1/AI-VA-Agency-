---
name: premium-ui-design
description: >-
  Build any UI — wireframes, mockups, landing pages, dashboards, components, full
  frontends — by SEARCHING real, no-login premium component libraries and USING what
  you find. Never generate UI from scratch. Use this whenever a task involves
  designing or building a user-facing screen or component, or when asked to make
  something look good / premium / not generic / not AI-slop. Works with any coding
  agent (Claude Code, Cursor, Codex).
---

# Premium UI — search real components, never invent them

**One job:** when you build any UI, you get its components by **searching the
no-login sites in `references/component-sources.md` and using what you find.** You do
not design components from scratch.

That constraint *is* the anti-slop mechanism. "AI slop" is what happens when the model
assumes and hand-rolls generic UI — the purple gradient, the three identical cards,
the cheap default look. Using real, human-made, premium components from real sites
removes slop by construction. There is nothing else to this skill.

## The rules — there is no other path

1. **Search first, every time.** For every element you need (nav, hero, pricing,
   dashboard shell, table, form, calendar, chat, buttons, number displays, …), open
   the relevant sites in the catalog and find a real component that fits.
2. **Use real components. Never build your own.** Do not hand-write CSS/markup to fake
   a component. No "clean" div standing in for a real part. There is no fallback.
3. **If you can't find one, STOP and say it out loud.** Tell the user plainly:
   *"I couldn't find a good component for X on the catalog sites — please search
   manually or point me to one."* Not finding it is a result to report, **never** a
   licence to invent one.
4. **The sites don't need a login.** They render the component code on the page —
   browse/read/copy it, or install via the noted method. "It needs a login" is almost
   always wrong; actually try before you claim it.
5. **Adapt to fit — don't rebuild.** Match the component to the product's direction
   (its colour, type, spacing). Adapting a real component ≠ hand-building a fake one.
6. **Report what you used.** For every component: name + exact source URL + licence.
   This is how the user confirms you searched-and-used instead of hand-rolling.
7. **Verify the licence at the source.** MIT / Apache / ISC = safe. Flag anything
   paid, attribution-required, or Commons-Clause (e.g. React Bits is MIT + Commons
   Clause). Don't trust a secondhand licence note.

## How to fetch (any agent)

- **Browse/read the source page** — the code is on the page; copy it. Or
- **Install via the library's path** — most install with `npx shadcn@latest add <url>`,
  a copy-paste block, or npm (the catalog notes which). Or
- **Use a registry/MCP** if your agent has one — but the design direction picks the
  component, never the marketplace's "most popular" ordering.

## Substrate

Real premium components are React/Tailwind (shadcn, React Bits, Aceternity, Magic UI,
…). They cannot be installed into static HTML — so if you're asked for "premium" in
static HTML, say so and move to a React/Tailwind/shadcn project. Don't hand-roll CSS
and call it premium.

## The catalog

`references/component-sources.md` — every source is browsable and usable **without a
login**, indexed by need. Start there for every element.

## Installing this skill

- **Claude Code / Claude apps:** drop the `premium-ui-design/` folder into your skills
  directory (or install the packaged `.skill`).
- **Cursor / Windsurf:** add `SKILL.md` as a project rule; keep `references/` in the repo.
- **Codex / others:** point the agent at `SKILL.md`; it's plain markdown, no special tooling.
