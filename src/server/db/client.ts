// Supabase client, server-side only (service role key bypasses RLS, so it must never
// reach the browser). @supabase/supabase-js v2: createClient(url, key, options).
// Docs: https://supabase.com/docs/reference/javascript/initializing
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set")
    client = createClient(url, key, {
      // A server process has no user session to keep or refresh.
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }
  return client
}
