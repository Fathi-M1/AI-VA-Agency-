"use client"

// Today's "Needs you" list (Journey D2–D4): booking request cards with the Confirm and
// Decline sheets (bottom sheet on phones, centered dialog on tablet/laptop),
// then "Let {name} know" with the owner's own phone: sms: / tel: links, no SMS service.
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckIcon, CircleAlertIcon, CopyIcon, MessageSquareTextIcon, PhoneIcon, TriangleAlertIcon } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCopy } from "@/components/flow/booking-link"
import { ChoiceChips, FieldBlock, linkCls, PrimaryAction, selectCls } from "@/components/flow/flow-ui"
import { ResponsiveSheet } from "@/components/flow/responsive-sheet"
import { duration, peso, time12, toMinutes, fromMinutes } from "@/lib/format"
import { cn } from "@/lib/utils"

import { confirmRequest, declineRequest, resolveItem } from "./actions"

export type RequestCard = {
  id: string
  customer: string
  mobile: string
  service: string
  details: string
  preferredTime: string
  estimate: { price: number | null; duration_minutes: number; notes: string[] } | null
  durationMinutes: number
  staffId: string | null
  conversationId: string | null
  received: string
  referenceCode: string | null
  preferredDay: string | null
  preferredTimeOfDay: "morning" | "afternoon" | "evening" | null
  source: "form" | "chat"
  ticketUrl: string | null
}
export type ItemCard = { id: string; reason: string; customer: string; conversationId: string | null; received: string }
export type StaffOption = { id: string; name: string; hours: { weekday: number; start_time: string; end_time: string }[] }
export type DateOption = { value: string; label: string; weekday: number }

const cardCls =
  "rounded-2xl border border-border/80 bg-card/90 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_10px_30px_-24px_color-mix(in_oklch,var(--primary)_60%,transparent)]"

export function NeedsYouList({
  requests,
  items,
  staff,
  dates,
  business,
}: {
  requests: RequestCard[]
  items: ItemCard[]
  staff: StaffOption[]
  dates: DateOption[]
  business: string
}) {
  const [confirming, setConfirming] = React.useState<RequestCard | null>(null)
  const [declining, setDeclining] = React.useState<RequestCard | null>(null)

  if (!requests.length && !items.length) {
    return (
      <p className="rounded-2xl border border-dashed border-primary/25 bg-card/60 p-5 text-base text-muted-foreground">
        Nothing needs you right now. Your AI team will let you know here.
      </p>
    )
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-3 @[720px]:grid-cols-2">
        {requests.map((r) => (
          <li key={r.id} className={cardCls}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold">{r.customer}</p>
                {r.referenceCode ? <p className="font-mono text-sm tracking-wider text-muted-foreground">{r.referenceCode}</p> : null}
              </div>
              <span className="shrink-0 rounded-full bg-[color-mix(in_oklch,var(--primary)_12%,var(--card))] px-2.5 py-1 text-sm font-medium text-primary">
                New request
              </span>
            </div>
            <p className="mt-1 text-base">{r.details}</p>
            <dl className="mt-3 flex flex-col gap-1 text-base">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Preferred time:</dt>
                <dd>{r.preferredTime || "Not given"}</dd>
              </div>
              {r.estimate ? (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Estimate:</dt>
                  <dd>
                    {r.estimate.price === null ? "Price to confirm" : peso(r.estimate.price)} · about {duration(r.estimate.duration_minutes)}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-2 text-sm text-muted-foreground">
              {r.received} · {r.source === "form" ? "From the booking form" : "From a chat"}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirming(r)}
                className="min-h-12 flex-1 rounded-full bg-[linear-gradient(135deg,oklch(0.5_0.09_150),var(--primary)_55%,oklch(0.32_0.06_158))] px-5 text-base font-semibold text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.22)] hover:brightness-110"
              >
                Confirm
              </button>
              <button type="button" onClick={() => setDeclining(r)} className={cn(linkCls, "px-2 text-muted-foreground")}>
                Decline
              </button>
            </div>
            {r.conversationId ? (
              <Link href={`/conversations?open=${r.conversationId}`} className={cn(linkCls, "mt-1")}>
                View conversation
              </Link>
            ) : null}
          </li>
        ))}
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </ul>

      <ConfirmSheet request={confirming} onClose={() => setConfirming(null)} staff={staff} dates={dates} />
      <DeclineSheet request={declining} onClose={() => setDeclining(null)} business={business} />
    </>
  )
}

function ItemRow({ item }: { item: ItemCard }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  return (
    <li className={cn(cardCls, "border-[color-mix(in_oklch,var(--warning)_40%,transparent)]")}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--warning)_18%,var(--background))] text-[oklch(0.45_0.12_60)]">
          <TriangleAlertIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">{item.reason}</p>
          <p className="text-base text-muted-foreground">
            {item.customer} · {item.received}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4">
        {item.conversationId ? (
          <Link href={`/conversations?open=${item.conversationId}`} className={linkCls}>
            View conversation
          </Link>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await resolveItem(item.id)
            router.refresh()
          }}
          className={cn(linkCls, "text-muted-foreground")}
        >
          <CheckIcon className="size-4" aria-hidden="true" /> Mark as done
        </button>
      </div>
    </li>
  )
}

