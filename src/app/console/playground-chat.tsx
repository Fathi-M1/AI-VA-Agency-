"use client"

import * as React from "react"
import { MicIcon, SquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { RichText } from "@/components/rich-text"
import { cn } from "@/lib/utils"
import type { ChatEvent } from "@/server/agent/orchestrator"

import { useVoice, type VoiceState } from "./use-voice"

const VOICE_STATE_LABEL: Record<VoiceState, string> = {
  idle: "Ready. Press Talk and speak.",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
}

type Line = ChatEvent | { kind: "patient"; text: string }

const AGENT_LABEL = {
  receptionist: "Receptionist",
  booking: "Booking",
  sales: "Sales",
  support: "Support",
} as const
const TOOL_LABEL: Record<string, string> = {
  check_availability: "Checked Cal.com availability",
  book_appointment: "Created booking in Cal.com",
  capture_customer: "Saved customer",
  get_my_record: "Read customer record",
  create_needs_you_item: "Added to Needs you",
  ask_booking_question: "Asked a booking question",
  record_answer: "Saved an answer",
  quote_estimate: "Worked out the estimate",
  request_booking: "Sent the booking request",
}

const peso = (n: number) => `₱${n.toLocaleString("en-US")}`

export function PlaygroundChat({
  businesses,
  defaultBusinessId,
}: {
  businesses: { id: string; name: string }[]
  defaultBusinessId: string
}) {
  // Chat as a customer of the chosen business; switching starts a new conversation.
  const [businessId, setBusinessId] = React.useState(defaultBusinessId)
  const [sessionId, setSessionId] = React.useState(() => crypto.randomUUID())
  const [lines, setLines] = React.useState<Line[]>([])
  const [draft, setDraft] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [lines, busy])

  const [voiceMode, setVoiceMode] = React.useState(false)
  const voiceModeRef = React.useRef(voiceMode)
  React.useEffect(() => {
    voiceModeRef.current = voiceMode
  }, [voiceMode])

  // Typed and spoken messages go through the same /api/agent call; spoken ones are
  // sent with channel "voice" so the conversation is recorded as voice.
  const sendMessage = React.useCallback(
    async (message: string, channel: "chat" | "voice") => {
      setLines((l) => [...l, { kind: "patient", text: message }])
      setBusy(true)
      let events: ChatEvent[] = []
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message, channel, businessId }),
        })
        const data = (await res.json()) as { events?: ChatEvent[]; error?: string }
        events = data.events ?? [{ kind: "error", text: data.error ?? "Request failed." }]
      } catch {
        events = [{ kind: "error", text: "Couldn't reach the server." }]
      } finally {
        setBusy(false)
      }
      setLines((l) => [...l, ...events])
      return events
    },
    [sessionId, businessId]
  )

  const voice = useVoice(async (text) => {
    const events = await sendMessage(text, "voice")
    speakReplies(events)
  })

  // In voice mode, read the reply aloud (agent messages, handoff line, safety line).
  function speakReplies(events: ChatEvent[]) {
    if (!voiceModeRef.current) {
      voice.setState("idle")
      return
    }
    voice.speak(
      events.flatMap((e) =>
        e.kind === "message" || e.kind === "handoff" || e.kind === "emergency" || e.kind === "error" ? [e.text] : []
      )
    )
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const message = draft.trim()
    if (!message || busy) return
    setDraft("")
    const events = await sendMessage(message, "chat")
    if (voiceModeRef.current) speakReplies(events)
  }

  const voiceUnsupported = voice.supported.checked && !voice.supported.recognition

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex items-center gap-3">
        <Label htmlFor="pg-business" className="text-sm font-medium">
          Business
        </Label>
        <Select
          value={businessId}
          onValueChange={(id) => {
            setBusinessId(id)
            setSessionId(crypto.randomUUID())
            setLines([])
          }}
        >
          <SelectTrigger id="pg-business" className="h-9 min-w-56 rounded-[9px] bg-card text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {businesses.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-1 flex-col gap-3 rounded-xl border border-border bg-card p-4">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Say hello to start.</p>
        ) : null}
        {lines.map((line, i) => (
          <LineView key={i} line={line} />
        ))}
        {busy ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner className="size-3.5" /> Thinking…
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {/* Voice mode: browser Web Speech API only (mic in, spoken reply out). */}
      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Switch
            id="voice-mode"
            checked={voiceMode}
            disabled={voiceUnsupported}
            onCheckedChange={(on) => {
              setVoiceMode(on)
              if (!on) {
                voice.stopListening()
                voice.stopSpeaking()
              }
            }}
          />
          <Label htmlFor="voice-mode" className="text-sm font-medium">
            Voice mode
          </Label>
          {voiceMode ? (
            <>
              <span aria-live="polite" className="text-xs text-muted-foreground">
                {VOICE_STATE_LABEL[voice.state]}
              </span>
              <div className="ml-auto flex gap-2">
                {voice.state === "listening" ? (
                  <Button type="button" variant="outline" className="h-9 gap-2 rounded-[9px]" onClick={voice.stopListening}>
                    <SquareIcon aria-hidden="true" /> Stop listening
                  </Button>
                ) : voice.state === "speaking" ? (
                  <Button type="button" variant="outline" className="h-9 gap-2 rounded-[9px]" onClick={voice.stopSpeaking}>
                    <SquareIcon aria-hidden="true" /> Stop speaking
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="h-9 gap-2 rounded-[9px]"
                    disabled={busy || voice.state === "thinking"}
                    onClick={voice.listen}
                  >
                    <MicIcon aria-hidden="true" /> Talk
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </div>
        {voiceUnsupported ? (
          <p className="text-xs text-muted-foreground">
            Voice isn&apos;t supported in this browser (no Web Speech recognition). Chrome or Edge on
            desktop works best. You can keep typing.
          </p>
        ) : null}
        {voiceMode && voice.supported.checked && !voice.supported.synthesis ? (
          <p className="text-xs text-muted-foreground">This browser can&apos;t speak replies aloud; they&apos;ll show as text.</p>
        ) : null}
        {voice.notice ? (
          <p role="alert" className="text-xs text-destructive">
            {voice.notice}
          </p>
        ) : null}
      </div>

      <form onSubmit={send} className="sticky bottom-0 mt-3 flex gap-2 bg-background py-2">
        <label htmlFor="msg" className="sr-only">
          Message
        </label>
        <Input
          id="msg"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message"
          autoComplete="off"
          autoFocus
          className="h-10 rounded-[9px] bg-card text-sm"
        />
        <Button type="submit" disabled={busy || !draft.trim()} className="h-10 rounded-[9px] px-4">
          Send
        </Button>
      </form>
    </div>
  )
}

function LineView({ line }: { line: Line }) {
  if (line.kind === "patient") {
    return (
      <div className="ml-auto max-w-[80%] rounded-xl bg-secondary px-3.5 py-2 text-sm">{line.text}</div>
    )
  }
  if (line.kind === "tool") {
    return (
      <p className="text-xs text-subtle">
        {TOOL_LABEL[line.tool] ?? line.tool}
        {line.ok ? "" : " (failed)"}
      </p>
    )
  }
  if (line.kind === "handoff") {
    return (
      <div className="max-w-[80%]">
        <Bubble label={AGENT_LABEL[line.from]} text={line.text} />
        <p className="mt-2 border-y border-dashed border-border py-1.5 text-xs text-muted-foreground">
          Handed off to {AGENT_LABEL[line.to]} · “{line.summary}”
        </p>
      </div>
    )
  }
  if (line.kind === "emergency") {
    return <Bubble label="Safety" text={line.text} className="border-destructive/40" />
  }
  if (line.kind === "error") {
    return <p className="text-xs text-destructive">{line.text}</p>
  }
  if (line.kind === "estimate") {
    return (
      <p className="text-xs text-muted-foreground">
        Estimate card: {line.price === null ? "price to be confirmed" : peso(line.price)} · {line.durationMinutes} min
        {line.notes.length ? ` · ${line.notes.join(" ")}` : ""}
      </p>
    )
  }
  if (line.kind === "request_sent") {
    return (
      <p className="text-xs text-muted-foreground">
        Request-sent card: {line.details} · {line.preferredTime} · {line.name}, {line.mobile}
      </p>
    )
  }
  return (
    <div className="max-w-[80%]">
      <Bubble label={AGENT_LABEL[line.from]} text={line.text} />
      {line.suggestedReplies?.length ? (
        <p className="mt-1 text-[11px] text-subtle">Quick replies: {line.suggestedReplies.join(" · ")}</p>
      ) : null}
      {line.numberReply ? <p className="mt-1 text-[11px] text-subtle">Quick replies: 1–6 · More</p> : null}
    </div>
  )
}

function Bubble({ label, text, className }: { label: string; text: string; className?: string }) {
  return (
    <div className={cn("max-w-[80%] rounded-xl border border-border bg-background px-3.5 py-2", className)}>
      <p className="text-[11px] font-medium text-subtle">{label}</p>
      <RichText text={text} className="text-sm" />
    </div>
  )
}
