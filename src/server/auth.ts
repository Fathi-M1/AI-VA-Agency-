// Who is signed in, and which businesses they may open (Phase 0 §5–§7).
// Every owner page and server action calls requireMember / requireOwner with the
// business id from the URL; the decision itself is in auth-core.ts. Reads use the
// user's session, so row-level security applies to these queries too.
import { cache } from "react"
import { notFound, redirect } from "next/navigation"

import { checkAccess, type Membership, type Need, type Role } from "./auth-core"
import { signInPath } from "./auth-gate"
import { db } from "./db/client"

export type { Role } from "./auth-core"

/** The signed-in user's id (verified session), or null. Once per request. */
export const getUserId = cache(async (): Promise<string | null> => {
  const { data } = await db().auth.getClaims()
  return data?.claims?.sub ?? null
})

async function getMembership(userId: string, businessId: string): Promise<Membership | null> {
  const { data, error } = await db()
    .from("memberships")
    .select("role, status")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .maybeSingle()
  if (error) throw new Error(`DB membership check failed: ${error.message}`)
  return (data as Membership | null) ?? null
}

const guard = cache(async (businessId: string, need: Need): Promise<{ userId: string; role: Role }> => {
  const access = await checkAccess({ getUserId, getMembership }, businessId, need)
  if (access.kind === "sign-in") redirect(signInPath(`/app/${businessId}/today`, ""))
  if (access.kind === "not-found") notFound()
  return { userId: access.userId, role: access.role }
})

/** The signed-in user is an active member of this business, or the page doesn't exist. */
export const requireMember = (businessId: string) => guard(businessId, "member")

/** Owner-only work (business settings, team, agents). Staff get "not found". */
export const requireOwner = (businessId: string) => guard(businessId, "owner")

/** Signed in, or off to /sign-in (pages under /app that aren't one business). */
export async function requireUser(next: string): Promise<string> {
  const userId = await getUserId()
  if (!userId) redirect(signInPath(next, ""))
  return userId
}

export type MyBusiness = { id: string; name: string; role: Role }

/** The businesses the signed-in user is an active member of (picker, account menu). */
export const myBusinesses = cache(async (): Promise<MyBusiness[]> => {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await db()
    .from("memberships")
    .select("role, businesses(id, name)")
    .eq("user_id", userId)
    .eq("status", "active")
  if (error) throw new Error(`DB list memberships failed: ${error.message}`)
  return (data ?? [])
    .map((m) => {
      const b = m.businesses as unknown as { id: string; name: string } | null
      return b ? { id: b.id, name: b.name, role: m.role as Role } : null
    })
    .filter((b): b is MyBusiness => b !== null)
    .sort((x, y) => x.name.localeCompare(y.name))
})

/** Builder flag (the builder console at /console). Owners never have it. */
export async function isBuilder(): Promise<boolean> {
  const userId = await getUserId()
  if (!userId) return false
  const { data } = await db().from("users").select("is_builder").eq("id", userId).maybeSingle()
  return data?.is_builder === true
}
