// Phase 0 §7: owner pages use the signed-in user's session (row-level security applies);
// the service-role key is used only inside an explicit asServiceRole(...) block.
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

process.env.SUPABASE_URL = "http://127.0.0.1:54321"
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"

const { asServiceRole, db } = await import("../src/server/db/client.ts")

const keyOf = (client: unknown) => (client as { supabaseKey: string }).supabaseKey

test("db() is the user's session client (publishable key) by default", () => {
  assert.equal(keyOf(db()), "test-publishable-key")
})

test("db() is the service-role client only inside asServiceRole", async () => {
  const inside = await asServiceRole("agent run", async () => keyOf(db()))
  assert.equal(inside, "test-service-role-key")
  assert.equal(keyOf(db()), "test-publishable-key", "back to the session client afterwards")
})

test("the service role doesn't leak into work started after the block", async () => {
  let later: Promise<string> | null = null
  await asServiceRole("agent run", async () => {
    later = Promise.resolve().then(() => keyOf(db())) // still inside: allowed
  })
  assert.equal(await later, "test-service-role-key")
  assert.equal(keyOf(db()), "test-publishable-key")
})

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : []
  })
}

// Every place that may use the service role, and why (listed in the final report).
const SERVICE_ROLE_ALLOWED = new Set([
  "src/app/api/book/[slug]/ask/route.ts", // agent run answering a customer of ONE business (by booking link)
  "src/app/api/agent/route.ts", // builder console agent run (builder flag checked first)
])

test("only the allow-listed entry points use asServiceRole, and nothing else reads the service key", () => {
  const callers: string[] = []
  const keyReaders: string[] = []
  for (const f of files("src")) {
    const src = readFileSync(f, "utf8")
    const rel = f.replaceAll("\\", "/")
    if (rel !== "src/server/db/client.ts" && /asServiceRole\(/.test(src)) callers.push(rel)
    if (rel !== "src/server/db/client.ts" && /SUPABASE_SERVICE_ROLE_KEY/.test(src)) keyReaders.push(rel)
  }
  assert.deepEqual(callers.filter((c) => !SERVICE_ROLE_ALLOWED.has(c)), [], "unexpected service-role use")
  assert.deepEqual(keyReaders, [], "only src/server/db/client.ts may read the service-role key")
})
