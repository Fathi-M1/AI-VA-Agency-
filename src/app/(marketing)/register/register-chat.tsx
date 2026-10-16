"use client"

// The owner's conversation with the Setup agent. Messages go to /api/setup; when the
// agent creates the business, the app switches to it and offers the dashboard.
// Parts: shadcn Input, Button (MIT); Magic UI Shimmer Button + Border Beam (MIT);
// RichText for the agent's formatting; tw-animate-css entrance animations.
import * as React from "react"
import Link from "next/link"
import { ArrowRight, ArrowUp, CheckCircle2Icon, CheckIcon } from "lucide-react"

import type { SetupEvent } from "@/app/api/setup/route"
import { LogoMark } from "@/components/brand/logo"
import { RichText } from "@/components/rich-text"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { cn } from "@/lib/utils"

type Line = SetupEvent | { kind: "owner"; text: string }

const TOOL_LABEL: Record<string, string> = {
  list_calendar_event_types: "Checked your calendar's booking types",
  create_calendar_event_type: "Created a booking type in your calendar",
  propose_business: "Prepared your summary",
  create_business: "Created your business",
}

const OPENING =
  "Hi! I'm your Setup agent. I'll set up your AI team in a few minutes.\n\nTo start: what's your business called, what kind of business is it, and what's your name?"

// One tap fills a first-answer template the owner completes.
const STARTERS = [
  { label: "Dental clinic", text: "We're ___, a dental clinic. My name is ___." },
  { label: "HVAC company", text: "We're ___, an HVAC company. My name is ___." },
  { label: "Hair salon", text: "We're ___, a hair salon. My name is ___." },
]

const enter = "animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"

function AgentAvatar({ className = "size-8" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_10%,white),color-mix(in_oklch,var(--primary)_22%,var(--background)))] shadow-[inset_0_1px_0_rgb(255_255_255/0.7)]",
        className
      )}
    >
      <LogoMark className="h-[45%] w-auto" />
    </span>
  )
}

