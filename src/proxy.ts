// Runs before every request.
// 1. EMERGENCY HOTFIX (temporary, until the owner decides to remove it after Google sign-in
//    is set up): every request except the landing page "/" and static assets needs the
//    site-lock username and password. Covers server actions too (POSTs to page paths).
// 2. Owner pages (/app/...) and the builder console: refreshes the Supabase sign-in
//    session cookie and sends signed-out visitors to /sign-in (Phase 0 §4). This is only
//    the quick check; every owner page and action still checks membership itself.
//    Docs: https://supabase.com/docs/guides/auth/server-side/nextjs (@supabase/ssr in proxy)
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { needsSignIn, signInPath } from "@/server/auth-gate"
import { hasValidCredentials, isPublicRequest } from "@/server/site-lock"

function locked(request: NextRequest) {
  if (isPublicRequest(request.nextUrl.pathname, request.method, request.headers.get("next-action"))) return false
  return !hasValidCredentials(request.headers.get("authorization"), process.env.SITE_LOCK_USER, process.env.SITE_LOCK_PASSWORD)
}

async function ownerGate(request: NextRequest) {
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
    const to = new URL(signInPath(request.nextUrl.pathname, request.nextUrl.search), request.url)
    return NextResponse.redirect(to)
  }
  return response
}

export async function proxy(request: NextRequest) {
  if (locked(request)) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="AI VA Agency", charset="UTF-8"', "Cache-Control": "no-store" },
    })
  }
  if (needsSignIn(request.nextUrl.pathname)) return ownerGate(request)
  return NextResponse.next()
}

export const config = {
  // Everything except Next's static files, image optimizer, the favicon, and the
  // landing page's own images (all public, no data).
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico|landing/).*)"],
}
