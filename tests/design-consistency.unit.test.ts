// Design-system guardrail (docs/DESIGN-SYSTEM.md). It doesn't force a big-bang refactor;
// it RATCHETS: the known inconsistencies may only go down, never up. As Stage B/C/D migrate
// surfaces to the system, lower these budgets. A new stray radius/shadow/legacy button makes
// the test fail, so inconsistency can't creep back in.
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : []
  })
}
const src = files("src").map((f) => readFileSync(f, "utf8")).join("\n")
const count = (re: RegExp) => (src.match(re) ?? []).length

// Allowed: the 3-radius scale (rounded-lg / rounded-2xl / rounded-full) and the
// radius token min(var(--radius…)). A bare rounded-[Npx] is off-scale debt.
const strayRadii = (src.match(/rounded-\[[^\]]+\]/g) ?? []).filter((m) => !m.includes("var(--radius")).length
// Allowed: shadow-[var(--elevate-*)]. A literal shadow-[…] is bespoke-elevation debt.
const bespokeShadows = (src.match(/shadow-\[[^\]]+\]/g) ?? []).filter((m) => !m.includes("var(--elevate")).length
// Legacy primary/secondary CTA helpers to retire in favour of one Button.
const legacyButtons = count(/brandCls|primaryBtn|secondaryBtn|secondaryBtnCls/g)

// Budgets = the baseline when the system was codified (Stage A). Only ever lower these.
const BUDGET = { strayRadii: 36, bespokeShadows: 36, legacyButtons: 18 }

test("off-scale corner radii only go down (use rounded-lg/2xl/full)", () => {
  assert.ok(strayRadii <= BUDGET.strayRadii, `stray radii ${strayRadii} > budget ${BUDGET.strayRadii} — use the 3-step scale, or lower the budget if you removed some`)
})
test("bespoke shadows only go down (use shadow-[var(--elevate-*)])", () => {
  assert.ok(bespokeShadows <= BUDGET.bespokeShadows, `bespoke shadows ${bespokeShadows} > budget ${BUDGET.bespokeShadows} — use an elevation token`)
})
test("legacy button helpers only go down (use the one Button)", () => {
  assert.ok(legacyButtons <= BUDGET.legacyButtons, `legacy button helpers ${legacyButtons} > budget ${BUDGET.legacyButtons} — route through Button`)
})

test("elevation tokens exist in both themes", () => {
  const css = readFileSync("src/app/globals.css", "utf8")
  for (const t of ["--elevate-raised", "--elevate-overlay", "--elevate-hero"]) {
    assert.ok((css.match(new RegExp(t.replace(/[-]/g, "\\$&"), "g")) ?? []).length >= 2, `${t} must be defined for light and dark`)
  }
})

test("dark mode keeps the green brand (not the default grey/blue shadcn dark)", () => {
  const css = readFileSync("src/app/globals.css", "utf8")
  const dark = css.slice(css.indexOf(".dark {"))
  assert.match(dark, /--primary: oklch\(0\.[0-9]+ 0\.1[0-9] 15[0-9]\)/, "dark --primary should be a green (hue ~150-159), not grey")
})
