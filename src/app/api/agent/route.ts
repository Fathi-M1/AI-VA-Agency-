// The one server-side entry point for the agents. Keys stay on the server.
import { handleMessage } from "@/server/agent/orchestrator"
import { getCurrentBusinessId, listBusinesses } from "@/server/tenant"

export async function POST(request: Request) {
  // EMERGENCY HOTFIX: off in production until Phase 0 (it uses the service-role key
  // and outside services for any caller).
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 })
  const body = (await request.json().catch(() => null)) as {
    sessionId?: unknown
    message?: unknown
    channel?: unknown
    businessId?: unknown
  } | null
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 100) : ""
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : ""
  const channel = body?.channel === "voice" ? "voice" : "chat"
  if (!sessionId || !message) {
    return Response.json({ error: "sessionId and message are required" }, { status: 400 })
  }

  try {
    // The playground may pick any business (dev tool); otherwise the current business.
    const picked = typeof body?.businessId === "string" ? body.businessId : null
    const businessId =
      picked && (await listBusinesses()).some((b) => b.id === picked) ? picked : await getCurrentBusinessId()
    const events = await handleMessage(businessId, sessionId, message, channel)
    return Response.json({ events })
  } catch (err) {
    // Log the error message only (no request headers, so no keys).
    console.error("[agent]", err instanceof Error ? err.message : "unknown error")
    return Response.json({
      events: [{ kind: "error", text: "Sorry, something went wrong on our side. Please try again." }],
    })
  }
}
