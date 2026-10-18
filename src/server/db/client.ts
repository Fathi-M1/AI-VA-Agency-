// Supabase clients, server-side only.
// db() is the signed-in user's session client (publishable key + their sign-in cookie),
// so row-level security decides what it can read and write; with no session it acts as
// an anonymous visitor, who can only call the public functions.
// The service-role key bypasses row-level security. It is used only inside
// asServiceRole(reason, fn), at the few entry points listed in
// tests/db-client.unit.test.ts (agent runs); it must never reach the browser.
// Docs: https://supabase.com/docs/guides/auth/server-side/nextjs (@supabase/ssr createServerClient)
import { AsyncLocalStorage } from "node:async_hooks"
import { createServerClient } from "@supabase/ssr"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const serviceScope = new AsyncLocalStorage<string>()
let service: SupabaseClient | null = null

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is not set`)
  return v
}

function serviceClient(): SupabaseClient {
  if (!service) {
    service = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      // A server process has no user session to keep or refresh.
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }
  return service
}

// Loaded on first use: the request's cookie store only exists inside a Next.js request.
const cookieStore = async () => (await import("next/headers")).cookies()

/** The request's cookies. Outside Next.js (unit tests) there are none, so the client is
 *  anonymous (least access). Inside Next.js, errors from cookies() must propagate: one of
 *  them is how Next.js learns a page depends on the request and must not be pre-rendered. */
async function readCookies() {
  let headers: typeof import("next/headers")
  try {
    headers = await import("next/headers")
  } catch {
    return []
  }
  return (await headers.cookies()).getAll()
}

/** The current user's session client (a new one per call: cheap, and never shared across requests). */
export function sessionClient(): SupabaseClient {
  return createServerClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    cookies: {
      getAll: readCookies,
      setAll: async (list) => {
        try {
          const store = await cookieStore()
          for (const { name, value, options } of list) store.set(name, value, options)
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  })
}

/** The database client for this request: the user's session, or the service role inside asServiceRole. */
export function db(): SupabaseClient {
  return serviceScope.getStore() ? serviceClient() : sessionClient()
}

/** Runs `fn` with the service role (bypasses row-level security). `reason` documents why. */
export function asServiceRole<T>(reason: string, fn: () => Promise<T>): Promise<T> {
  return serviceScope.run(reason, fn)
}
