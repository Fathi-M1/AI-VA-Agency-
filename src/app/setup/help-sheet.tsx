"use client"

// The setup assistant: ask a question, get a short plain-English answer (no data is
// changed, nothing is saved). Inline in the laptop right column; in a bottom sheet
// (phone) or dialog (tablet) behind "Need help?".
import * as React from "react"
import { SendIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { FieldBlock, inputCls, PrimaryAction } from "@/components/flow/flow-ui"
import { ResponsiveSheet } from "@/components/flow/responsive-sheet"

type QA = { q: string; a: string | null; failed?: boolean }

export function HelpChat({ step, businessType, compact = false }: { step: number; businessType: string | null; compact?: boolean }) {
  const [question, setQuestion] = React.useState("")
  const [thread, setThread] = React.useState<QA[]>([])
  const [busy, setBusy] = React.useState(false)
  const id = compact ? "help-question-inline" : "help-question"

  const ask = async () => {
    const q = question.trim()
    if (!q || busy) return
    setQuestion("")
    setBusy(true)
    setThread((t) => [...t, { q, a: null }])
    try {
      const res = await fetch("/api/setup-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, step, businessType }),
      })
      const data = (await res.json()) as { answer?: string }
      if (!res.ok || !data.answer) throw new Error("no answer")
      setThread((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a: data.answer! } : x)))
    } catch {
      setThread((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, failed: true } : x)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {thread.length ? (
        <div className="flex max-h-72 flex-col gap-2.5 overflow-y-auto">
          {thread.slice(compact ? -3 : 0).map((x, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <p className="self-end rounded-2xl rounded-br-md bg-[linear-gradient(135deg,oklch(0.5_0.09_150),var(--primary))] px-3.5 py-2 text-base text-primary-foreground">
                {x.q}
              </p>
              {x.a ? (
                <p className="self-start rounded-2xl rounded-bl-md border border-border/80 bg-card px-3.5 py-2 text-base">{x.a}</p>
              ) : x.failed ? (
                <p role="alert" className="self-start text-sm text-destructive">
                  Something went wrong. Ask again in a moment.
                </p>
              ) : (
                <p className="flex items-center gap-2 self-start text-sm text-muted-foreground">
                  <Spinner /> Thinking…
                </p>
              )}
            </div>
          ))}
        </div>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask()
        }}
      >
        <FieldBlock id={id} label="Ask a question" helper="Your setup assistant can explain, but it can't change your answers.">
          <div className="flex gap-2">
            <Input id={id} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question…" className={inputCls} />
            <button
              type="submit"
              disabled={busy || !question.trim()}
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl border border-primary/30 bg-card px-4 text-base font-medium text-primary disabled:opacity-50"
            >
              <SendIcon className="size-4" aria-hidden="true" />
              Send
            </button>
          </div>
        </FieldBlock>
      </form>
    </div>
  )
}

export function HelpSheet({
  open,
  onOpenChange,
  step,
  tip,
  businessType,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  step: number
  tip: string
  businessType: string | null
}) {
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Your setup assistant" description={tip}>
      <HelpChat step={step} businessType={businessType} />
      <PrimaryAction onClick={() => onOpenChange(false)}>Done</PrimaryAction>
    </ResponsiveSheet>
  )
}
