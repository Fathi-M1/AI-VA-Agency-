"use client"

// The customer's booking chat (Journey C), mobile-first in a 480px column.
// Greeting + starter chips, consent card for dental clinics, quick-reply chips for
// booking questions, the estimate and request-sent cards, a typing indicator, offline
// queueing, and a retry that never saves the same message twice (client message ids).
// Built from installed parts: shadcn Input (MIT), Lucide icons (ISC), RichText.
import * as React from "react"
import { ArrowUpIcon, CircleCheckIcon, ReceiptTextIcon, RotateCwIcon, TriangleAlertIcon, WifiOffIcon } from "lucide-react"

import { RichText } from "@/components/rich-text"
import { PrimaryAction } from "@/components/flow/flow-ui"
import { duration, peso } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ChatEvent } from "@/server/agent/orchestrator"

type Line =
  | { kind: "customer"; id: string; text: string; status: "sending" | "sent" | "failed" | "queued" }
  | { kind: "agent"; text: string; suggested?: string[]; numberReply?: boolean }
  | { kind: "note"; text: string }
  | { kind: "estimate"; price: number | null; durationMinutes: number; notes: string[] }
  | {
      kind: "request"
      service: string
      details: string
      preferredTime: string
      teamMember: string | null
      mobile: string
    }
  | { kind: "emergency"; text: string }

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb)
  window.addEventListener("offline", cb)
  return () => {
    window.removeEventListener("online", cb)
    window.removeEventListener("offline", cb)
  }
}

const AGENT_NAME = { receptionist: "Receptionist", booking: "Booking", sales: "Sales", support: "Support" } as const

const enter = "animate-in fade-in-0 slide-in-from-bottom-1 duration-200 motion-reduce:animate-none"

function Avatar({ business, className }: { business: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,oklch(0.6_0.1_150)_0%,var(--primary)_55%,oklch(0.32_0.06_158)_100%)] font-serif text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]",
        className
      )}
    >
      {business.trim().charAt(0).toUpperCase()}
    </span>
  )
}

