// The Setup agent's entry point (owner-facing registration). Keys stay on the server.
// The setup conversation itself is in memory; what it produces (the business row and any
// calendar event types) is real. When a business is created, the app switches to it
// (dev cookie, until logins exist).
import { cookies } from "next/headers"

import { runAgentTurn, userInput, type Step } from "@/server/agent/llm"
import { executeSetupTool, setupInstruction, SETUP_TOOLS, type SetupState } from "@/server/agent/setup"
import { BUSINESS_COOKIE } from "@/server/tenant"

type SetupSession = SetupState & { history: Step[]; announced: boolean }

const sessions = ((globalThis as { __setupSessions?: Map<string, SetupSession> }).__setupSessions ??=
  new Map<string, SetupSession>())

export type SetupEvent =
  | { kind: "message"; text: string }
  | { kind: "tool"; tool: string; ok: boolean }
  | { kind: "created"; id: string; name: string }
  | { kind: "error"; text: string }

export async function POST(request: Request) {
  // EMERGENCY HOTFIX: off in production until Phase 0 (it uses the service-role key
  // and outside services for any caller).
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 })
  const body = (await request.json().catch(() => null)) as { sessionId?: unknown; message?: unknown } | null
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 100) : ""
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 4000) : ""
  if (!sessionId || !message) return Response.json({ error: "sessionId and message are required" }, { status: 400 })

  let s = sessions.get(sessionId)
  if (!s) {
    s = { history: [], created: null, draft: null, turn: 0, announced: false }
    sessions.set(sessionId, s)
  }
  const session = s
  const events: SetupEvent[] = []
  session.turn += 1 // each owner message is a new turn (create needs a draft from an earlier one)
  session.history.push(userInput(message))

  try {
    const turn = await runAgentTurn({
      systemInstruction: setupInstruction(new Date().toISOString().slice(0, 10)),
      history: session.history,
      tools: SETUP_TOOLS,
      maxToolRounds: 8,
      executeTool: (name, args) => executeSetupTool(name, args, session),
    })
    for (const t of turn.toolCalls) events.push({ kind: "tool", tool: t.name, ok: t.ok })
    if (turn.kind === "text") events.push({ kind: "message", text: turn.text })
  } catch (err) {
    console.error("[setup]", err instanceof Error ? err.message : "unknown error")
    events.push({ kind: "error", text: "Sorry, something went wrong on our side. Please try again." })
  }

  if (session.created && !session.announced) {
    session.announced = true
    ;(await cookies()).set(BUSINESS_COOKIE, session.created.id, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
    })
    events.push({ kind: "created", id: session.created.id, name: session.created.name })
  }
  return Response.json({ events })
}
