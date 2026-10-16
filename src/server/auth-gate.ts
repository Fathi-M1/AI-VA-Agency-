// Which paths need a signed-in user, and where sign-in sends them back to (Phase 0 §4).
// Pure, so proxy.ts, the sign-in page and the callback all agree.

/** Owner pages (/app/...) and the builder console need a session. */
export function needsSignIn(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/") || pathname === "/console" || pathname.startsWith("/console/")
}

/** /sign-in, remembering the page they wanted. */
export function signInPath(pathname: string, search: string): string {
  return `/sign-in?next=${encodeURIComponent(pathname + search)}`
}

/** Where to go after sign-in: only a page inside this app, never another site. */
export function safeNext(next: string | null | undefined): string {
  if (!next || next.includes("\\") || next.startsWith("//")) return "/app"
  return needsSignIn(next.split(/[?#]/)[0]) ? next : "/app"
}

export type CallbackStep = { redirect: string } | { exchange: string; next: string }

/** What /auth/callback does with Google's answer (blueprint F1 edge cases). */
export function callbackStep(params: URLSearchParams): CallbackStep {
  const error = params.get("error")
  if (error === "access_denied") return { redirect: "/?signin=cancelled" }
  const code = params.get("code")
  if (error || !code) return { redirect: "/sign-in?error=failed" }
  return { exchange: code, next: safeNext(params.get("next")) }
}
