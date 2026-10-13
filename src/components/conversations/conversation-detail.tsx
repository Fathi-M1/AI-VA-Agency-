"use client"

// Row-detail panel content for the Conversations table (opens in a shadcn Sheet).
// Built from pulled parts: shadcn Sheet (https://ui.shadcn.com/docs/components/sheet)
// and the outcome badge (Origin UI comp-420/421).
// Real data only: the conversation row, its contact, and its messages from Supabase.
// ("What the AI did" and "Play recording" were removed: no real source for either.)
import Link from "next/link"

import StatusDotBadge from "@/components/comp-420"
import { RichText } from "@/components/rich-text"
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { eyebrow } from "@/lib/styles"
import type { ConversationView, Outcome } from "@/server/db/views"

// Colour carries meaning here only: booked = green, escalated = amber, open = neutral.
export const outcomeTone: Record<Outcome, "accent" | "warning" | "hollow"> = {
  Booked: "accent",
  Escalated: "warning",
  Open: "hollow",
}

export function ConversationDetail({ c }: { c: ConversationView }) {
  return (
    <>
      <SheetHeader className="gap-3 border-b border-border px-7 pt-7 pb-6">
        <div className="flex flex-wrap items-center gap-2 pr-8">
          <StatusDotBadge tone={outcomeTone[c.outcome]} status={false}>
            {c.outcome}
          </StatusDotBadge>
          <span className="text-xs text-subtle">
            {c.channel} · {c.when} · {c.messageCount} messages
          </span>
        </div>
        <SheetTitle className="text-2xl font-semibold tracking-[-0.01em]">{c.customer}</SheetTitle>
        <SheetDescription className="text-sm">
          {c.customerNote}
          {c.agents.length ? ` · handled by ${c.agents.join(" → ")}` : ""}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-9 px-7 py-7">
        <section aria-label="Transcript">
          <p className={`${eyebrow} mb-4`}>Transcript</p>
          {c.transcript.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages in this conversation.</p>
          ) : (
            <ol className="flex flex-col gap-3.5">
              {c.transcript.map((t, i) => (
                <li key={i} className="grid grid-cols-[96px_1fr] gap-3 text-sm">
                  <span className="pt-0.5 text-xs text-subtle">
                    {t.who} <span className="tabular-nums">{t.at}</span>
                  </span>
                  <RichText text={t.text} className={t.role === "agent" ? "text-muted-foreground" : ""} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {c.contactId ? (
        <SheetFooter className="flex-row items-center gap-4 border-t border-border px-7 py-5">
          <Link
            href={`/contacts?open=${c.contactId}`}
            className="text-sm text-muted-foreground underline underline-offset-3 hover:text-foreground"
          >
            Open contact
          </Link>
        </SheetFooter>
      ) : null}
    </>
  )
}
