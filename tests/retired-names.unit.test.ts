// Phase 0 §8: the retired names "contacts/contact" (→ customers) and "escalation(s)"
// (→ Needs you / needs_you_items) appear nowhere in code, types, UI text, agent prompts
// or business type packs.
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

function files(dir: string, exts: RegExp): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p, exts) : exts.test(f) ? [p] : []
  })
}

const SOURCES = [...files("src", /\.(ts|tsx|css)$/), ...files("verticals", /\.(json|md)$/)]

// Allowed on purpose (each explained):
const ALLOWED = [
  // The setup assistant's prompt must name the word to forbid the model from using it.
  /Never use these words:.*escalation/,
  // The blueprint's own business field "public contact" (a phone number or Messenger link).
  /public[_-]contact|publicContact/,
  // "contact" as a verb in customer-facing copy ("contact the business directly").
  /contact (the|us|\{business\}|\{store\.name\}) /i,
]

const RETIRED = [/escalat/i, /\bcontacts?\b/i, /contact_?id/i, /\bContact[A-Z]\w*/]

test("no retired names in src/ or verticals/", () => {
  const hits: string[] = []
  for (const f of SOURCES) {
    readFileSync(f, "utf8")
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (ALLOWED.some((a) => a.test(line))) return
        if (RETIRED.some((r) => r.test(line))) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 120)}`)
      })
  }
  assert.deepEqual(hits, [], `retired names found:\n${hits.join("\n")}`)
})

test("no file or folder is named after a retired name", () => {
  const bad = [...files("src", /./)].filter((f) => /escalat|contact/i.test(f.replace(/public-contact/g, "")))
  assert.deepEqual(bad, [])
})
