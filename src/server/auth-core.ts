// The access decision for owner pages and actions (Phase 0 §5–§7), kept pure so it can be
// tested without Next.js or a database. auth.ts wires it to the session and memberships.

export type Role = "owner" | "staff"
export type Membership = { role: Role; status: "active" | "invited" | "removed" }
export type Need = "member" | "owner"

export type AccessDeps = {
  getUserId: () => Promise<string | null>
  getMembership: (userId: string, businessId: string) => Promise<Membership | null>
}

export type Access = { kind: "ok"; userId: string; role: Role } | { kind: "sign-in" } | { kind: "not-found" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Signed out → sign in. Not an active member (or not the owner, when owner work) → not found. */
export async function checkAccess(deps: AccessDeps, businessId: string, need: Need): Promise<Access> {
  const userId = await deps.getUserId()
  if (!userId) return { kind: "sign-in" }
  if (!UUID.test(businessId)) return { kind: "not-found" }
  const m = await deps.getMembership(userId, businessId)
  if (!m || m.status !== "active") return { kind: "not-found" }
  if (need === "owner" && m.role !== "owner") return { kind: "not-found" }
  return { kind: "ok", userId, role: m.role }
}
