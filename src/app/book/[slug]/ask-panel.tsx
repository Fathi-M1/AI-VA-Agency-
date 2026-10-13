"use client"

// "Questions? Ask us": answers from the business's own data (Receptionist → Sales /
// Support, no booking tools). Inline in the right column on wide screens; a floating
// pill + bottom sheet on phones. Consent gate when the business type requires it.
import * as React from "react"
import { ArrowUpIcon, ShieldCheckIcon } from "lucide-react"

import { RichText } from "@/components/rich-text"
import type { ChatEvent } from "@/server/agent/orchestrator"
import { cn } from "@/lib/utils"

import { brandBtn } from "./booking-parts"

export type AskLine = { role: "user" | "agent" | "error"; text: string; fillForm?: boolean; asked?: string }

export function useAsk(slug: string, sessionId: string, onEmergency: (text: string) => void) {
  const [lines, setLines] = React.useState<AskLine[]>([])
  const [busy, setBusy] = React.useState(false)
  const [consentAt, setConsentAt] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState("")

  const send = async (raw: string, requiresConsent: boolean) => {
    const message = raw.trim()
    if (!message || busy) return
    if (requiresConsent && !consentAt) {
      setDraft(message) // waits in the box until they agree
      return
    }
    setDraft("")
    setLines((l) => [...l, { role: "user", text: message }])
    setBusy(true)
    try {
      const res = await fetch(`/api/book/${encodeURIComponent(slug)}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message, consentAt, clientMessageId: crypto.randomUUID() }),
      })
      const data = (await res.json()) as { events?: ChatEvent[] }
      if (!res.ok || !data.events) throw new Error("failed")
      const added: AskLine[] = []
      for (const e of data.events) {
        if (e.kind === "message") added.push({ role: "agent", text: e.text, fillForm: e.fillForm, asked: message })
        else if (e.kind === "emergency") {
          added.push({ role: "agent", text: e.text })
          onEmergency(e.text)
        } else if (e.kind === "error") throw new Error("failed")
      }
      setLines((l) => [...l, ...added])
    } catch {
      setLines((l) => [...l, { role: "error", text: "Something went wrong. Try asking again." }])
    } finally {
      setBusy(false)
    }
  }

  return { lines, busy, consentAt, setConsentAt, draft, setDraft, send }
}

export function AskPanel({
  ask,
  business,
  starters,
  requiresConsent,
  onFillForm,
  compact,
}: {
  ask: ReturnType<typeof useAsk>
  business: string
  starters: string[]
  requiresConsent: boolean
  onFillForm: (text: string) => void
  compact?: boolean
}) {
  const locked = requiresConsent && !ask.consentAt
  const endRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" })
  }, [ask.lines, ask.busy])
  const shown = compact ? ask.lines.slice(-4) : ask.lines

  return (
    <div className="flex flex-col gap-3">
      {locked ? (
        <div className="rounded-2xl border border-border/80 bg-muted/40 p-4">
          <p className="flex gap-2 text-base">
            <ShieldCheckIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            Please don&apos;t share health details here until you agree to how {business} uses them.
          </p>
          <button type="button" onClick={() => ask.setConsentAt(new Date().toISOString())} className={cn(brandBtn, "mt-3 w-full")}>
            I agree
          </button>
        </div>
      ) : null}

      {!shown.length && !locked ? (
        <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
          {starters.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask.send(s, requiresConsent)}
              className="min-h-11 rounded-full border border-[color-mix(in_oklch,var(--brand)_35%,transparent)] bg-card px-4 text-base font-medium hover:border-[var(--brand)]"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {shown.length ? (
        <div className={cn("flex flex-col gap-2.5 overflow-y-auto", compact ? "max-h-80" : "max-h-[50svh]")} aria-live="polite">
          {shown.map((l, i) =>
            l.role === "user" ? (
              <p key={i} className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-[var(--brand)] px-3.5 py-2 text-base text-white">
                {l.text}
              </p>
            ) : l.role === "error" ? (
              <p key={i} role="alert" className="text-sm text-destructive">
                {l.text}
              </p>
            ) : (
              <div key={i} className="flex max-w-[90%] flex-col items-start gap-2 self-start">
                <div className="rounded-2xl rounded-bl-md border border-border/80 bg-card px-3.5 py-2">
                  <RichText text={l.text} className="text-base" />
                </div>
                {l.fillForm ? (
                  <button type="button" onClick={() => onFillForm(l.asked ?? "")} className={cn(brandBtn, "min-h-11 px-4 text-sm")}>
                    Fill the booking form for me
                  </button>
                ) : null}
              </div>
            )
          )}
          {ask.busy ? <p className="text-sm text-muted-foreground">Typing…</p> : null}
          <div ref={endRef} />
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask.send(ask.draft, requiresConsent)
        }}
        className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card p-1.5 pl-3.5"
      >
        <label htmlFor={compact ? "ask-inline" : "ask-sheet"} className="sr-only">
          Ask a question
        </label>
        <input
          id={compact ? "ask-inline" : "ask-sheet"}
          value={ask.draft}
          onChange={(e) => ask.setDraft(e.target.value)}
          disabled={locked}
          placeholder={locked ? "Tap I agree to ask" : "Ask a question"}
          autoComplete="off"
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={locked || ask.busy || !ask.draft.trim()}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white disabled:opacity-40"
          aria-label="Send"
        >
          <ArrowUpIcon className="size-5" aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
