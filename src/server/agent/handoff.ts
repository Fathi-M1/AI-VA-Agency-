// Shared routing pieces: who can be handed to, the visible line said on each handoff,
// the standard "capture" line, and the handoff tool declarations.
import type { Tool } from "./llm"

export type Specialist = "booking" | "sales" | "support"
export type AgentName = "receptionist" | Specialist

/** Said (verbatim, by the server) when control passes to each specialist. */
export const HANDOFF_LINES: Record<Specialist, string> = {
  booking: "Let me get you to booking",
  sales: "Let me get you to our team",
  support: "Let me pull that up for you",
}

export const FOLLOW_UP_LINE = "A team member will follow up on that."

const WHEN: Record<Specialist, string> = {
  booking: "the person wants to book, reschedule or cancel an appointment",
  sales:
    "a new / prospective customer, pricing, 'do you do X', or someone not booked yet who isn't asking to book right now",
  support:
    "an existing customer's question (their appointment, policies, hours, billing, refunds)",
}

export function handoffTool(to: Specialist): Tool {
  return {
    type: "function",
    name: `handoff_to_${to}`,
    description: `Hand the conversation to the ${to} agent. Use when ${WHEN[to]}.`,
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "One short sentence: what they want, in their words." },
        // Optional: models may send null when no name was given (see MISTAKES.md #5).
        name: { type: ["string", "null"], description: "The person's name, only if they gave it." },
      },
      required: ["summary"],
    },
  }
}

/** handoff_to_<specialist> -> specialist, or null if it isn't a handoff tool. */
export function handoffTarget(toolName: string): Specialist | null {
  const m = /^handoff_to_(booking|sales|support)$/.exec(toolName)
  return m ? (m[1] as Specialist) : null
}
