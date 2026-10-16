// .env.example must list every environment variable the code reads, with no values.
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|mjs|js)$/.test(f) ? [p] : []
  })
}

const used = new Set<string>()
for (const f of [...files("src"), ...files("tests"), "next.config.ts"]) {
  for (const m of readFileSync(f, "utf8").matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) used.add(m[1])
}
used.delete("NODE_ENV") // set by Next.js, not by us
used.delete("NEXT_RUNTIME")

test(".env.example lists every variable the code reads", () => {
  const example = readFileSync(".env.example", "utf8")
  const listed = new Set([...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]))
  const missing = [...used].filter((v) => !listed.has(v))
  assert.deepEqual(missing, [], `missing from .env.example: ${missing.join(", ")}`)
})

test(".env.example has no values and a comment for each variable", () => {
  const lines = readFileSync(".env.example", "utf8").split(/\r?\n/)
  lines.forEach((line, i) => {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    if (!m) return
    assert.equal(m[2].trim(), "", `${m[1]} must not have a value`)
    assert.match(lines[i - 1] ?? "", /^#\s*\S/, `${m[1]} needs a one-line comment above it`)
  })
})
