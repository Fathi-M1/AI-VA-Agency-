// Google sends the owner back here after sign-in (or after they cancel).
// Exchanges the one-time code for a session cookie, then goes to the page they wanted.
import { NextResponse } from "next/server"

import { callbackStep } from "@/server/auth-gate"
import { sessionClient } from "@/server/db/client"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const step = callbackStep(url.searchParams)
  if ("redirect" in step) return NextResponse.redirect(new URL(step.redirect, url.origin))
  const { error } = await sessionClient().auth.exchangeCodeForSession(step.exchange)
  if (error) {
    console.error("[auth/callback] exchange failed:", error.message)
    return NextResponse.redirect(new URL("/sign-in?error=failed", url.origin))
  }
  return NextResponse.redirect(new URL(step.next, url.origin))
}
