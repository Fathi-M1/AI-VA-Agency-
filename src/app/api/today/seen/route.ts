// Records that the owner has seen Today (businesses.last_seen_at). Sent when the owner
// leaves the screen, so "since your last visit" stays the same while they're on it.
import { db } from "@/server/db/client"
import { getCurrentBusinessId } from "@/server/tenant"

export async function POST() {
  const businessId = await getCurrentBusinessId()
  const { error } = await db().from("businesses").update({ last_seen_at: new Date().toISOString() }).eq("id", businessId)
  if (error) console.error("[today/seen]", error.message)
  return new Response(null, { status: 204 })
}
