// EMERGENCY HOTFIX (temporary, replaced by Phase 0 sign-in): every request except the
// landing page "/" and static assets needs the site-lock username and password.
// Covers owner pages, /book, /setup, /switch, /playground, every /api route, and
// server actions (they are POSTs to page paths, so they pass through here too).
import { NextResponse, type NextRequest } from "next/server"

import { asksForPassword, hasValidCredentials, isPublicRequest } from "@/server/site-lock"

export function proxy(request: NextRequest) {
  if (isPublicRequest(request.nextUrl.pathname, request.method, request.headers.get("next-action"))) return NextResponse.next()
  if (hasValidCredentials(request.headers.get("authorization"), process.env.SITE_LOCK_USER, process.env.SITE_LOCK_PASSWORD)) {
    return NextResponse.next()
  }
  // The password box only for a real page visit, never for background loads (asksForPassword).
  const headers: Record<string, string> = { "Cache-Control": "no-store" }
  if (asksForPassword(request.headers)) headers["WWW-Authenticate"] = 'Basic realm="AI VA Agency", charset="UTF-8"'
  return new NextResponse("Authentication required.", { status: 401, headers })
}

export const config = {
  // Everything except Next's static files, image optimizer, the favicon, and the
  // landing page's own images (all public, no data).
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico|landing/).*)"],
}
