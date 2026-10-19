// Runs before owner pages (/app/...) and the builder console (/console): refreshes the
// Supabase sign-in session cookie and sends signed-out visitors to /sign-in (Phase 0 §4).
// This is only the quick check; every owner page and action still checks membership itself.
// Everything else (the website, /sign-in, the booking pages) is public and never reaches here.
// Docs: https://supabase.com/docs/guides/auth/server-side/nextjs (@supabase/ssr in proxy)
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { signInPath } from "@/server/auth-gate"

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  let signedIn = false
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list, headers) => {
          for (const { name, value } of list) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of list) response.cookies.set(name, value, options)
          for (const [k, v] of Object.entries(headers)) response.headers.set(k, v)
        },
      },
    })
    // Verifies the session (and refreshes it when it's about to expire).
    const { data } = await supabase.auth.getClaims()
    signedIn = Boolean(data?.claims?.sub)
  }
  // Fails closed: without the Supabase settings nobody counts as signed in.
  if (!signedIn) {
    return NextResponse.redirect(new URL(signInPath(request.nextUrl.pathname, request.nextUrl.search), request.url))
  }
  return response
}

export const config = {
  // Only the pages that need a signed-in user. Membership is still re-checked on every
  // owner page and action; this just refreshes the session and bounces signed-out visitors.
  matcher: ["/app/:path*", "/console/:path*"],
}
