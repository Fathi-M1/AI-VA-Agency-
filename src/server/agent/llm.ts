// The model layer: Groq, via the official groq-sdk (OpenAI-style chat completions with
// tool calling). Docs: https://console.groq.com/docs/tool-use
// Loop: send messages + tools -> the assistant returns tool_calls -> run each tool and
// append a { role: "tool", tool_call_id } message -> repeat until it answers in text.
// The agents and tools only see this file's neutral types, so the provider can change
// here without touching them. (Gemini, the previous provider, may come back later as
// a fallback.)
import Groq from "groq-sdk"
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "groq-sdk/resources/chat/completions"

export const MODEL = "openai/gpt-oss-120b"

let client: Groq | null = null
function groq() {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error("GROQ_API_KEY is not set")
    client = new Groq({ apiKey })
  }
  return client
}

/** One entry of an agent's working history (user / assistant / tool messages). */
export type Step = ChatCompletionMessageParam

/** Provider-neutral function tool declaration used by the agents. */
export type Tool = {
  type: "function"
  name: string
  description: string
  parameters: Record<string, unknown>
}

export const userInput = (text: string): Step => ({ role: "user", content: text })

const toGroqTool = (t: Tool): ChatCompletionTool => ({
  type: "function",
  function: { name: t.name, description: t.description, parameters: t.parameters },
})

export type ToolOutcome =
  | { kind: "result"; result: Record<string, unknown> }
  | { kind: "stop"; payload: Record<string, unknown> } // ends the turn (used for handoff)

export type AgentTurn =
  | { kind: "text"; text: string; toolCalls: { name: string; ok: boolean }[] }
  | {
      kind: "stopped"
      tool: string
      payload: Record<string, unknown>
      toolCalls: { name: string; ok: boolean }[]
    }

function parseArgs(raw: string | undefined): Record<string, unknown> {
  try {
    const v = JSON.parse(raw || "{}")
    return v && typeof v === "object" ? v : {}
  } catch {
    return {}
  }
}

/** Runs one agent turn: model -> tools -> model ... until it answers in text. */
export async function runAgentTurn(opts: {
  systemInstruction: string
  history: Step[] // mutated: assistant messages and tool results are appended
  tools: Tool[]
  executeTool: (name: string, args: Record<string, unknown>) => Promise<ToolOutcome>
  maxToolRounds?: number
}): Promise<AgentTurn> {
  const toolCalls: { name: string; ok: boolean }[] = []
  for (let round = 0; round <= (opts.maxToolRounds ?? 4); round++) {
    const completion = await groq().chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: opts.systemInstruction }, ...opts.history],
      // No tools (e.g. the setup helper): leave the field out rather than sending [].
      ...(opts.tools.length ? { tools: opts.tools.map(toGroqTool) } : {}),
    })
    const msg = completion.choices[0]?.message
    const calls = msg?.tool_calls ?? []
    // Keep only what the API expects back: role, content, tool_calls.
    opts.history.push({
      role: "assistant",
      content: msg?.content ?? "",
      ...(calls.length ? { tool_calls: calls } : {}),
    })

    if (calls.length === 0) {
      const text = msg?.content?.trim()
      return { kind: "text", text: text || "Sorry, could you say that again?", toolCalls }
    }

    for (const call of calls) {
      const outcome = await opts.executeTool(call.function.name, parseArgs(call.function.arguments))
      if (outcome.kind === "stop") {
        return { kind: "stopped", tool: call.function.name, payload: outcome.payload, toolCalls }
      }
      toolCalls.push({ name: call.function.name, ok: outcome.result.ok !== false })
      opts.history.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(outcome.result),
      })
    }
  }
  // Ran out of tool rounds without an answer: don't guess.
  return { kind: "text", text: "A team member will follow up on that.", toolCalls }
}

/** One structured-output call (no tools): the model must answer with JSON matching
 *  `schema` (Groq strict json_schema; every property required, nulls for "unknown").
 *  Callers must still validate every value: this constrains shape, not truth. */
export async function extractJson<T>(opts: {
  name: string
  systemInstruction: string
  input: string
  schema: Record<string, unknown>
}): Promise<T> {
  const completion = await groq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: opts.systemInstruction },
      { role: "user", content: opts.input },
    ],
    response_format: { type: "json_schema", json_schema: { name: opts.name, strict: true, schema: opts.schema } },
  })
  const text = completion.choices[0]?.message?.content ?? "{}"
  return JSON.parse(text) as T
}