/* ---------------------------------------------------------------- sheets */

function FlowSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title={title}>
      {children}
    </ResponsiveSheet>
  )
}

function LetThemKnow({ name, mobile, message, onDone }: { name: string; mobile: string; message: string; onDone: () => void }) {
  const { copied, copy } = useCopy()
  const btn =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-primary/25 bg-card px-5 text-base font-medium hover:border-primary/50"
  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-semibold">Let {name} know</p>
      <p className="rounded-2xl border border-border/80 bg-card p-4 text-base">{message}</p>
      <a href={`sms:${mobile}?body=${encodeURIComponent(message)}`} className={cn(btn, "border-primary text-primary")}>
        <MessageSquareTextIcon className="size-5" aria-hidden="true" /> Text {name}
      </a>
      <div className="flex gap-2">
        <button type="button" onClick={() => copy(message)} className={cn(btn, "flex-1")}>
          {copied ? <CheckIcon className="size-5" aria-hidden="true" /> : <CopyIcon className="size-5" aria-hidden="true" />}
          <span aria-live="polite">{copied ? "Copied!" : "Copy message"}</span>
        </button>
        <a href={`tel:${mobile}`} className={cn(btn, "flex-1")}>
          <PhoneIcon className="size-5" aria-hidden="true" /> Call
        </a>
      </div>
      <PrimaryAction onClick={onDone} className="mt-2">
        Done
      </PrimaryAction>
    </div>
  )
}

/** 15-minute start times where the whole visit fits inside one of the member's shifts. */
function startTimes(member: StaffOption | undefined, weekday: number, minutes: number) {
  if (!member) return []
  return member.hours
    .filter((h) => h.weekday === weekday)
    .flatMap((h) => {
      const out: string[] = []
      for (let t = toMinutes(h.start_time); t + minutes <= toMinutes(h.end_time); t += 15) out.push(fromMinutes(t))
      return out
    })
}

const firstName = (n: string) => n.split(" ")[0]

/** Minutes since midnight for each time of day (morning < 12:00 ≤ afternoon < 17:00 ≤ evening). */
const WINDOWS = { morning: [0, 720], afternoon: [720, 1020], evening: [1020, 1440] } as const

function ConfirmSheet(props: { request: RequestCard | null; onClose: () => void; staff: StaffOption[]; dates: DateOption[] }) {
  if (!props.request) return <FlowSheet open={false} onClose={props.onClose} title="">{null}</FlowSheet>
  return <ConfirmBody key={props.request.id} {...props} request={props.request} />
}

