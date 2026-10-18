// Phase 0 §12 security suite — the gate. Where each test lives:
//  1 signed-out → /sign-in ............ tests/auth-gate.unit.test.ts + tests/security.http.test.mjs
//  2 A can't read/change B's rows ..... tests/db/rls.db.test.ts (every table with business_id)
//  3 A can't open B's pages by URL .... tests/auth-guards.unit.test.ts + "every owner page…" below
//  4 owner actions reject non-members . tests/auth-guards.unit.test.ts + "every owner action…" below
//  5 ticket by token only ............. tests/db/public-functions.db.test.ts, tests/db/ticket-mapping.db.test.ts
//  6 storefront + booking, anonymous .. tests/db/public-functions.db.test.ts, tests/db/storefront-mapping.db.test.ts
//  7 no service key in the browser .... tests/bundle.build.test.mjs (after `next build`)
//  8 staff can't edit settings/agents . tests/db/rls.db.test.ts, tests/db/agents.db.test.ts + "settings is owner-only" below
//  9 sign-in → Home → sign-out journey  skipped below until the owner's Google setup is done
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import ts from "typescript"

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : [p]
  })
}

const BUSINESS = "src/app/app/[businessId]"
const GUARD = /await require(Member|Owner)\(businessId\)/

test("3: every owner page, layout and route under /app/[businessId] checks membership itself", () => {
  const missing: string[] = []
  for (const f of files(BUSINESS)) {
    const rel = f.replaceAll("\\", "/")
    if (!/\/(page|layout)\.tsx$|\/route\.ts$/.test(rel)) continue
    if (rel === `${BUSINESS}/page.tsx`) continue // only redirects to Today, which checks
    if (!GUARD.test(readFileSync(f, "utf8"))) missing.push(rel)
  }
  assert.deepEqual(missing, [])
})

test("4: every owner server action checks membership before doing anything", () => {
  const bad: string[] = []
  let actions = 0
  for (const f of files("src/app/app")) {
    const src = readFileSync(f, "utf8")
    if (!src.startsWith('"use server"')) continue
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true)
    for (const node of sf.statements) {
      if (!ts.isFunctionDeclaration(node) || !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue
      actions++
      const first = node.body?.statements[0]?.getText(sf) ?? ""
      if (!/^await require(Member|Owner|User)\(/.test(first)) bad.push(`${f}: ${node.name?.text} starts with "${first.split("\n")[0]}"`)
    }
  }
  assert.ok(actions >= 6, `found only ${actions} owner actions`)
  assert.deepEqual(bad, [])
})

test("8: business settings are owner-only (page and save)", () => {
  assert.match(readFileSync(`${BUSINESS}/(shell)/settings/page.tsx`, "utf8"), /await requireOwner\(businessId\)/)
  assert.match(readFileSync(`${BUSINESS}/(shell)/settings/actions.ts`, "utf8"), /await requireOwner\(businessId\)/)
})

test("9: sign-in → Home → sign-out journey at 390px and 1280px", { skip: "needs the owner's Google OAuth setup (Google Cloud + Supabase provider); runs once that is done" }, () => {})
