// "Fill it for me" and "Not sure?" on the booking page. The AI operates the page, it
// doesn't chat: it reads the customer's words and picks values from THIS business's
// real options (Groq structured output), then the server keeps only valid values.
// Safety net first; every text is saved to the visit's conversation (channel "web").
import { missingFor, shortDetails, validateFill, type RawFill } from "@/lib/booking-engine"
import { extractJson } from "@/server/agent/llm"
import { logToConversation, safetyCheck } from "@/server/agent/orchestrator"
import { loadStorefront, nowIn, type Storefront } from "@/server/booking-page"
import { asServiceRole } from "@/server/db/client"

const LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" } as const

function context(store: Storefront, tz: string) {
  const { now } = nowIn(tz)
  const today = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(now)
  const qs = store.spec.questions.filter((q) => q.id !== "service" && !q.isStaff && !q.skip)
  return [
    `Business: ${store.name}. Today is ${today} (timezone ${tz}).`,
    `Services (use the exact name): ${store.spec.services.map((s) => s.name).join(" | ") || "(none)"}`,
    `Questions:`,
    ...qs.map((q) => {
      const where = q.applies_to === "all" ? "" : ` (only for: ${q.applies_to.join(", ")})`
      const opts = q.options ? ` Options (use the exact text): ${q.options.join(" | ")}` : q.type === "number" ? ` A whole number ${q.min}-${q.max}.` : " Free text in the customer's words."
      const hints = q.option_details ? ` Hints: ${Object.entries(q.option_details).map(([o, d]) => `${o} = ${d.hint ?? ""}`).join("; ")}` : ""
      return `- ${q.id}: "${q.ask}"${where}.${opts}${hints}`
    }),
    store.spec.staff.length > 1 ? `Team (use the exact name, or "Anyone available"): ${store.spec.staff.map((m) => m.name).join(" | ")}` : "",
    `Days (use the date): ${store.days.map((d) => `${d.label} = ${d.value}`).join(", ")}`,
    `Times of day: morning (before 12:00), afternoon (12:00-17:00), evening (after 17:00).`,
  ]
    .filter(Boolean)
    .join("\n")
}

const FILL_SCHEMA = (questionIds: string[]) => ({
  type: "object",
  additionalProperties: false,
  required: ["intent", "service", "answers", "staff", "day", "time_of_day"],
  properties: {
    intent: { type: "string", enum: ["booking", "question"] },
    service: { type: ["string", "null"] },
    answers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question_id", "value"],
        properties: { question_id: { type: "string", enum: questionIds.length ? questionIds : ["none"] }, value: { type: "string" } },
      },
    },
    staff: { type: ["string", "null"] },
    day: { type: ["string", "null"] },
    time_of_day: { type: ["string", "null"] },
  },
})

async function handle(request: Request, { params }: RouteContext<"/api/book/[slug]/parse">) {
  const { slug } = await params
  const body = (await request.json().catch(() => null)) as { sessionId?: unknown; text?: unknown; questionId?: unknown; service?: unknown } | null
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 100) : ""
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 500) : ""
  const questionId = typeof body?.questionId === "string" ? body.questionId : null
  if (!sessionId || !text) return Response.json({ error: "sessionId and text are required" }, { status: 400 })

  try {
    const loaded = await loadStorefront(slug)
    if (!loaded) return Response.json({ error: "not_found" }, { status: 404 })
    const { business, store } = loaded
    const tz = business.config.timezone

    const emergency = await safetyCheck(business.id, sessionId, "web", text)
    if (emergency) return Response.json({ emergency })

    // "Not sure?": pick one option for one question from a description.
    if (questionId) {
      const q = store.spec.questions.find((x) => x.id === questionId && x.options?.length)
      if (!q) return Response.json({ error: "unknown_question" }, { status: 400 })
      const out = await extractJson<{ value: string | null }>({
        name: "pick_option",
        systemInstruction: `You match a customer's description to exactly one option for the question "${q.ask}". Options: ${q.options!.join(" | ")}.${
          q.option_details ? ` Hints: ${Object.entries(q.option_details).map(([o, d]) => `${o} = ${d.hint ?? ""}`).join("; ")}.` : ""
        } Answer with the exact option text, or null if the description doesn't clearly fit one.`,
        input: text,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["value"],
          properties: { value: { type: ["string", "null"] } },
        },
      })
      const picked = q.options!.find((o) => o.toLowerCase() === (out.value ?? "").trim().toLowerCase()) ?? null
      await logToConversation(business.id, sessionId, "web", [
        { role: "customer", agent: null, content: `(${q.ask}) ${text}` },
        { role: "agent", agent: "booking", content: picked ? `Picked "${picked}" from the description.` : "Couldn't tell which option fits." },
      ])
      return Response.json({ picked })
    }

    const questionIds = store.spec.questions.filter((q) => q.id !== "service" && !q.isStaff && !q.skip).map((q) => q.id)
    const raw = await extractJson<RawFill & { intent: "booking" | "question" }>({
      name: "booking_fill",
      systemInstruction: `You read what a customer typed on a booking page and fill in the booking form.
${context(store, tz)}

Rules:
- intent = "question" when the text asks something (prices, payment, hours, location...) instead of describing a booking; otherwise "booking".
- Only use values from the lists above, written exactly. Use null (or leave the answer out) when the text doesn't say or you're unsure. Never guess.
- For free-text questions, copy the customer's own words (e.g. a pet's name).
- day: resolve words like "today", "tomorrow", "this Saturday" to a date from the Days list.`,
      input: text,
      schema: FILL_SCHEMA(questionIds),
    })

    if (raw.intent === "question") {
      await logToConversation(business.id, sessionId, "web", [{ role: "customer", agent: null, content: text }])
      return Response.json({ intent: "question" })
    }

    const fill = validateFill(store.spec, store.days, raw)
    const missing = missingFor(store.spec, fill)
    const staffName =
      fill.staffId === "any" ? "Anyone available" : store.spec.staff.find((m) => m.id === fill.staffId)?.name
    const day = store.days.find((d) => d.value === fill.day)
    const summary = [
      fill.answers.service ? shortDetails(store.spec, fill.answers, staffName) : "",
      day?.long ?? "",
      fill.timeOfDay ? LABELS[fill.timeOfDay] : "",
    ]
      .filter(Boolean)
      .join(" · ")
    await logToConversation(business.id, sessionId, "web", [
      { role: "customer", agent: null, content: text },
      { role: "agent", agent: "booking", content: summary ? `Filled in from the message: ${summary}` : "Couldn't fill anything in from the message." },
    ])
    return Response.json({ intent: "booking", filled: fill, missing })
  } catch (err) {
    console.error("[book/parse]", err instanceof Error ? err.message : "unknown error")
    return Response.json({ error: "failed" }, { status: 500 })
  }
}

// The agent writes this business's conversation, so it runs with the service role; the
// business comes only from the booking link (never from the request body).
export function POST(request: Request, ctx: RouteContext<"/api/book/[slug]/parse">) {
  return asServiceRole("booking form reading + conversation log (one business, by booking link)", () => handle(request, ctx))
}