function ConfirmBody({
  request,
  onClose,
  staff,
  dates,
}: {
  request: RequestCard
  onClose: () => void
  staff: StaffOption[]
  dates: DateOption[]
}) {
  const router = useRouter()
  // Preselect the member they chose and the first day that member works.
  const chosen = staff.find((m) => m.id === request.staffId)
  const [staffId, setStaffId] = React.useState(chosen?.id ?? "")
  const [date, setDate] = React.useState(
    () =>
      dates.find((d) => d.value === request.preferredDay)?.value ??
      (chosen ? dates.find((d) => startTimes(chosen, d.weekday, request.durationMinutes).length) : undefined)?.value ??
      dates[0]?.value ??
      ""
  )
  const [showAll, setShowAll] = React.useState(!request.preferredTimeOfDay)
  const [picked, setTime] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, startSaving] = React.useTransition()
  const [done, setDone] = React.useState<{ message: string } | null>(null)

  const member = staff.find((m) => m.id === staffId)
  const day = dates.find((d) => d.value === date)
  const minutes = request.durationMinutes
  const allTimes = day ? startTimes(member, day.weekday, minutes) : []
  // First only the times inside the customer's preferred time of day.
  const window = request.preferredTimeOfDay ? WINDOWS[request.preferredTimeOfDay] : null
  const windowTimes = window ? allTimes.filter((t) => toMinutes(t) >= window[0] && toMinutes(t) < window[1]) : allTimes
  const times = showAll || !windowTimes.length ? allTimes : windowTimes
  const time = times.includes(picked) ? picked : "" // a time that no longer fits is cleared
  const worksThatDay = !!member && !!day && member.hours.some((h) => h.weekday === day.weekday)

  const close = () => {
    if (done) router.refresh()
    onClose()
  }
  const name = firstName(request.customer)

  return (
    <FlowSheet open onClose={close} title={done ? "Booking confirmed" : `Confirm ${name}'s booking`}>
      {done ? (
        <LetThemKnow name={name} mobile={request.mobile} message={done.message} onDone={close} />
      ) : (
        <>
          <FieldBlock id="confirm-date" label="Date">
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger id="confirm-date" className={selectCls}>
                <SelectValue placeholder="Pick a date" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {dates.map((d) => (
                  <SelectItem key={d.value} value={d.value} className="text-base">
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>
          <FieldBlock id="confirm-staff" label="Team member">
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger id="confirm-staff" className={selectCls}>
                <SelectValue placeholder="Pick a team member" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-base">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>
          <FieldBlock
            id="confirm-time"
            label="Time"
            error={
              member && day && !worksThatDay
                ? `${member.name} doesn't work on this day. Pick another day or team member.`
                : member && day && !times.length
                  ? `${member.name} has no opening long enough on this day. Pick another day or team member.`
                  : null
            }
          >
            <Select value={time} onValueChange={setTime} disabled={!times.length}>
              <SelectTrigger id="confirm-time" className={selectCls}>
                <SelectValue placeholder="Pick a time" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {times.map((t) => (
                  <SelectItem key={t} value={t} className="text-base">
                    {time12(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>
          {!showAll && windowTimes.length && windowTimes.length < allTimes.length ? (
            <button type="button" onClick={() => setShowAll(true)} className={cn(linkCls, "-mt-3 self-start")}>
              Show all times
            </button>
          ) : null}
          <p className="text-base text-muted-foreground">Takes about {duration(minutes)}</p>
          {error ? (
            <p role="alert" className="flex items-start gap-2 text-base text-destructive">
              <CircleAlertIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}
          <PrimaryAction
            blocked={!staffId || !date || !time}
            loading={saving}
            loadingText="Saving…"
            onClick={() => {
              if (!staffId || !date || !time) return
              startSaving(async () => {
                setError(null)
                try {
                  const res = await confirmRequest({ bookingId: request.id, date, time, staffId })
                  if (res.ok) setDone({ message: res.message })
                  else setError(res.error)
                } catch {
                  setError("We couldn't save. Check your connection and tap Try again.")
                }
              })
            }}
          >
            Confirm booking
          </PrimaryAction>
        </>
      )}
    </FlowSheet>
  )
}

const REASONS = ["Fully booked", "Service not available", "Other"]

function DeclineSheet(props: { request: RequestCard | null; onClose: () => void; business: string }) {
  if (!props.request) return <FlowSheet open={false} onClose={props.onClose} title="">{null}</FlowSheet>
  return <DeclineBody key={props.request.id} {...props} request={props.request} />
}

function DeclineBody({ request, onClose, business }: { request: RequestCard; onClose: () => void; business: string }) {
  const router = useRouter()
  const [reason, setReason] = React.useState("")
  const [note, setNote] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, startSaving] = React.useTransition()
  const [done, setDone] = React.useState(false)

  const close = () => {
    if (done) router.refresh()
    onClose()
  }
  const name = firstName(request.customer)
  const message = `Hi ${name}, this is ${business}. Sorry, we can't take your request for ${request.service} at that time. Reply or message us to find another schedule.${
    request.ticketUrl ? ` Your ticket: ${request.ticketUrl}` : ""
  }`

  return (
    <FlowSheet open onClose={close} title={done ? "Request declined" : `Decline ${name}'s request`}>
      {done ? (
        <LetThemKnow name={name} mobile={request.mobile} message={message} onDone={close} />
      ) : (
        <>
          <FieldBlock label="Reason">
            <ChoiceChips label="Reason" options={REASONS} value={reason} onChange={setReason} />
          </FieldBlock>
          {reason === "Other" ? (
            <FieldBlock id="decline-note" label="Note (optional)" helper="Only you can see this.">
              <Textarea
                id="decline-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="rounded-xl bg-card px-3.5 py-3 text-base md:text-base"
              />
            </FieldBlock>
          ) : null}
          {error ? (
            <p role="alert" className="text-base text-destructive">
              {error}
            </p>
          ) : null}
          <PrimaryAction
            blocked={!reason}
            loading={saving}
            loadingText="Saving…"
            onClick={() => {
              if (!reason) return
              startSaving(async () => {
                setError(null)
                try {
                  const res = await declineRequest({ bookingId: request.id, reason, note })
                  if (res.ok) setDone(true)
                  else setError(res.error)
                } catch {
                  setError("We couldn't save. Check your connection and tap Try again.")
                }
              })
            }}
          >
            Decline request
          </PrimaryAction>
        </>
      )}
    </FlowSheet>
  )
}
