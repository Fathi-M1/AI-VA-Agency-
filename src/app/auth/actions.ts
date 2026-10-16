"use server"

// Google sign-in and sign-out (Phase 0 §4). Supabase Auth with the Google provider; the
// session lives in cookies set by @supabase/ssr. Google returns to /auth/callback.
// Docs: https://supabase.com/docs/guides/auth/social-login/auth-google (signInWithOAuth, PKCE)
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { safeNext } from "@/server/auth-gate"
import { sessionClient } from "@/server/db/client"

/** "Continue with Google": off to Google, then back to the page they wanted. */
export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("next")?.toString())
  const h = await headers()
  // Supabase only accepts redirect URLs on its allow-list (localhost + production).
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`
  const { data, error } = await sessionClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  })
  if (error || !data.url) redirect("/sign-in?error=failed")
  redirect(data.url)
}

/** Sign out (account menu) and go back to the website. */
export async function signOut() {
  await sessionClient().auth.signOut()
  redirect("/")
}
