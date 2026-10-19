// Design-system guardrail (docs/DESIGN-SYSTEM.md). It ratchets: the known inconsistencies
// may only go DOWN, never up. As each stage migrates surfaces to the system, lower the
// budgets. A new stray radius / bespoke elevation / divergent CTA fails the test, so
// inconsistency can't creep back in.
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

// Off-scale corner radii (allowed scale: rounded-lg/2xl/full + the radius token).
const strayRadii = (src.match(/rounded-\[[^\]]+\]/g) ?? []).filter((m) => !m.includes("var(--radius")).length
// Bespoke ELEVATION (drop shadows). Token shadows and pure-inset highlights are allowed.
const bespokeElevation = (src.match(/shadow-\[[^\]]+\]/g) ?? [])
  .filter((m) => !m.includes("var(--elevate"))
  .filter((m) => {
    const layers = m.slice(8, -1).split(/,(?![^(]*\))/)
    return !layers.every((l) => l.includes("inset")) // every layer inset = decorative, allowed
  }).length
// Divergent primary CTAs still to route through the one pill (brandCls + PillButton +
// raw green gradients). Owner recipes primaryBtn/secondaryBtn are the system, not counted.
const divergentCTAs = (src.match(/brandCls|PillButton|bg-\[linear-gradient\(135deg/g) ?? []).length

// Budgets = the count after Stage B. Only ever lower these (Stage C storefront, Stage D onboarding).
const BUDGET = { strayRadii: 7, bespokeElevation: 16, divergentCTAs: 22 }

test("off-scale corner radii only go down (use rounded-lg/2xl/full)", () => {
  assert.ok(strayRadii <= BUDGET.strayRadii, `stray radii ${strayRadii} > ${BUDGET.strayRadii}`)
})
test("bespoke elevation only goes down (use shadow-[var(--elevate-*)])", () => {
  assert.ok(bespokeElevation <= BUDGET.bespokeElevation, `bespoke elevation ${bespokeElevation} > ${BUDGET.bespokeElevation}`)
})
test("divergent primary CTAs only go down (use the one pill)", () => {
  assert.ok(divergentCTAs <= BUDGET.divergentCTAs, `divergent CTAs ${divergentCTAs} > ${BUDGET.divergentCTAs}`)
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
  assert.match(dark, /--primary: oklch\(0\.[0-9]+ 0\.1[0-9] 15[0-9]\)/, "dark --primary should be a green (hue ~150-159)")
})
