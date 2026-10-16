// Records that the owner has seen Today (businesses.last_seen_at). Sent when the owner
// leaves the screen, so "since your last visit" stays the same while they're on it.
// Members only; the update runs as the signed-in user, so row-level security applies.
import { requireMember } from "@/server/auth"
import { db } from "@/server/db/client"

export async function POST(_request: Request, { params }: RouteContext<"/app/[businessId]/today/seen">) {
  const { businessId } = await params
  await requireMember(businessId)
  const { error } = await db().from("businesses").update({ last_seen_at: new Date().toISOString() }).eq("id", businessId)
  if (error) console.error("[today/seen]", error.message)
  return new Response(null, { status: 204 })
}