export function BookChat({
  slug,
  business,
  requiresConsent,
  usesServiceAreas,
  greeting,
}: {
  slug: string
  business: string
  /** from the business type pack */
  requiresConsent: boolean
  usesServiceAreas: boolean
  greeting: string
}) {
  const [sessionId] = React.useState(() => crypto.randomUUID())
  const [lines, setLines] = React.useState<Line[]>([{ kind: "agent", text: greeting }])
  const [text, setText] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const online = React.useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
  const needsConsent = requiresConsent
  const [consentAt, setConsentAt] = React.useState<string | null>(null)
  const [learnMore, setLearnMore] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const endRef = React.useRef<HTMLDivElement>(null)
  const sending = React.useRef(false)

  const starters = ["Book an appointment", "Prices", usesServiceAreas ? "Do you serve my area?" : "Hours & location"]
  const locked = needsConsent && !consentAt
  const started = lines.some((l) => l.kind === "customer")

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" })
  }, [lines, busy])

  // Sends one customer line to the server (used for new messages, retries, the queue).
  const deliver = React.useCallback(
    async (line: Extract<Line, { kind: "customer" }>) => {
      if (sending.current) return
      if (!navigator.onLine) {
        setLines((ls) => ls.map((l) => (l.kind === "customer" && l.id === line.id ? { ...l, status: "queued" } : l)))
        return
      }
      sending.current = true
      setBusy(true)
      setLines((ls) => ls.map((l) => (l.kind === "customer" && l.id === line.id ? { ...l, status: "sending" } : l)))
      try {
        const res = await fetch(`/api/book/${encodeURIComponent(slug)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: line.text, clientMessageId: line.id, consentAt }),
        })
        const data = (await res.json()) as { events?: ChatEvent[] }
        if (!res.ok || !data.events) throw new Error("failed")
        if (data.events.some((e) => e.kind === "error")) throw new Error("failed")
        const added: Line[] = data.events.flatMap((e): Line[] => {
          if (e.kind === "message") return [{ kind: "agent", text: e.text, suggested: e.suggestedReplies, numberReply: e.numberReply }]
          if (e.kind === "handoff") return [{ kind: "note", text: `${AGENT_NAME[e.to]} assistant joined` }]
          if (e.kind === "emergency") return [{ kind: "emergency", text: e.text }]
          if (e.kind === "estimate") return [{ kind: "estimate", price: e.price, durationMinutes: e.durationMinutes, notes: e.notes }]
          if (e.kind === "request_sent")
            return [{ kind: "request", service: e.service, details: e.details, preferredTime: e.preferredTime, teamMember: e.teamMember, mobile: e.mobile }]
          return []
        })
        setLines((ls) => [
          ...ls.map((l) => (l.kind === "customer" && l.id === line.id ? { ...l, status: "sent" as const } : l)),
          ...added,
        ])
      } catch {
        setLines((ls) => ls.map((l) => (l.kind === "customer" && l.id === line.id ? { ...l, status: "failed" } : l)))
      } finally {
        sending.current = false
        setBusy(false)
        // Anything typed while this was sending/offline goes next.
        setTimeout(() => {
          const queued = linesRef.current.find((l) => l.kind === "customer" && l.status === "queued")
          if (queued && navigator.onLine) window.dispatchEvent(new Event("online"))
        }, 0)
      }
    },
    [slug, sessionId, consentAt]
  )

  // Offline: show a banner; queued messages go out (in order) when the connection is back.
  const linesRef = React.useRef(lines)
  React.useEffect(() => {
    linesRef.current = lines
  }, [lines])
  const flushQueue = React.useCallback(() => {
    const queued = linesRef.current.find((l): l is Extract<Line, { kind: "customer" }> => l.kind === "customer" && l.status === "queued")
    if (queued && navigator.onLine) deliver(queued)
  }, [deliver])
  React.useEffect(() => {
    window.addEventListener("online", flushQueue)
    return () => window.removeEventListener("online", flushQueue)
  }, [flushQueue])

  const send = (raw: string) => {
    const message = raw.trim()
    if (!message || busy || locked) return
    setText("")
    const line: Extract<Line, { kind: "customer" }> = { kind: "customer", id: crypto.randomUUID(), text: message, status: "sending" }
    setLines((ls) => [...ls, line])
    deliver(line)
  }

  const last = lines.at(-1)
  const chips = !busy && last?.kind === "agent" ? (last.suggested ?? null) : null
  const numberChips = !busy && last?.kind === "agent" && last.numberReply

  return (
    <div className="force-light flex min-h-svh flex-col bg-background bg-[radial-gradient(90%_40%_at_100%_0%,color-mix(in_oklch,var(--primary)_12%,var(--background))_0%,transparent_70%)]">
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur-xl">
          <Avatar business={business} className="size-11 text-xl" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{business}</h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              AI assistant · replies instantly
            </p>
          </div>
        </header>

        {!online ? (
          <div role="status" className="flex items-center gap-2 border-b border-warning/40 bg-[color-mix(in_oklch,var(--warning)_14%,var(--background))] px-4 py-2.5 text-base">
            <WifiOffIcon className="size-4 shrink-0" aria-hidden="true" />
            You&apos;re offline. We&apos;ll send your message when you&apos;re back.
          </div>
        ) : null}

        {/* Conversation */}
        <main className="flex flex-1 flex-col gap-4 px-4 py-6" aria-live="polite">
          {lines.map((line, i) => (
            <LineView key={i} line={line} business={business} onRetry={deliver} />
          ))}

          {!started && !locked ? (
            <div className={cn("flex flex-wrap gap-2 pl-10", enter)}>
              {starters.map((s) => (
                <ChipButton key={s} onClick={() => send(s)}>
                  {s}
                </ChipButton>
              ))}
            </div>
          ) : null}

          {chips?.length ? (
            <div className={cn("flex flex-wrap gap-2 pl-10", enter)} aria-label="Quick replies">
              {chips.map((c) => (
                <ChipButton key={c} onClick={() => send(c)}>
                  {c}
                </ChipButton>
              ))}
            </div>
          ) : null}
          {numberChips ? (
            <div className={cn("flex flex-wrap gap-2 pl-10", enter)} aria-label="Quick replies">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <ChipButton key={n} onClick={() => send(String(n))} className="min-w-12 justify-center px-0">
                  {n}
                </ChipButton>
              ))}
              <ChipButton onClick={() => inputRef.current?.focus()}>More</ChipButton>
            </div>
          ) : null}

          {busy ? (
            <div className={cn("flex items-end gap-2.5", enter)}>
              <Avatar business={business} className="size-8 text-sm" />
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3.5 shadow-sm">
                <span className="sr-only">The assistant is typing</span>
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    aria-hidden="true"
                    style={{ animationDelay: `${d}ms` }}
                    className="size-1.5 animate-bounce rounded-full bg-primary/60 motion-reduce:animate-none"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {locked ? (
            <div className={cn("rounded-2xl border border-primary/20 bg-card/90 p-5 shadow-sm", enter)}>
              <p className="text-base leading-relaxed">
                Before we start: {business} will use the details you share, including your dental concern, only to handle your
                appointment.
              </p>
              {learnMore ? (
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  We keep your name, mobile number, and what you tell the assistant about your visit. {business} can see these
                  details so they can handle your appointment. To have them deleted, contact {business} directly.
                </p>
              ) : null}
              <div className="mt-4 flex flex-col gap-1">
                <PrimaryAction onClick={() => setConsentAt(new Date().toISOString())}>I agree</PrimaryAction>
                {!learnMore ? (
                  <button
                    type="button"
                    onClick={() => setLearnMore(true)}
                    className="min-h-11 text-base font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Learn more
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </main>

        {/* Input bar */}
        <div className="sticky bottom-0 bg-[linear-gradient(to_top,var(--background)_75%,transparent)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {!needsConsent ? (
            <p className="mb-2 text-center text-sm text-muted-foreground">Your details are only used to handle your booking.</p>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(text)
            }}
            className="flex items-center gap-2 rounded-2xl border border-primary/15 bg-card/90 p-1.5 pl-4 shadow-[var(--elevate-raised)] backdrop-blur-xl"
          >
            <label htmlFor="book-msg" className="sr-only">
              Message
            </label>
            <input
              id="book-msg"
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={locked}
              placeholder={locked ? "Tap I agree to start" : "Type a message"}
              autoComplete="off"
              enterKeyHint="send"
              className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={locked || busy || !text.trim()}
              className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,oklch(0.5_0.09_150),var(--primary)_55%,oklch(0.32_0.06_158))] px-4 text-base font-semibold text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition hover:brightness-110 disabled:opacity-40"
            >
              <ArrowUpIcon className="size-5" aria-hidden="true" />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function ChipButton({ children, onClick, className }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full border border-primary/30 bg-card px-4 text-base font-medium text-primary shadow-sm transition hover:border-primary/60 hover:bg-[color-mix(in_oklch,var(--primary)_8%,var(--card))] focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
        className
      )}
    >
      {children}
    </button>
  )
}

function LineView({
  line,
  business,
  onRetry,
}: {
  line: Line
  business: string
  onRetry: (l: Extract<Line, { kind: "customer" }>) => void
}) {
  if (line.kind === "customer") {
    return (
      <div className={cn("flex flex-col items-end gap-1", enter)}>
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[linear-gradient(135deg,oklch(0.48_0.085_150),var(--primary)_60%,oklch(0.35_0.06_158))] px-4 py-2.5 text-base text-primary-foreground shadow-sm">
          {line.text}
        </p>
        {line.status === "failed" ? (
          <button
            type="button"
            onClick={() => onRetry(line)}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-destructive underline-offset-4 hover:underline"
          >
            <RotateCwIcon className="size-4" aria-hidden="true" />
            Something went wrong. Tap to try again.
          </button>
        ) : null}
        {line.status === "queued" ? <p className="text-sm text-muted-foreground">Waiting for connection…</p> : null}
      </div>
    )
  }
  if (line.kind === "note") {
    return (
      <p className={cn("self-center rounded-full bg-muted/70 px-3 py-1 text-sm text-muted-foreground", enter)}>{line.text}</p>
    )
  }
  if (line.kind === "emergency") {
    return (
      <div role="alert" className={cn("flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-base", enter)}>
        <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <p>{line.text}</p>
      </div>
    )
  }
  if (line.kind === "estimate") {
    return (
      <div className={cn("ml-10 rounded-2xl border border-primary/25 bg-[color-mix(in_oklch,var(--primary)_7%,var(--card))] p-4", enter)}>
        <p className="flex items-center gap-2 text-lg font-semibold">
          <ReceiptTextIcon className="size-5 text-primary" aria-hidden="true" />
          {line.price === null
            ? `Price: ${business} will confirm · about ${duration(line.durationMinutes)}`
            : `Estimate: ${peso(line.price)} · about ${duration(line.durationMinutes)}`}
        </p>
        {line.notes.map((n) => (
          <p key={n} className="mt-1.5 text-base">
            {n}
          </p>
        ))}
        {line.price !== null ? <p className="mt-1.5 text-sm text-muted-foreground">Final price is confirmed by {business}.</p> : null}
      </div>
    )
  }
  if (line.kind === "request") {
    const rows = [
      ["Service", line.service],
      ["Details", line.details],
      ["Preferred time", line.preferredTime],
      ...(line.teamMember ? [["Team member", line.teamMember]] : []),
    ]
    return (
      <div className={cn("ml-10 rounded-2xl border border-primary/25 bg-card p-4 shadow-sm", enter)}>
        <p className="flex items-center gap-2 text-lg font-semibold">
          <CircleCheckIcon className="size-5 text-primary" aria-hidden="true" />
          Request sent
        </p>
        <dl className="mt-3 flex flex-col gap-2">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-2 text-base">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium break-words">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 border-t border-border/70 pt-3 text-sm text-muted-foreground">
          {business} will confirm by text or call to {line.mobile}. This is not a confirmed booking yet.
        </p>
      </div>
    )
  }
  return (
    <div className={cn("flex items-end gap-2.5", enter)}>
      <Avatar business={business} className="size-8 text-sm" />
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border/80 bg-card/95 px-4 py-3 text-base leading-relaxed shadow-sm">
        <RichText text={line.text} className="text-base" />
      </div>
    </div>
  )
}
