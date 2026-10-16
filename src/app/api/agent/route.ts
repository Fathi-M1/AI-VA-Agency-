// The builder console's agent endpoint. Keys stay on the server.
// Only builders (users.is_builder), and only for a business they're a member of; then the
// agent run uses the service role (it writes conversations and messages for that business).
import { handleMessage } from "@/server/agent/orchestrator"
import { isBuilder, requireMember } from "@/server/auth"
import { asServiceRole } from "@/server/db/client"

export async function POST(request: Request) {
  if (!(await isBuilder())) return new Response("Not found", { status: 404 })
  const body = (await request.json().catch(() => null)) as {
    sessionId?: unknown
    message?: unknown
    channel?: unknown
    businessId?: unknown
  } | null
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 100) : ""
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : ""
  const businessId = typeof body?.businessId === "string" ? body.businessId : ""
  const channel = body?.channel === "voice" ? "voice" : "chat"
  if (!sessionId || !message || !businessId) {
    return Response.json({ error: "sessionId, businessId and message are required" }, { status: 400 })
  }
  await requireMember(businessId)

  try {
    const events = await asServiceRole("builder console agent run", () => handleMessage(businessId, sessionId, message, channel))
    return Response.json({ events })
  } catch (err) {
    // Log the error message only (no request headers, so no keys).
    console.error("[agent]", err instanceof Error ? err.message : "unknown error")
    return Response.json({
      events: [{ kind: "error", text: "Sorry, something went wrong on our side. Please try again." }],
    })
  }
}
