// "Questions? Ask us" on the booking page: the Receptionist routes to Sales / Support,
// who answer only from this business's real data. No booking tools here: a booking
// request comes back as "fill the form" (fillForm). Same conversation as the visit.
import { handleMessage } from "@/server/agent/orchestrator"
import { loadStorefront } from "@/server/booking-page"

export async function POST(request: Request, { params }: RouteContext<"/api/book/[slug]/ask">) {
  const { slug } = await params
  const body = (await request.json().catch(() => null)) as {
    sessionId?: unknown
    message?: unknown
    clientMessageId?: unknown
    consentAt?: unknown
  } | null
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 100) : ""
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 1000) : ""
  const clientMessageId = typeof body?.clientMessageId === "string" ? body.clientMessageId.slice(0, 100) : undefined
  const consentAt =
    typeof body?.consentAt === "string" && !Number.isNaN(Date.parse(body.consentAt)) ? new Date(body.consentAt).toISOString() : null
  if (!sessionId || !message) return Response.json({ error: "sessionId and message are required" }, { status: 400 })

  try {
    const loaded = await loadStorefront(slug)
    if (!loaded) return Response.json({ error: "not_found" }, { status: 404 })
    if (loaded.store.requiresConsent && !consentAt) return Response.json({ error: "consent_required" }, { status: 400 })
    const events = await handleMessage(loaded.business.id, sessionId, message, "web", { consentAt, clientMessageId, askOnly: true })
    return Response.json({ events })
  } catch (err) {
    console.error("[book/ask]", err instanceof Error ? err.message : "unknown error")
    return Response.json({ error: "failed" }, { status: 500 })
  }
}
