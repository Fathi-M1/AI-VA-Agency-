"use client"

// The five /setup screens: Welcome + steps 1-4. State lives in SetupFlow; each step
// edits the draft through `update` and shows a field's inline instruction once the
// owner has touched it (or tapped the blocked button). Per-type sections come from
// pack flags (accepts_hmo, asks_walk_ins, extra_charges, minimum_booking,
// uses_service_areas) — nothing here checks a business type by name.
// Fewer cards: one surface per section, rows split by hairlines.
import * as React from "react"
import { CheckIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Chips, FieldBlock, inputCls, linkCls, MoneyInput, quietLinkCls, Segmented, selectCls } from "@/components/flow/flow-ui"
import { duration, fromMinutes, time12, WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/format"
import {
  BRAND_COLORS,
  HAIR_LENGTHS,
  HMO_OPTIONS,
  newKey,
  PAYMENT_OPTIONS,
  shiftsOn,
  type DraftService,
  type DraftStaff,
  type Errors,
  type PackLite,
  type SetupDraft,
  type Shift,
  type Vertical,
} from "@/lib/setup"
import { cn } from "@/lib/utils"

export type StepProps = {
  draft: SetupDraft
  update: (patch: Partial<SetupDraft> | ((d: SetupDraft) => Partial<SetupDraft>)) => void
  pack: PackLite | null
  packs: PackLite[]
  icons: Record<string, React.ReactNode>
  errors: Errors
  /** the error for a field, if it should be visible now */
  err: (key: string) => string | null
  touch: (key: string) => void
}

export const STEP_NAMES = ["Business type", "Services", "Team & hours", "Safety basics"]

const Heading = ({ title, sub }: { title: string; sub?: string }) => (
  <header className="mb-7">
    <h1 className="font-serif text-[2rem] leading-[1.1] tracking-[-0.01em] text-foreground lg:text-[2.5rem]">{title}</h1>
    {sub ? <p className="mt-2 max-w-[60ch] text-base text-muted-foreground">{sub}</p> : null}
  </header>
)

/** The one surface per section. */
export const surface =
  "rounded-2xl border border-border/80 bg-card/85 shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_14px_40px_-28px_color-mix(in_oklch,var(--primary)_55%,transparent)] backdrop-blur"

/* ---------------------------------------------------------------- Step 0 */

export function WelcomeStep() {
  const needs = ["The services you offer (prices are optional)", "Who works and when", "Your mobile number"]
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
      <div>
        <Heading title="Set up your AI front desk" />
        <p className="max-w-[60ch] text-lg leading-relaxed text-foreground/85">
          In about 5 minutes, your AI team will start answering customers and taking booking requests for you.
        </p>
        <p className="mt-8 text-base font-semibold">You&apos;ll need:</p>
        <ul className="mt-4 flex flex-col gap-3.5">
          {needs.map((n) => (
            <li key={n} className="flex items-start gap-3 text-base">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--primary)_14%,var(--card))] text-primary">
                <CheckIcon className="size-4" aria-hidden="true" />
              </span>
              {n}
            </li>
          ))}
        </ul>
      </div>
      {/* Laptop: the four steps ahead, on one surface. */}
      <ol className={cn(surface, "hidden flex-col divide-y divide-border/70 lg:flex")} aria-label="The four steps">
        {STEP_NAMES.map((s, i) => (
          <li key={s} className="flex items-center gap-4 px-6 py-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/25 font-serif text-lg text-primary">
              {i + 1}
            </span>
            <span className="text-base font-medium">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ---------------------------------------------------------------- Step 1 */

export function TypeStep({ draft, update, packs, icons, err, touch, onPick }: StepProps & { onPick: (v: Vertical) => void }) {
  const [query, setQuery] = React.useState("")
  const pack = packs.find((p) => p.vertical === draft.vertical) ?? null
  const q = query.trim().toLowerCase()
  const other = packs.find((p) => p.vertical === "other")
  const shown = packs.filter(
    (p) => p.vertical !== "other" && (!q || `${p.display_name} ${p.card_description}`.toLowerCase().includes(q))
  )
  if (other) shown.push(other) // always last, always visible while searching

  return (
    <div>
      <Heading title="What kind of business do you run?" />
      <div className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="type-search" className="sr-only">
          Search your business type
        </label>
        <Input
          id="type-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your business type"
          className={cn(inputCls, "pl-11")}
          autoComplete="off"
        />
      </div>
      <div role="radiogroup" aria-label="Business type" className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => {
          const selected = draft.vertical === p.vertical
          return (
            <button
              key={p.vertical}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onPick(p.vertical)}
              className={cn(
                "relative flex min-h-[8.5rem] flex-col items-start gap-2 rounded-2xl border bg-card/85 p-3.5 text-left transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected ? "border-primary ring-1 ring-primary" : "border-border/80 hover:border-primary/40"
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-xl border border-primary/15 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_8%,white),color-mix(in_oklch,var(--primary)_20%,var(--background)))] text-primary">
                {icons[p.vertical]}
              </span>
              <span className="block pr-6 text-base leading-snug font-semibold">{p.display_name}</span>
              <span className="block text-sm leading-snug text-muted-foreground">{p.card_description}</span>
              {selected ? (
                <span aria-hidden="true" className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <CheckIcon className="size-3.5" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      {q && shown.length === 1 ? (
        <p className="mt-3 text-sm text-muted-foreground">No exact match. &ldquo;Other service business&rdquo; works for any business that takes appointments.</p>
      ) : null}

      <FieldBlock id="business-name" label="Business name" helper="This is what your customers will see." error={err("name")} className="mt-8">
        <Input
          id="business-name"
          value={draft.name}
          maxLength={80}
          placeholder={pack?.name_placeholder ?? "e.g. Santos Dental Clinic"}
          onChange={(e) => update({ name: e.target.value })}
          onBlur={() => touch("name")}
          aria-invalid={!!err("name") || undefined}
          aria-describedby={err("name") ? "business-name-error" : undefined}
          className={inputCls}
          autoComplete="organization"
        />
      </FieldBlock>

      <fieldset className="mt-8">
        <legend className="text-base font-medium">Pick a color for your booking page</legend>
        <div role="radiogroup" aria-label="Booking page color" className="mt-3 flex flex-wrap gap-3">
          {BRAND_COLORS.map((c) => {
            const selected = draft.brandColor === c.hex
            return (
              <button
                key={c.hex}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ brandColor: c.hex })}
                className="flex w-16 flex-col items-center gap-1.5 rounded-xl py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background",
                    selected && "ring-2 ring-foreground"
                  )}
                  style={{ backgroundColor: c.hex }}
                >
                  {selected ? <CheckIcon className="size-5" aria-hidden="true" /> : null}
                </span>
                <span className="text-sm">{c.name}</span>
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}

/* ---------------------------------------------------------------- Step 2 */

const TIME_OPTIONS = Array.from({ length: 32 }, (_, i) => (i + 1) * 15) // 15 min .. 8 hr

function TimeSelect({ id, value, onChange, label }: { id: string; value: number; onChange: (n: number) => void; label: string }) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger id={id} aria-label={label} className={selectCls}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {TIME_OPTIONS.map((n) => (
          <SelectItem key={n} value={String(n)} className="text-base">
            {duration(n)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function blankPriceHint(s: DraftService) {
  return s.typical_range ? `Typical: ${s.typical_range}` : "Leave blank and your AI team will say you'll confirm the price."
}

/** Column labels shown once above the rows on laptop. */
function RowHead({ perUnit }: { perUnit: boolean }) {
  return (
    <div className="hidden grid-cols-[3rem_minmax(0,1fr)_9.5rem_9.5rem] gap-3 border-b border-border/70 px-4 py-2.5 text-sm font-medium text-muted-foreground lg:grid">
      <span className="sr-only">Offered</span>
      <span>Service</span>
      <span>{perUnit ? "Time per unit" : "Time"}</span>
      <span>{perUnit ? "Price per unit" : "Price"}</span>
    </div>
  )
}

function ServiceRow({ s, set, err, touch }: { s: DraftService; set: (patch: Partial<DraftService>) => void; err: StepProps["err"]; touch: StepProps["touch"] }) {
  const [editing, setEditing] = React.useState(false)
  const perUnit = s.pricing_type === "per_unit"
  const timeLabel = perUnit ? "Time per unit" : "Time"
  const priceLabel = perUnit ? "Price per unit" : "Price"
  const anyBlankVariant = s.variants ? HAIR_LENGTHS.some(({ key }) => !s.variants![key].price.trim()) : false
  // Laptop: labels live in the column header, so the fields carry them for screen readers only.
  const labelCls = "lg:sr-only"

  const name = editing ? (
    <Input
      autoFocus
      aria-label="Service name"
      value={s.name}
      onChange={(e) => set({ name: e.target.value })}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
      className={cn(inputCls, "h-11")}
    />
  ) : (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn("min-h-11 w-full rounded-lg text-left text-base font-semibold underline-offset-4 hover:underline", !s.on && "text-muted-foreground")}
      aria-label={`${s.name}. Tap to edit the name.`}
    >
      {s.name || "Untitled service"}
    </button>
  )

  return (
    <li className={cn("px-4 py-4", !s.on && "bg-muted/25")}>
      <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-3 gap-y-4 lg:grid-cols-[3rem_minmax(0,1fr)_9.5rem_9.5rem] lg:items-start">
        <Switch checked={s.on} onCheckedChange={(on) => set({ on })} aria-label={`Offer ${s.name || "this service"}`} className="lg:mt-3" />
        <div className="min-w-0">{name}</div>
        {s.on && !s.variants ? (
          <div className="col-span-2 grid grid-cols-2 gap-3 lg:col-span-2">
            <FieldBlock id={`${s.key}-time`} label={<span className={labelCls}>{timeLabel}</span>}>
              <TimeSelect id={`${s.key}-time`} label={`${s.name} ${timeLabel.toLowerCase()}`} value={s.duration} onChange={(n) => set({ duration: n })} />
            </FieldBlock>
            <FieldBlock id={`${s.key}-price`} label={<span className={labelCls}>{priceLabel}</span>} error={err(`${s.key}-price`)}>
              <MoneyInput
                id={`${s.key}-price`}
                label={`${s.name} ${priceLabel.toLowerCase()}`}
                value={s.price}
                invalid={!!err(`${s.key}-price`)}
                onChange={(v) => set({ price: v })}
                onBlur={() => touch(`${s.key}-price`)}
              />
            </FieldBlock>
          </div>
        ) : null}
      </div>
      {err(`${s.key}-name`) ? <p role="alert" className="mt-1 text-sm text-destructive">{err(`${s.key}-name`)}</p> : null}
      {s.on && !s.variants && !s.price.trim() ? (
        <p className="mt-2 text-sm text-muted-foreground lg:ml-[3.75rem]">{blankPriceHint(s)}</p>
      ) : null}

      {s.on && s.variants ? (
        <div className="mt-3 flex flex-col divide-y divide-border/60 lg:ml-[3.75rem]">
          {HAIR_LENGTHS.map(({ key, label }) => (
            <div key={key} role="group" aria-label={`${s.name}, ${label}`} className="grid grid-cols-2 gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_9.5rem_9.5rem] lg:items-center">
              <p className="col-span-2 text-base font-medium lg:col-span-1">{label}</p>
              <FieldBlock id={`${s.key}-${key}-time`} label={<span className={labelCls}>Time</span>}>
                <TimeSelect
                  id={`${s.key}-${key}-time`}
                  label={`${label} time`}
                  value={s.variants![key].duration}
                  onChange={(n) => set({ variants: { ...s.variants!, [key]: { ...s.variants![key], duration: n } } })}
                />
              </FieldBlock>
              <FieldBlock id={`${s.key}-${key}-price`} label={<span className={labelCls}>Price</span>} error={err(`${s.key}-${key}-price`)}>
                <MoneyInput
                  id={`${s.key}-${key}-price`}
                  label={`${label} price`}
                  value={s.variants![key].price}
                  invalid={!!err(`${s.key}-${key}-price`)}
                  onChange={(v) => set({ variants: { ...s.variants!, [key]: { ...s.variants![key], price: v } } })}
                  onBlur={() => touch(`${s.key}-${key}-price`)}
                />
              </FieldBlock>
            </div>
          ))}
          {anyBlankVariant ? <p className="pt-2 text-sm text-muted-foreground">{blankPriceHint(s)}</p> : null}
        </div>
      ) : null}
    </li>
  )
}

function AddServiceForm({ perUnit, onAdd }: { perUnit: boolean; onAdd: (s: DraftService) => void }) {
  const [name, setName] = React.useState("")
  const [time, setTime] = React.useState(60)
  const [price, setPrice] = React.useState("")
  const [nameErr, setNameErr] = React.useState<string | null>(null)
  const priceOk = price.trim() === "" || /^\d+(\.\d{1,2})?$/.test(price.trim())
  return (
    <div className="flex flex-col gap-4 border-t border-border/70 px-4 py-4">
      <FieldBlock id="new-service-name" label="Name" error={nameErr}>
        <Input id="new-service-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </FieldBlock>
      <div className="grid grid-cols-2 gap-3">
        <FieldBlock id="new-service-time" label={perUnit ? "Time per unit" : "Time"}>
          <TimeSelect id="new-service-time" label="New service time" value={time} onChange={setTime} />
        </FieldBlock>
        <FieldBlock id="new-service-price" label={perUnit ? "Price per unit" : "Price"} error={priceOk ? null : "Enter a price of 0 or more, or leave it blank."}>
          <MoneyInput id="new-service-price" value={price} onChange={setPrice} invalid={!priceOk} />
        </FieldBlock>
      </div>
      <button
        type="button"
        onClick={() => {
          if (!name.trim()) return setNameErr("Add a name for this service.")
          if (!priceOk) return
          onAdd({ key: newKey("svc"), name: name.trim(), on: true, pricing_type: "fixed", duration: time, price: price.trim(), variants: null, typical_range: null })
        }}
        className="min-h-11 self-start rounded-full border border-primary/30 bg-background px-6 text-base font-medium text-primary hover:border-primary/60"
      >
        Add
      </button>
    </div>
  )
}

function AddToList({ id, label, onAdd, placeholder }: { id: string; label: string; onAdd: (v: string) => void; placeholder?: string }) {
  const [v, setV] = React.useState("")
  const add = () => {
    if (v.trim()) onAdd(v.trim())
    setV("")
  }
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        aria-label={label}
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            add()
          }
        }}
        className={inputCls}
      />
      <button type="button" onClick={add} className="min-h-12 shrink-0 rounded-xl border border-primary/30 bg-background px-5 text-base font-medium text-primary hover:border-primary/60">
        Add
      </button>
    </div>
  )
}

export function ServicesStep({ draft, update, pack, err, touch }: StepProps) {
  const [adding, setAdding] = React.useState(false)
  const setService = (key: string, patch: Partial<DraftService>) =>
    update((d) => ({ services: d.services.map((s) => (s.key === key ? { ...s, ...patch } : s)) }))
  const perUnit = draft.services.length > 0 && draft.services.every((s) => s.pricing_type === "per_unit")
  const extraHmos = draft.hmos.filter((h) => !HMO_OPTIONS.includes(h))

  return (
    <div>
      <Heading title="Your services" sub="We added common services. Turn off what you don't offer and add your prices." />
      <section aria-label="Services" className={surface}>
        <RowHead perUnit={perUnit} />
        <ul className="divide-y divide-border/70">
          {draft.services.map((s) => (
            <ServiceRow key={s.key} s={s} set={(p) => setService(s.key, p)} err={err} touch={touch} />
          ))}
        </ul>
        {adding ? (
          <AddServiceForm
            perUnit={perUnit}
            onAdd={(s) => {
              update((d) => ({ services: [...d.services, s] }))
              setAdding(false)
            }}
          />
        ) : (
          <div className="border-t border-border/70 px-4 py-1">
            <button type="button" className={linkCls} onClick={() => setAdding(true)}>
              <PlusIcon className="size-4" aria-hidden="true" /> Add a service
            </button>
          </div>
        )}
      </section>
      {err("services") ? <p role="alert" className="mt-2 text-sm text-destructive">{err("services")}</p> : null}

      <div className="mt-9 grid gap-8 lg:grid-cols-2 lg:gap-x-10">
        <FieldBlock label="How can customers pay?" error={err("payment")} className="lg:col-span-2">
          <Chips
            label="How can customers pay?"
            options={PAYMENT_OPTIONS.map((p) => ({ value: p, label: p }))}
            value={draft.payment}
            onChange={(payment) => {
              update({ payment })
              touch("payment")
            }}
          />
        </FieldBlock>

        {pack?.asks_walk_ins ? (
          <FieldBlock label="Do you accept walk-ins?">
            <Segmented
              label="Do you accept walk-ins?"
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              value={draft.walkIns ? "yes" : "no"}
              onChange={(v) => update({ walkIns: v === "yes" })}
            />
          </FieldBlock>
        ) : null}

        {pack?.accepts_hmo ? (
          <FieldBlock label="Which HMO cards do you accept?" helper="Leave empty if you don't accept HMO cards." className="lg:col-span-2">
            <Chips
              label="Which HMO cards do you accept?"
              options={[...HMO_OPTIONS, ...extraHmos].map((h) => ({ value: h, label: h }))}
              value={draft.hmos}
              onChange={(hmos) => update({ hmos })}
            />
            <AddToList id="hmo-other" label="Add another HMO" placeholder="Add another" onAdd={(h) => update((d) => ({ hmos: d.hmos.includes(h) ? d.hmos : [...d.hmos, h] }))} />
          </FieldBlock>
        ) : null}

        {pack?.extra_charges.length || pack?.minimum_booking ? (
          <fieldset className="grid gap-4 lg:col-span-2 lg:grid-cols-3">
            <legend className="mb-3 text-base font-medium">Extra charges (optional)</legend>
            {pack.extra_charges.map((x) => (
              <FieldBlock key={x.config_key} id={`extra-${x.config_key}`} label={`${x.label}: +₱ per unit`} error={err(`extra-${x.config_key}`)}>
                <MoneyInput
                  id={`extra-${x.config_key}`}
                  value={draft.extras[x.config_key] ?? ""}
                  invalid={!!err(`extra-${x.config_key}`)}
                  onChange={(v) => update((d) => ({ extras: { ...d.extras, [x.config_key]: v } }))}
                  onBlur={() => touch(`extra-${x.config_key}`)}
                />
              </FieldBlock>
            ))}
            {pack.minimum_booking ? (
              <FieldBlock id="minimum" label="Minimum booking amount: ₱" error={err("minimum")}>
                <MoneyInput id="minimum" value={draft.minimum} invalid={!!err("minimum")} onChange={(v) => update({ minimum: v })} onBlur={() => touch("minimum")} />
              </FieldBlock>
            ) : null}
          </fieldset>
        ) : null}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Step 3 */

const SHIFT_TIMES = Array.from({ length: 33 }, (_, i) => fromMinutes(6 * 60 + i * 30)) // 6:00 AM .. 10:00 PM

function ShiftTimeSelect({ id, value, onChange, label }: { id: string; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label} className={selectCls}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {SHIFT_TIMES.map((t) => (
          <SelectItem key={t} value={t} className="text-base">
            {time12(t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ShiftRows({ idPrefix, shifts, onChange, error, dayLabel }: { idPrefix: string; shifts: Shift[]; onChange: (s: Shift[]) => void; error: string | null; dayLabel?: string }) {
  const set = (i: number, patch: Partial<Shift>) => onChange(shifts.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  return (
    <div className="flex flex-col gap-2.5">
      {shifts.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <ShiftTimeSelect id={`${idPrefix}-${i}-start`} label={`${dayLabel ?? ""} shift ${i + 1} start`.trim()} value={s.start} onChange={(v) => set(i, { start: v })} />
          <span aria-hidden="true" className="text-muted-foreground">–</span>
          <ShiftTimeSelect id={`${idPrefix}-${i}-end`} label={`${dayLabel ?? ""} shift ${i + 1} end`.trim()} value={s.end} onChange={(v) => set(i, { end: v })} />
          {i > 0 ? (
            <button
              type="button"
              onClick={() => onChange(shifts.filter((_, j) => j !== i))}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Remove shift ${i + 1}`}
            >
              <XIcon className="size-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ))}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {shifts.length < 2 ? (
        <button type="button" className={linkCls} onClick={() => onChange([...shifts, { start: shifts.at(-1)?.end ?? "13:00", end: "18:00" }])}>
          <PlusIcon className="size-4" aria-hidden="true" /> Add second shift
        </button>
      ) : null}
    </div>
  )
}

function StaffBlock({
  m,
  pack,
  index,
  set,
  onRemove,
  canRemove,
  err,
  touch,
}: {
  m: DraftStaff
  pack: PackLite
  index: number
  set: (patch: Partial<DraftStaff>) => void
  onRemove: () => void
  canRemove: boolean
  err: StepProps["err"]
  touch: StepProps["touch"]
}) {
  const [confirm, setConfirm] = React.useState(false)
  const role = pack.staff_role.toLowerCase()
  const setDays = (vals: string[]) => {
    const days = vals.map(Number).sort((a, b) => a - b)
    const perDay = m.perDay ? Object.fromEntries(days.map((d) => [d, m.perDay![d] ?? m.shifts])) : null
    set({ days, perDay })
    touch(`${m.key}-days`)
  }
  return (
    <li className="flex flex-col gap-5 bg-card/85 p-4 lg:p-5">
      <FieldBlock id={`${m.key}-name`} label="Name" error={err(`${m.key}-name`)}>
        <Input
          id={`${m.key}-name`}
          value={m.name}
          placeholder={pack.staff_name_placeholder}
          onChange={(e) => set({ name: e.target.value })}
          onBlur={() => touch(`${m.key}-name`)}
          aria-invalid={!!err(`${m.key}-name`) || undefined}
          className={inputCls}
        />
      </FieldBlock>

      <FieldBlock label="Working days" error={err(`${m.key}-days`)}>
        <Chips
          label={`Working days for ${m.name || `${role} ${index + 1}`}`}
          options={WEEKDAY_SHORT.map((d, i) => ({ value: String(i), label: d }))}
          value={m.days.map(String)}
          onChange={setDays}
          className="gap-1.5"
          itemClassName="min-w-[2.9rem] px-0"
        />
      </FieldBlock>

      <div className="flex flex-col gap-2">
        <p className="text-base font-medium">Hours</p>
        {m.perDay ? (
          <div className="flex flex-col gap-4">
            {m.days.map((d) => (
              <div key={d} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">{WEEKDAY_LONG[d]}</p>
                <ShiftRows
                  idPrefix={`${m.key}-d${d}`}
                  dayLabel={WEEKDAY_LONG[d]}
                  shifts={shiftsOn(m, d)}
                  onChange={(shifts) => set({ perDay: { ...m.perDay!, [d]: shifts } })}
                  error={err(`${m.key}-day-${d}`)}
                />
              </div>
            ))}
            <button type="button" className={quietLinkCls} onClick={() => set({ perDay: null })}>
              Use the same hours every day
            </button>
          </div>
        ) : (
          <>
            <ShiftRows idPrefix={`${m.key}-s`} shifts={m.shifts} onChange={(shifts) => set({ shifts })} error={err(`${m.key}-shifts`)} />
            {m.days.length > 1 ? (
              <button type="button" className={quietLinkCls} onClick={() => set({ perDay: Object.fromEntries(m.days.map((d) => [d, m.shifts])) })}>
                Set different hours for some days
              </button>
            ) : null}
          </>
        )}
      </div>

      {canRemove ? (
        <>
          <button type="button" className={cn(quietLinkCls, "self-start text-destructive hover:text-destructive")} onClick={() => setConfirm(true)}>
            Remove
          </button>
          <AlertDialog open={confirm} onOpenChange={setConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove {m.name.trim() || `this ${role}`}?</AlertDialogTitle>
                <AlertDialogDescription>Their days and hours will be removed too.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
                <AlertDialogAction className="min-h-11" onClick={onRemove}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </li>
  )
}

export function TeamStep({ draft, update, pack, err, touch }: StepProps) {
  if (!pack) return null
  const role = pack.staff_role.toLowerCase()
  const setMember = (key: string, patch: Partial<DraftStaff>) =>
    update((d) => ({ staff: d.staff.map((m) => (m.key === key ? { ...m, ...patch } : m)) }))
  return (
    <div>
      <Heading title="Your team and hours" sub={`Add each ${role} and when they work.`} />
      {/* One surface; hairlines between members (2 columns on laptop). */}
      <ul className={cn(surface, "grid gap-px overflow-hidden bg-border/70 lg:grid-cols-2")}>
        {draft.staff.map((m, i) => (
          <StaffBlock
            key={m.key}
            m={m}
            pack={pack}
            index={i}
            set={(p) => setMember(m.key, p)}
            canRemove={draft.staff.length > 1}
            onRemove={() => update((d) => ({ staff: d.staff.filter((x) => x.key !== m.key) }))}
            err={err}
            touch={touch}
          />
        ))}
      </ul>
      <button
        type="button"
        className={cn(linkCls, "mt-3")}
        onClick={() =>
          update((d) => {
            const base = d.staff[0]
            const fresh = { key: newKey("staff"), name: "", days: base?.days ?? [], shifts: base?.shifts ?? [], perDay: base?.perDay ?? null }
            return { staff: [...d.staff, fresh] }
          })
        }
      >
        <PlusIcon className="size-4" aria-hidden="true" /> Add another {role}
      </button>

      {pack.uses_service_areas ? (
        <FieldBlock id="areas" label="Areas you serve" helper="Customers outside these areas will be told you'll confirm if you can go." error={err("areas")} className="mt-9 max-w-[640px]">
          {draft.areas.length ? (
            <ul className="flex flex-wrap gap-2">
              {draft.areas.map((a) => (
                <li key={a} className="inline-flex h-11 items-center gap-1 rounded-full border border-primary/40 bg-[color-mix(in_oklch,var(--primary)_10%,var(--card))] pr-1 pl-4 text-base font-medium text-primary">
                  {a}
                  <button
                    type="button"
                    onClick={() => update((d) => ({ areas: d.areas.filter((x) => x !== a) }))}
                    className="flex size-9 items-center justify-center rounded-full hover:bg-primary/10"
                    aria-label={`Remove ${a}`}
                  >
                    <XIcon className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <AddToList
            id="areas"
            label="Type a city or barangay"
            placeholder="Type a city or barangay"
            onAdd={(a) => {
              update((d) => ({ areas: d.areas.some((x) => x.toLowerCase() === a.toLowerCase()) ? d.areas : [...d.areas, a] }))
              touch("areas")
            }}
          />
        </FieldBlock>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------------- Step 4 */

export function SafetyStep({ draft, update, err, touch }: StepProps) {
  // Show the mobile instruction as soon as the typing can't become a valid number.
  const mobileErr = err("mobile") ?? (draft.mobile && !/^0(9\d{0,9})?$/.test(draft.mobile) ? "Enter an 11-digit mobile number starting with 09." : null)
  return (
    <div>
      <Heading title="Safety basics" />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-x-10">
        <FieldBlock id="emergency" label="Emergency message" helper="Your AI team shows this right away if a customer describes an emergency." error={err("emergency")} className="lg:col-span-2">
          <Textarea
            id="emergency"
            value={draft.emergency}
            onChange={(e) => update({ emergency: e.target.value })}
            onBlur={() => touch("emergency")}
            rows={4}
            className="min-h-28 rounded-xl bg-card px-3.5 py-3 text-base md:text-base"
          />
        </FieldBlock>
        <FieldBlock id="mobile" label="Your mobile number" helper="We'll use this for urgent issues. Customers won't see it." error={mobileErr}>
          <Input
            id="mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={11}
            value={draft.mobile}
            onChange={(e) => update({ mobile: e.target.value.replace(/\D/g, "") })}
            onBlur={() => touch("mobile")}
            aria-invalid={!!mobileErr || undefined}
            aria-describedby={mobileErr ? "mobile-error" : undefined}
            className={cn(inputCls, "tabular-nums")}
          />
        </FieldBlock>
        <FieldBlock id="refund" label="Ask me before approving refunds above" helper="Your AI team will never approve refunds on its own." error={err("refundLimit")}>
          <MoneyInput id="refund" value={draft.refundLimit} invalid={!!err("refundLimit")} onChange={(v) => update({ refundLimit: v })} onBlur={() => touch("refundLimit")} />
        </FieldBlock>
        <FieldBlock id="address" label="Business address" helper="Shown on your booking page so customers can find you." error={err("address")}>
          <Input id="address" value={draft.address} onChange={(e) => update({ address: e.target.value })} onBlur={() => touch("address")} className={inputCls} autoComplete="street-address" />
        </FieldBlock>
        <FieldBlock
          id="public-contact"
          label="Number or Messenger link for customers"
          helper="Shown on the customer's booking ticket. Your private mobile above stays hidden."
          error={err("publicContact")}
        >
          <Input
            id="public-contact"
            value={draft.publicContact}
            onChange={(e) => update({ publicContact: e.target.value })}
            onBlur={() => touch("publicContact")}
            aria-invalid={!!err("publicContact") || undefined}
            className={inputCls}
          />
        </FieldBlock>
      </div>
    </div>
  )
}
