// Public booking page chat: the business comes from the booking link, never from the
// client. Conversation channel "web". Keys stay on the server.
import { handleMessage } from "@/server/agent/orchestrator"
import { greetingFor } from "@/lib/booking-copy"
import { getBusinessBySlug } from "@/server/db/business-profile"
import { asServiceRole } from "@/server/db/client"

async function handle(request: Request, { params }: RouteContext<"/api/book/[slug]">) {
  const { slug } = await params
  const body = (await request.json().catch(() => null)) as {
    sessionId?: unknown
    message?: unknown
    clientMessageId?: unknown
    consentAt?: unknown
  } | null
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 100) : ""
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : ""
  const clientMessageId = typeof body?.clientMessageId === "string" ? body.clientMessageId.slice(0, 100) : undefined
  const consentAt =
    typeof body?.consentAt === "string" && !Number.isNaN(Date.parse(body.consentAt)) ? new Date(body.consentAt).toISOString() : null
  if (!sessionId || !message) return Response.json({ error: "sessionId and message are required" }, { status: 400 })

  try {
    const business = await getBusinessBySlug(slug)
    if (!business) return Response.json({ error: "not_found" }, { status: 404 })
    const events = await handleMessage(business.id, sessionId, message, "web", {
      greeting: greetingFor(business.name),
      consentAt,
      clientMessageId,
    })
    return Response.json({ events })
  } catch (err) {
    console.error("[book]", err instanceof Error ? err.message : "unknown error")
    return Response.json({ error: "failed" }, { status: 500 })
  }
}

// The agent writes this business's conversation, so it runs with the service role; the
// business comes only from the booking link (never from the request body).
export function POST(request: Request, ctx: RouteContext<"/api/book/[slug]">) {
  return asServiceRole("customer chat agent run (one business, by booking link)", () => handle(request, ctx))
}