export function RegisterChat() {
  const [sessionId] = React.useState(() => crypto.randomUUID())
  const [lines, setLines] = React.useState<Line[]>([{ kind: "message", text: OPENING }])
  const [draft, setDraft] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const created = lines.find((l): l is Extract<Line, { kind: "created" }> => l.kind === "created")
  const endRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const started = lines.some((l) => l.kind === "owner")

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" })
  }, [lines, busy])

  async function send(e?: React.FormEvent) {
    e?.preventDefault()
    const message = draft.trim()
    if (!message || busy || created) return
    setDraft("")
    setLines((l) => [...l, { kind: "owner", text: message }])
    setBusy(true)
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message }),
      })
      const data = (await res.json()) as { events?: SetupEvent[]; error?: string }
      setLines((l) => [...l, ...(data.events ?? [{ kind: "error", text: data.error ?? "Request failed." }])])
    } catch {
      setLines((l) => [...l, { kind: "error", text: "Couldn't reach the server." }])
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Agent identity */}
      <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4 sm:px-8">
        <AgentAvatar className="size-10" />
        <div className="min-w-0">
          <p className="text-base font-semibold">Setup agent</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Online · sets up your AI team
          </p>
        </div>
        <Link href="/" className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline lg:hidden">
          Back
        </Link>
      </div>

      {/* Conversation */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-8 sm:px-8">
          {lines.map((line, i) => (
            <LineView key={i} line={line} />
          ))}

          {!started ? (
            <div className={cn("flex flex-wrap gap-2 pl-11", enter)}>
              {STARTERS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setDraft(s.text)
                    inputRef.current?.focus()
                  }}
                  className="rounded-full border border-primary/20 bg-background/70 px-3.5 py-1.5 text-sm text-foreground/80 shadow-sm backdrop-blur transition-colors hover:border-primary/40 hover:bg-[color-mix(in_oklch,var(--primary)_8%,var(--background))]"
                >
                  {s.label}
                </button>
              ))}
            </div>
          ) : null}

          {busy ? (
            <div className={cn("flex items-end gap-3", enter)} aria-live="polite">
              <AgentAvatar />
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3.5 shadow-sm">
                <span className="sr-only">Setup agent is typing</span>
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="size-1.5 animate-bounce rounded-full bg-primary/60 motion-reduce:animate-none"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {created ? (
            <div className={cn("relative overflow-hidden rounded-2xl border border-primary/25 bg-[color-mix(in_oklch,var(--primary)_7%,var(--background))] p-6", enter)}>
              <p className="flex items-center gap-2 text-lg font-semibold">
                <CheckCircle2Icon className="size-5 text-primary" aria-hidden="true" />
                {created.name} is set up
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your AI team is configured. Open your dashboard, or talk to your own front desk.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/app">
                  <ShimmerButton background="oklch(0.405 0.07 155)" shimmerColor="oklch(0.92 0.03 85)" className="h-10 gap-2 px-5 text-sm font-medium">
                    Open your dashboard <ArrowRight className="size-4" aria-hidden="true" />
                  </ShimmerButton>
                </Link>
                <Button asChild variant="outline" className="h-10 rounded-full bg-background px-5">
                  <Link href="/console">Try your front desk</Link>
                </Button>
              </div>
              <BorderBeam size={180} duration={8} colorFrom="oklch(0.72 0.09 150)" colorTo="oklch(0.405 0.07 155)" />
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer: floating glass bar */}
      <div className="px-5 pb-5 sm:px-8 sm:pb-6">
        <form
          onSubmit={send}
          className="mx-auto flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-primary/15 bg-background/75 p-2 pl-5 shadow-[0_12px_40px_-18px_color-mix(in_oklch,var(--primary)_55%,transparent),inset_0_1px_0_rgb(255_255_255/0.7)] backdrop-blur-xl focus-within:border-primary/35"
        >
          <label htmlFor="setup-msg" className="sr-only">
            Message the Setup agent
          </label>
          <input
            ref={inputRef}
            id="setup-msg"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={created ? "Setup is done" : "Reply to your Setup agent…"}
            autoComplete="off"
            autoFocus
            disabled={!!created}
            className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle disabled:opacity-60"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={busy || !draft.trim() || !!created}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,oklch(0.5_0.09_150),var(--primary)_55%,oklch(0.32_0.06_158))] text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition hover:brightness-110 disabled:opacity-40"
          >
            <ArrowUp className="size-5" aria-hidden="true" />
          </button>
        </form>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-subtle">
          Press Enter to send. Nothing is created until you confirm the summary.
        </p>
      </div>
    </div>
  )
}

function LineView({ line }: { line: Line }) {
  if (line.kind === "owner") {
    return (
      <div className={cn("ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-[linear-gradient(135deg,oklch(0.48_0.085_150),var(--primary)_60%,oklch(0.35_0.06_158))] px-4 py-2.5 text-[15px] text-primary-foreground shadow-[0_8px_20px_-12px_color-mix(in_oklch,var(--primary)_80%,transparent)]", enter)}>
        {line.text}
      </div>
    )
  }
  if (line.kind === "tool") {
    return (
      <div className={cn("pl-11", enter)}>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-[color-mix(in_oklch,var(--primary)_6%,var(--background))] px-3 py-1 text-xs text-foreground/75">
          <CheckIcon className="size-3.5 text-primary" aria-hidden="true" />
          {TOOL_LABEL[line.tool] ?? line.tool}
          {line.ok ? "" : " (retrying)"}
        </span>
      </div>
    )
  }
  if (line.kind === "created") return null
  if (line.kind === "error") return <p className={cn("pl-11 text-sm text-destructive", enter)}>{line.text}</p>
  return (
    <div className={cn("flex items-end gap-3", enter)}>
      <AgentAvatar />
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border/80 bg-card/90 px-4 py-3 text-[15px] leading-relaxed shadow-sm backdrop-blur">
        <RichText text={line.text} />
      </div>
    </div>
  )
}
