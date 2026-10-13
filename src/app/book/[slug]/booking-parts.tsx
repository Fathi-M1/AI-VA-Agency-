"use client"

// Building blocks of the "Tap it or tell it" booking page. Adapted from installed
// shadcn primitives (MIT): Input, Textarea, Checkbox; Lucide icons (ISC). Selected
// states use the business's brand color (var(--brand)), only on customer pages.
import * as React from "react"
import { CheckIcon, MinusIcon, PlusIcon, UsersIcon } from "lucide-react"

import { duration, peso } from "@/lib/format"
import {
  computeEstimate,
  keyDetails,
  shortLabel,
  TIMES_OF_DAY,
  type Answers,
  type BookingSpec,
  type DayOption,
  type SpecQuestion,
  type SpecService,
  type TimeOfDay,
} from "@/lib/booking-engine"
import { cn } from "@/lib/utils"

export const brandBtn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-6 text-base font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)] transition hover:brightness-110 outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_oklch,var(--brand)_45%,transparent)] disabled:opacity-50"

export const tileCls = (selected: boolean, disabled = false) =>
  cn(
    "relative flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_oklch,var(--brand)_40%,transparent)]",
    selected
      ? "border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_8%,var(--card))] ring-1 ring-[var(--brand)]"
      : "border-border/80 hover:border-[color-mix(in_oklch,var(--brand)_45%,transparent)]",
    disabled && "cursor-not-allowed opacity-45 hover:border-border/80"
  )

export const highlightCls = "animate-[pulse_1s_ease-in-out_2] bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] rounded-2xl motion-reduce:animate-none"

const Check = () => (
  <span aria-hidden="true" className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-[var(--brand)] text-white">
    <CheckIcon className="size-3.5" />
  </span>
)

export function serviceMeta(s: SpecService) {
  if (s.pricing_type === "by_hair_length" && s.variants) {
    const v = Object.values(s.variants)
    const prices = v.map((x) => x.price_php).filter((p): p is number => p !== null)
    const mins = v.map((x) => x.duration_minutes)
    return {
      time: `${duration(Math.min(...mins))} – ${duration(Math.max(...mins))}`,
      price: prices.length ? `From ${peso(Math.min(...prices))}` : "Price on request",
    }
  }
  const unit = s.pricing_type === "per_unit" ? " per unit" : ""
  return { time: `${duration(s.duration_minutes)}${unit}`, price: s.price_php === null ? "Price on request" : `${peso(s.price_php)}${unit}` }
}

