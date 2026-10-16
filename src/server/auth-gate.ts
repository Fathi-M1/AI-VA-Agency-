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

const OWNER_PAGES = ["today", "dashboard", "conversations", "needs-you", "agents", "calendar", "customers", "settings"]

/** A page inside a business that an old link (/today, /settings, …) may ask for, or null. */
export function ownerPage(page: string | null | undefined): string | null {
  return page && OWNER_PAGES.includes(page) ? page : null
}

/** Where /app sends a signed-in user (Phase 0 §5): onboarding, their one business, or the picker. */
export function entryTarget(businesses: { id: string }[], page: string | null): string {
  if (businesses.length === 0) return "/app/onboarding"
  if (businesses.length === 1) return `/app/${businesses[0].id}/${page ?? "today"}`
  return page ? `/app/businesses?to=${page}` : "/app/businesses"
}
