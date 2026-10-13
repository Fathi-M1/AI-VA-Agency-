// EMERGENCY HOTFIX (temporary): HTTP Basic Auth in front of the whole site except the
// landing page and static assets. Phase 0's Google sign-in replaces this; delete the
// file, src/proxy.ts and the SITE_LOCK_* env vars then.
// Fails closed: if SITE_LOCK_USER / SITE_LOCK_PASSWORD are missing, nothing but "/"
// can be opened.
import { createHash, timingSafeEqual } from "node:crypto"

/** Requests anyone may make without the lock: reading the landing page "/" only.
 *  Server actions can be POSTed to ANY page path (the action id is in a header), so
 *  "/" is public for GET/HEAD and never for an action call. */
export function isPublicRequest(pathname: string, method: string, actionHeader: string | null) {
  return pathname === "/" && (method === "GET" || method === "HEAD") && !actionHeader
}

const digest = (s: string) => createHash("sha256").update(s).digest()

/** True when the Authorization header carries the configured user and password. */
export function hasValidCredentials(authorization: string | null, user: string | undefined, password: string | undefined) {
  if (!user || !password) return false // fail closed
  if (!authorization?.startsWith("Basic ")) return false
  let decoded: string
  try {
    decoded = atob(authorization.slice(6).trim())
  } catch {
    return false
  }
  const sep = decoded.indexOf(":")
  if (sep < 0) return false
  // Compare fixed-length digests so the check takes the same time either way.
  const userOk = timingSafeEqual(digest(decoded.slice(0, sep)), digest(user))
  const passOk = timingSafeEqual(digest(decoded.slice(sep + 1)), digest(password))
  return userOk && passOk
}