export function ServiceTiles({ spec, value, onPick }: { spec: BookingSpec; value?: string; onPick: (name: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Service" className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
      {spec.services.map((s) => {
        const meta = serviceMeta(s)
        const selected = value === s.name
        return (
          <button key={s.name} type="button" role="radio" aria-checked={selected} onClick={() => onPick(s.name)} className={tileCls(selected)}>
            <span className="min-w-0 flex-1 pr-6">
              <span className="block text-base font-semibold">{s.name}</span>
              <span className="mt-0.5 flex flex-wrap justify-between gap-x-3 text-sm text-muted-foreground">
                <span>{meta.time}</span>
                <span className="font-medium text-foreground">{meta.price}</span>
              </span>
            </span>
            {selected ? <Check /> : null}
          </button>
        )
      })}
    </div>
  )
}

export function OptionTiles({
  q,
  value,
  onPick,
  icons,
}: {
  q: SpecQuestion
  value?: string
  onPick: (v: string) => void
  icons?: Record<string, React.ReactNode>
}) {
  const options = q.options ?? []
  return (
    <div role="radiogroup" aria-label={q.ask} className={cn("grid gap-2.5", options.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
      {options.map((o) => {
        const d = q.option_details?.[o]
        const selected = value === o
        return (
          <button key={o} type="button" role="radio" aria-checked={selected} onClick={() => onPick(o)} className={tileCls(selected)}>
            {icons?.[o] ? <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-foreground">{icons[o]}</span> : null}
            <span className="min-w-0 flex-1 pr-6">
              <span className="block text-base font-semibold">{d?.hint ? shortLabel(o) : o}</span>
              {d?.hint ? <span className="block text-sm text-muted-foreground">{d.hint}</span> : null}
            </span>
            {selected ? <Check /> : null}
          </button>
        )
      })}
    </div>
  )
}

export function NumberStepper({ q, value, onChange }: { q: SpecQuestion; value?: string; onChange: (v: string) => void }) {
  const n = Number(value || q.min)
  const set = (v: number) => onChange(String(Math.min(q.max, Math.max(q.min, v))))
  const btn =
    "flex size-14 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-[var(--brand)] disabled:opacity-40"
  return (
    <div className="flex items-center gap-5" role="group" aria-label={q.ask}>
      <button type="button" className={btn} onClick={() => set(n - 1)} disabled={!!value && n <= q.min} aria-label="One less">
        <MinusIcon className="size-6" aria-hidden="true" />
      </button>
      <output aria-live="polite" className="min-w-14 text-center font-serif text-5xl tabular-nums">
        {value ?? "–"}
      </output>
      <button type="button" className={btn} onClick={() => set(value ? n + 1 : q.min)} disabled={n >= q.max} aria-label="One more">
        <PlusIcon className="size-6" aria-hidden="true" />
      </button>
    </div>
  )
}

export function TeamPicker({ spec, value, onPick }: { spec: BookingSpec; value: string; onPick: (id: string) => void }) {
  const people = [{ id: "any", name: "Anyone available" }, ...spec.staff.map((m) => ({ id: m.id, name: m.name }))]
  return (
    <div role="radiogroup" aria-label={`Choose your ${spec.staffRole.toLowerCase()}`} className="flex flex-wrap gap-3">
      {people.map((p) => {
        const selected = value === p.id
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onPick(p.id)}
            className="flex w-20 flex-col items-center gap-1.5 rounded-2xl p-1 outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_oklch,var(--brand)_40%,transparent)]"
          >
            <span
              className={cn(
                "flex size-14 items-center justify-center rounded-full border font-serif text-xl transition",
                selected ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-border bg-card text-foreground"
              )}
            >
              {p.id === "any" ? <UsersIcon className="size-6" aria-hidden="true" /> : p.name.charAt(0).toUpperCase()}
            </span>
            <span className={cn("text-center text-sm leading-tight", selected && "font-semibold")}>{p.name}</span>
          </button>
        )
      })}
    </div>
  )
}

export function DayChips({
  days,
  value,
  isOpen,
  onPick,
}: {
  days: DayOption[]
  value?: string
  isOpen: (d: DayOption) => boolean
  onPick: (v: string) => void
}) {
  return (
    <div role="radiogroup" aria-label="Day" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
      {days.map((d) => {
        const open = isOpen(d)
        const selected = value === d.value
        return (
          <button
            key={d.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${d.long}${open ? "" : ", closed"}`}
            disabled={!open}
            onClick={() => onPick(d.value)}
            className={cn(
              "flex min-h-16 min-w-[4.75rem] shrink-0 flex-col items-center justify-center rounded-2xl border px-3 text-base transition",
              selected
                ? "border-[var(--brand)] bg-[var(--brand)] font-semibold text-white"
                : open
                  ? "border-border/80 bg-card hover:border-[color-mix(in_oklch,var(--brand)_45%,transparent)]"
                  : "cursor-not-allowed border-dashed border-border bg-muted/40 text-muted-foreground"
            )}
          >
            <span>{d.label}</span>
            {!open ? <span className="text-xs">Closed</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export function TimeOfDayTiles({ value, open, onPick }: { value?: TimeOfDay; open: TimeOfDay[]; onPick: (t: TimeOfDay) => void }) {
  return (
    <div role="radiogroup" aria-label="Time of day" className="grid grid-cols-3 gap-2.5">
      {TIMES_OF_DAY.map((t) => {
        const enabled = open.includes(t.key)
        const selected = value === t.key
        return (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={!enabled}
            onClick={() => onPick(t.key)}
            className={cn(tileCls(selected, !enabled), "justify-center text-center")}
          >
            <span className="text-base font-semibold">{t.label}</span>
            {selected ? <Check /> : null}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- receipt */

export type ReceiptLine = { label: string; value: string }

export function receiptOf(spec: BookingSpec, answers: Answers, staffName: string | null, dayLabel: string | null, tod: TimeOfDay | undefined) {
  const est = computeEstimate(spec, answers)
  const lines: ReceiptLine[] = []
  if (answers.service) lines.push({ label: "Service", value: answers.service })
  const details = keyDetails(spec, answers)
  if (details.length) lines.push({ label: "Details", value: details.join(" · ") })
  if (staffName) lines.push({ label: spec.staffRole, value: staffName })
  if (dayLabel) lines.push({ label: "When", value: [dayLabel, tod ? TIMES_OF_DAY.find((t) => t.key === tod)!.label : ""].filter(Boolean).join(" · ") })
  return {
    est,
    lines,
    summary: [answers.service, ...details].filter(Boolean).join(" · "),
    price: est ? (est.price === null ? "Price on request" : peso(est.price)) : null,
    time: est ? `about ${duration(est.duration_minutes)}` : null,
  }
}

export function ReceiptBody({ receipt, business }: { receipt: ReturnType<typeof receiptOf>; business: string }) {
  if (!receipt.lines.length) return <p className="text-base text-muted-foreground">Pick a service to see your estimate.</p>
  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col divide-y divide-border/70">
        {receipt.lines.map((l) => (
          <div key={l.label} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2 text-base">
            <dt className="text-muted-foreground">{l.label}</dt>
            <dd className="font-medium break-words">{l.value}</dd>
          </div>
        ))}
        {receipt.est ? (
          <>
            <div className="grid grid-cols-[6.5rem_1fr] gap-3 py-2 text-base">
              <dt className="text-muted-foreground">Time</dt>
              <dd className="font-medium">{receipt.time}</dd>
            </div>
            <div className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 py-2">
              <dt className="text-base text-muted-foreground">Price</dt>
              <dd className="font-serif text-3xl leading-none">{receipt.price}</dd>
            </div>
          </>
        ) : null}
      </dl>
      {receipt.est?.notes.map((n) => (
        <p key={n} className="rounded-xl bg-[color-mix(in_oklch,var(--warning)_14%,var(--card))] px-3 py-2 text-sm">
          {n}
        </p>
      ))}
      <p className="text-sm text-muted-foreground">Estimate — {business} confirms the final price.</p>
    </div>
  )
}
