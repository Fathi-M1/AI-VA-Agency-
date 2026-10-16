// Every Supabase query in the app (`.from("t").select("…").eq("col", …)…`) names tables,
// columns and embedded relations that exist in the migrated schema. Catches leftovers
// such as an old column name before they reach production (PostgREST can't run locally).
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { after, before, test } from "node:test"
import type { PGlite } from "@electric-sql/pglite"

import { seededWorld } from "./harness.ts"

let db: PGlite
let columns: Map<string, Set<string>>
let functions: Set<string>
before(async () => {
  db = await seededWorld()
  const r = await db.query<{ table_name: string; column_name: string }>(
    "select table_name, column_name from information_schema.columns where table_schema = 'public'"
  )
  columns = new Map()
  for (const row of r.rows) {
    if (!columns.has(row.table_name)) columns.set(row.table_name, new Set())
    columns.get(row.table_name)!.add(row.column_name)
  }
  const f = await db.query<{ proname: string }>("select proname from pg_proc where pronamespace = 'public'::regnamespace")
  functions = new Set(f.rows.map((x) => x.proname))
})
after(async () => {
  await db.close()
})

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : []
  })
}

/** Splits "a, b(c, d), e" at top-level commas. */
function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ""
  for (const ch of s) {
    if (ch === "(") depth++
    if (ch === ")") depth--
    if (ch === "," && depth === 0) {
      out.push(cur.trim())
      cur = ""
    } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

function checkSelect(table: string, cols: string, where: string, problems: string[]) {
  const known = columns.get(table)
  if (!known) return problems.push(`${where}: unknown table "${table}"`)
  for (const part of splitTop(cols)) {
    const embed = part.match(/^(?:\w+:)?(\w+)(?:!\w+)?\(([\s\S]*)\)$/)
    if (embed) {
      checkSelect(embed[1], embed[2], where, problems)
      continue
    }
    const col = part.replace(/^\w+:/, "").trim()
    if (col === "*" || col === "") continue
    if (!known.has(col)) problems.push(`${where}: "${table}" has no column "${col}"`)
  }
}

test("every query names real tables, columns and relations", () => {
  const problems: string[] = []
  for (const f of files("src")) {
    const src = readFileSync(f, "utf8")
    // a chain starting at .from("table") up to the end of the statement
    for (const m of src.matchAll(/\.from\("(\w+)"\)([\s\S]*?)(?=\n\s*\n|\n\s*(?:const|let|if|return|await|for|\}|\)\s*$)|db\(\)|\.from\()/g)) {
      const [, table, chain] = m
      const line = src.slice(0, m.index).split("\n").length
      const where = `${f}:${line}`
      const sel = chain.match(/\.select\(\s*"([^"]*)"/) ?? chain.match(/\.select\(\s*`([^`$]*)`/)
      if (sel) checkSelect(table, sel[1], where, problems)
      for (const filter of chain.matchAll(/\.(?:eq|neq|in|gte|gt|lte|lt|is|not|order|ilike)\(\s*"(\w+)"/g)) {
        if (!columns.get(table)?.has(filter[1])) problems.push(`${where}: filter on "${table}.${filter[1]}" (no such column)`)
      }
      for (const upd of chain.matchAll(/\.(?:update|insert|upsert)\(\{\s*([^}]*)\}/g)) {
        for (const key of upd[1].matchAll(/(?:^|,)\s*(\w+)\s*:/g)) {
          if (!columns.get(table)?.has(key[1])) problems.push(`${where}: writes "${table}.${key[1]}" (no such column)`)
        }
      }
    }
    for (const rpc of src.matchAll(/\.rpc\("(\w+)"/g)) {
      if (!functions.has(rpc[1])) problems.push(`${f}: calls unknown function ${rpc[1]}()`)
    }
  }
  assert.deepEqual(problems, [], problems.join("\n"))
})
