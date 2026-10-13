// "Need help?" on /setup: a Setup assistant that answers owner questions in plain
// English. It has no tools, so it cannot change any data. No conversation is kept.
import { runAgentTurn, userInput } from "@/server/agent/llm"

const STEPS = [
  "Welcome",
  "Step 1 of 4: picking the business type and typing the business name",
  "Step 2 of 4: choosing services, times and prices, how customers pay, walk-ins, HMO cards (dental clinics) or extra charges (aircon cleaning)",
  "Step 3 of 4: adding team members, their working days and hours (a second shift covers a lunch break), and areas served (aircon cleaning)",
  "Step 4 of 4: the emergency message, the owner's mobile number, and the refund amount that needs the owner's OK",
]

function instruction(step: number, businessType: string | null) {
  return `You are the setup assistant for an AI front desk for small businesses in the Philippines.
What the product does: after a 5-minute setup, the owner gets a booking link to share on Facebook and Messenger. An AI team (Receptionist, Booking, Sales, Support, and an assistant for the owner) answers customers instantly, answers questions from the business's own information, and sends the owner booking requests to confirm. The owner confirms each request and texts the customer from their own phone. The AI team never confirms bookings by itself, never handles emergencies by itself, and never approves refunds.
The owner is on: ${STEPS[step] ?? STEPS[0]}.
Business type: ${businessType ?? "not picked yet"}.

Rules:
- Answer in plain English, in at most 3 short sentences. No lists, no headings.
- You cannot change any of their answers or settings; tell them which field to change themselves.
- Never use these words: tenant, event type, CRM, workflow, webhook, schema, API, escalation, provider, config, slug, vertical.
- If you are not sure, reply exactly: "I'm not sure — you can change this later in your settings"`
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { question?: unknown; step?: unknown; businessType?: unknown } | null
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 500) : ""
  const step = typeof body?.step === "number" ? body.step : 0
  const businessType = typeof body?.businessType === "string" ? body.businessType.slice(0, 40) : null
  if (!question) return Response.json({ error: "question is required" }, { status: 400 })

  try {
    const turn = await runAgentTurn({
      systemInstruction: instruction(step, businessType),
      history: [userInput(question)],
      tools: [],
      executeTool: async () => ({ kind: "result", result: { ok: false } }),
    })
    return Response.json({ answer: turn.kind === "text" ? turn.text : "I'm not sure — you can change this later in your settings" })
  } catch (err) {
    console.error("[setup-help]", err instanceof Error ? err.message : "unknown error")
    return Response.json({ error: "unavailable" }, { status: 502 })
  }
}
