"use client"

// "Tap it or tell it" (Part B): a tap-through booking flow the AI helps with.
// Every step is generated from the business's pack + services + team + hours.
// Phone (<768): one step at a time, progress dots, sticky receipt bar + Next, floating
// "Ask us" pill. 768–899: all steps as numbered sections, sticky receipt bar + pill.
// ≥900: sections on the left (7/12); sticky receipt + Ask panel on the right (5/12).
import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronLeftIcon, ChevronUpIcon, MessageCircleQuestionIcon, PencilLineIcon, TriangleAlertIcon, WandIcon } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { FieldBlock, inputCls } from "@/components/flow/flow-ui"
import { ResponsiveSheet } from "@/components/flow/responsive-sheet"
import {
  activeQuestions,
  openTimesOfDay,
  pruneAnswers,
  worksOn,
  type Answers,
  type Fill,
  type TimeOfDay,
} from "@/lib/booking-engine"
import { normalizeMobile } from "@/lib/format"
import type { Storefront } from "@/server/booking-page"
import { cn } from "@/lib/utils"

import { submitRequest } from "./actions"
import { StorefrontHeader } from "./storefront-header"
import { AskPanel, useAsk } from "./ask-panel"
import {
  brandBtn,
  DayChips,
  highlightCls,
  NumberStepper,
  OptionTiles,
  ReceiptBody,
  receiptOf,
  ServiceTiles,
  TeamPicker,
  TimeOfDayTiles,
} from "./booking-parts"

type StepKey = "service" | "details" | "who" | "you"
const STEP_TITLE: Record<StepKey, string> = { service: "Service", details: "Details", who: "Who & when", you: "Your details" }

export function BookingPage({
  store,
  optionIcons,
  prefill,
}: {
  store: Storefront
  optionIcons: Record<string, Record<string, React.ReactNode>>
  prefill: Fill
}) {
  const router = useRouter()
  const spec = store.spec
  const soloStaff = spec.staff.length <= 1
  const [sessionId] = React.useState(() => crypto.randomUUID())
  const [answers, setAnswers] = React.useState<Answers>(prefill.answers)
  const [staffId, setStaffId] = React.useState<string>(soloStaff ? (spec.staff[0]?.id ?? "any") : (prefill.staffId ?? "any"))
  const [day, setDay] = React.useState<string | undefined>(prefill.day)
  const [tod, setTod] = React.useState<TimeOfDay | undefined>(prefill.timeOfDay)
  const [name, setName] = React.useState("")
  const [mobile, setMobile] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [consent, setConsent] = React.useState(false)
  const [learnMore, setLearnMore] = React.useState(false)
  const [phoneStep, setPhoneStep] = React.useState(0)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [emergency, setEmergency] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [highlight, setHighlight] = React.useState<Set<string>>(new Set())
  const [magic, setMagic] = React.useState("")
  const [magicBusy, setMagicBusy] = React.useState(false)
  const [magicError, setMagicError] = React.useState<string | null>(null)
  const [unsure, setUnsure] = React.useState<Record<string, { open: boolean; text: string; busy: boolean; note?: string }>>({})
  const [receiptOpen, setReceiptOpen] = React.useState(false)
  const [askOpen, setAskOpen] = React.useState(false)
  const [submitting, startSubmit] = React.useTransition()
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const topRef = React.useRef<HTMLDivElement>(null)

  const showEmergency = React.useCallback((text: string) => {
    setEmergency(text)
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }, [])
  const ask = useAsk(store.slug, sessionId, showEmergency)

  /* ---------------------------------------------------------------- derived */

  const staffFilter = staffId !== "any" ? staffId : null
  const dayOpt = store.days.find((d) => d.value === day)
  const openTods = dayOpt ? openTimesOfDay(spec, staffFilter, dayOpt.weekday) : []
  const detailQs = activeQuestions(spec, answers).filter((q) => q.id !== "service" && !q.isStaff)
  const hasDetails = answers.service ? detailQs.length > 0 : spec.questions.some((q) => q.id !== "service" && !q.isStaff && !q.skip)
  const steps: StepKey[] = ["service", ...(hasDetails ? (["details"] as const) : []), "who", "you"]
  const staffName = soloStaff ? null : staffId === "any" ? "Anyone available" : spec.staff.find((m) => m.id === staffId)?.name ?? null
  const receipt = receiptOf(spec, answers, staffName, dayOpt?.long ?? null, tod)

  const stepErrors = (k: StepKey): Record<string, string> => {
    const e: Record<string, string> = {}
    if (k === "service" && !answers.service) e.service = "Pick a service."
    if (k === "details")
      for (const q of detailQs) if (q.required && !answers[q.id]) e[q.id] = q.type === "text" ? "Please fill this in." : "Pick one."
    if (k === "who") {
      if (!day) e.day = "Pick a day."
      if (!tod) e.time_of_day = "Pick a time of day."
    }
    if (k === "you") {
      if (!name.trim()) e.name = "Enter your name."
      if (!normalizeMobile(mobile)) e.mobile = "Enter an 11-digit mobile number starting with 09."
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Enter a valid email, or leave it blank."
      if (store.requiresConsent && !consent) e.consent = "Please tick the box to agree."
    }
    return e
  }
  const complete = (k: StepKey) => Object.keys(stepErrors(k)).length === 0
  const reachable = (i: number) => steps.slice(0, i).every(complete)

  /* ---------------------------------------------------------------- updates */

  const clearError = (...keys: string[]) =>
    setErrors((e) => {
      if (!keys.some((k) => k in e)) return e
      const n = { ...e }
      for (const k of keys) delete n[k]
      return n
    })

  const setAnswer = (id: string, value: string) => {
    setAnswers((a) => pruneAnswers(spec, { ...a, [id]: value }))
    clearError(id)
  }

  const pickStaff = (id: string) => {
    setStaffId(id)
    const f = id !== "any" ? id : null
    // Keep the day / time only if this person works then.
    if (dayOpt && !worksOn(spec, f, dayOpt.weekday)) {
      setDay(undefined)
      setTod(undefined)
    } else if (dayOpt && tod && !openTimesOfDay(spec, f, dayOpt.weekday).includes(tod)) setTod(undefined)
  }

  const pickDay = (v: string) => {
    setDay(v)
    clearError("day")
    const d = store.days.find((x) => x.value === v)!
    if (tod && !openTimesOfDay(spec, staffFilter, d.weekday).includes(tod)) setTod(undefined)
  }

  const flash = (keys: string[]) => {
    setHighlight(new Set(keys))
    setTimeout(() => setHighlight(new Set()), 2000)
  }

  const goToStep = (i: number) => {
    setPhoneStep(i)
    requestAnimationFrame(() => document.getElementById(`step-${steps[i]}`)?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  /* ---------------------------------------------------------------- AI */

  const magicFill = async (text: string) => {
    const t = text.trim()
    if (!t || magicBusy) return
    setMagicBusy(true)
    setMagicError(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/book/${encodeURIComponent(store.slug)}/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text: t }),
      })
      const data = (await res.json()) as {
        emergency?: string
        intent?: "booking" | "question"
        filled?: Fill
        missing?: string[]
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? "failed")
      if (data.emergency) return showEmergency(data.emergency)
      if (data.intent === "question") {
        setMagic("")
        setAskOpen(true)
        ask.send(t, store.requiresConsent)
        return
      }
      const f = data.filled!
      const keys = Object.keys(f.answers)
      const next = pruneAnswers(spec, { ...answers, ...f.answers })
      setAnswers(next)
      if (f.staffId && !soloStaff) {
        setStaffId(f.staffId)
        keys.push("staff")
      }
      if (f.day) {
        setDay(f.day)
        keys.push("day")
      }
      if (f.timeOfDay) {
        setTod(f.timeOfDay)
        keys.push("time_of_day")
      }
      flash(keys)
      setNotice(keys.length ? `We filled in ${keys.length} ${keys.length === 1 ? "detail" : "details"}. Check them and tap Next.` : "We couldn't fill anything in. Pick from the options below.")
      setMagic("")
      // Jump to the first step with something missing.
      const missing = data.missing ?? []
      const stepOf = (m: string): StepKey => (m === "service" ? "service" : m === "day" || m === "time_of_day" ? "who" : "details")
      const target = missing.length ? stepOf(missing[0]) : "you"
      const nextSteps: StepKey[] = ["service", ...(activeQuestions(spec, next).some((q) => q.id !== "service" && !q.isStaff) ? (["details"] as const) : []), "who", "you"]
      const i = Math.max(0, nextSteps.indexOf(target))
      goToStep(i)
    } catch {
      setMagicError("We couldn't read that just now. Try again, or pick from the options below.")
    } finally {
      setMagicBusy(false)
    }
  }

  const notSure = async (qid: string) => {
    const u = unsure[qid]
    if (!u?.text.trim()) return
    setUnsure((s) => ({ ...s, [qid]: { ...u, busy: true, note: undefined } }))
    try {
      const res = await fetch(`/api/book/${encodeURIComponent(store.slug)}/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text: u.text, questionId: qid }),
      })
      const data = (await res.json()) as { picked?: string | null; emergency?: string }
      if (!res.ok) throw new Error("failed")
      if (data.emergency) {
        showEmergency(data.emergency)
        setUnsure((s) => ({ ...s, [qid]: { ...u, busy: false } }))
        return
      }
      if (data.picked) {
        if (qid === "service") setAnswers((a) => pruneAnswers(spec, { ...a, service: data.picked! }))
        else setAnswer(qid, data.picked)
        flash([qid])
      }
      setUnsure((s) => ({
        ...s,
        [qid]: {
          open: true,
          text: "",
          busy: false,
          note: data.picked
            ? `We picked '${data.picked}' from your description. Change it anytime.`
            : `We couldn't tell. Pick the closest one, and ${store.name} will check.`,
        },
      }))
    } catch {
      setUnsure((s) => ({ ...s, [qid]: { ...u, busy: false, note: "Something went wrong. Try again." } }))
    }
  }

  /* ---------------------------------------------------------------- submit */

  const submit = () => {
    const all = Object.assign({}, ...steps.map(stepErrors)) as Record<string, string>
    if (Object.keys(all).length) {
      setErrors(all)
      const first = steps.findIndex((k) => !complete(k))
      if (first >= 0) goToStep(first)
      return
    }
    startSubmit(async () => {
      setSubmitError(null)
      try {
        const res = await submitRequest(store.slug, {
          sessionId,
          answers,
          staffId,
          day: day!,
          timeOfDay: tod!,
          name,
          mobile,
          email,
          consent,
        })
        if (res.ok) return router.push(`/book/${store.slug}/t/${res.token}`)
        if ("emergency" in res) return showEmergency(res.emergency)
        if ("errors" in res) {
          setErrors(res.errors)
          const first = steps.findIndex((k) => stepErrorsKeys(k).some((e) => e in res.errors))
          if (first >= 0) goToStep(first)
          return
        }
        setSubmitError(res.error)
      } catch {
        setSubmitError("We couldn't send your request. Check your connection and try again.")
      }
    })
  }
  const stepErrorsKeys = (k: StepKey) =>
    k === "service" ? ["service"] : k === "details" ? detailQs.map((q) => q.id) : k === "who" ? ["day", "time_of_day", "staff"] : ["name", "mobile", "email", "consent"]

  const next = () => {
    const k = steps[phoneStep]
    const e = stepErrors(k)
    if (Object.keys(e).length) return setErrors((x) => ({ ...x, ...e }))
    if (phoneStep < steps.length - 1) goToStep(phoneStep + 1)
    else submit()
  }

  /* ---------------------------------------------------------------- render */

  const hl = (key: string) => (highlight.has(key) ? highlightCls : "")
  const err = (key: string) =>
    errors[key] ? (
      <p role="alert" className="mt-2 text-sm text-destructive">
        {errors[key]}
      </p>
    ) : null

  // A render helper (not a component) so its input keeps focus across re-renders.
  const unsureLink = (qid: string, prompt: string) => {
    const u = unsure[qid]
    return (
      <div className="mt-3">
        {u?.note ? <p className="mb-2 text-sm text-muted-foreground">{u.note}</p> : null}
        {u?.open ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              notSure(qid)
            }}
            className="flex gap-2"
          >
            <label htmlFor={`unsure-${qid}`} className="sr-only">
              Describe it in your own words
            </label>
            <Input
              id={`unsure-${qid}`}
              autoFocus
              value={u.text}
              onChange={(e) => setUnsure((s) => ({ ...s, [qid]: { ...u, text: e.target.value } }))}
              placeholder="Describe it in your own words"
              className={inputCls}
            />
            <button type="submit" disabled={u.busy || !u.text.trim()} className={cn(brandBtn, "min-h-12 shrink-0 px-4")}>
              {u.busy ? <Spinner /> : null} Pick for me
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setUnsure((s) => ({ ...s, [qid]: { open: true, text: "", busy: false } }))}
            className="min-h-11 text-base font-medium text-[var(--brand)] underline-offset-4 hover:underline"
          >
            {prompt}
          </button>
        )}
      </div>
    )
  }

  const serviceQ = spec.questions.find((q) => q.id === "service")
  const sections: Record<StepKey, React.ReactNode> = {
    service: (
      <div className={hl("service")}>
        <ServiceTiles
          spec={spec}
          value={answers.service}
          onPick={(s) => {
            setAnswers((a) => pruneAnswers(spec, { ...a, service: s }))
            clearError("service")
          }}
        />
        {err("service")}
        {serviceQ?.help_prompt ? unsureLink("service", serviceQ.help_prompt) : null}
      </div>
    ),
    details: (
      <div className="flex flex-col gap-8">
        {!answers.service ? <p className="text-base text-muted-foreground">Pick a service first.</p> : null}
        {detailQs.map((q) => (
          <div key={q.id} className={hl(q.id)}>
            {q.type === "text" ? (
              <FieldBlock
                id={`q-${q.id}`}
                label={`${q.ask}${q.required ? "" : " (optional)"}`}
                helper={q.multiline ? "A few words is enough." : undefined}
                error={errors[q.id]}
              >
                {q.multiline ? (
                  <Textarea
                    id={`q-${q.id}`}
                    rows={3}
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    className="rounded-xl bg-card px-3.5 py-3 text-base md:text-base"
                  />
                ) : (
                  <Input id={`q-${q.id}`} value={answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} className={inputCls} />
                )}
              </FieldBlock>
            ) : (
              <>
                <p className="mb-3 text-base font-medium">{q.ask}</p>
                {q.type === "number" ? (
                  <NumberStepper q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
                ) : (
                  <OptionTiles q={q} value={answers[q.id]} onPick={(v) => setAnswer(q.id, v)} icons={optionIcons[q.id]} />
                )}
                {err(q.id)}
                {q.help_prompt && q.options ? unsureLink(q.id, q.help_prompt) : null}
              </>
            )}
          </div>
        ))}
      </div>
    ),
    who: (
      <div className="flex flex-col gap-7">
        {!soloStaff ? (
          <div className={hl("staff")}>
            <p className="mb-3 text-base font-medium">Who would you like?</p>
            <TeamPicker spec={spec} value={staffId} onPick={pickStaff} />
          </div>
        ) : null}
        <div className={hl("day")}>
          <p className="mb-3 text-base font-medium">Day</p>
          <DayChips days={store.days} value={day} isOpen={(d) => worksOn(spec, staffFilter, d.weekday)} onPick={pickDay} />
          {err("day")}
        </div>
        <div className={hl("time_of_day")}>
          <p className="mb-3 text-base font-medium">Time of day</p>
          {dayOpt ? (
            <TimeOfDayTiles
              value={tod}
              open={openTods}
              onPick={(t) => {
                setTod(t)
                clearError("time_of_day")
              }}
            />
          ) : (
            <p className="text-base text-muted-foreground">Pick a day first.</p>
          )}
          {err("time_of_day")}
        </div>
        <p className="text-base text-muted-foreground">{store.name} will confirm the exact time.</p>
      </div>
    ),
    you: (
      <div className="flex flex-col gap-6">
        <FieldBlock id="c-name" label="Your name" error={errors.name}>
          <Input id="c-name" value={name} autoComplete="name" onChange={(e) => (setName(e.target.value), clearError("name"))} className={inputCls} />
        </FieldBlock>
        <FieldBlock id="c-mobile" label="Mobile number" helper="We'll use it to confirm your booking." error={errors.mobile}>
          <Input
            id="c-mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={mobile}
            onChange={(e) => (setMobile(e.target.value), clearError("mobile"))}
            className={cn(inputCls, "tabular-nums")}
          />
        </FieldBlock>
        <FieldBlock id="c-email" label="Email (optional)" error={errors.email}>
          <Input id="c-email" type="email" autoComplete="email" value={email} onChange={(e) => (setEmail(e.target.value), clearError("email"))} className={inputCls} />
        </FieldBlock>
        {store.requiresConsent ? (
          <div>
            <label className="flex items-start gap-3 text-base">
              <Checkbox
                checked={consent}
                onCheckedChange={(v) => (setConsent(v === true), clearError("consent"))}
                className="mt-0.5 size-6 data-[state=checked]:border-[var(--brand)] data-[state=checked]:bg-[var(--brand)]"
                aria-describedby={errors.consent ? "consent-error" : undefined}
              />
              <span>I agree that {store.name} may use my details, including health information I share, only to handle my appointment.</span>
            </label>
            {learnMore ? (
              <p className="mt-2 ml-9 text-base text-muted-foreground">
                We keep your name, mobile number, and what you share about your visit. {store.name} can see these details so they can
                handle your appointment. To have them deleted, contact {store.name} directly.
              </p>
            ) : (
              <button type="button" onClick={() => setLearnMore(true)} className="mt-1 ml-9 min-h-11 text-base font-medium text-[var(--brand)] underline-offset-4 hover:underline">
                Learn more
              </button>
            )}
            {errors.consent ? (
              <p id="consent-error" role="alert" className="mt-1 ml-9 text-sm text-destructive">
                {errors.consent}
              </p>
            ) : null}
          </div>
        ) : null}
        {submitError ? (
          <p role="alert" className="text-base text-destructive">
            {submitError}
          </p>
        ) : null}
      </div>
    ),
  }

  const receiptBar = (
    <button
      type="button"
      onClick={() => setReceiptOpen(true)}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 text-left shadow-sm"
      aria-label="Show the full estimate"
    >
      <span className="min-w-0 flex-1 truncate text-base">{receipt.summary || "Your booking"}</span>
      <span className="shrink-0 text-base font-semibold">{receipt.price ?? "—"}</span>
      <ChevronUpIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  )

  return (
    <div className="min-h-svh bg-background" style={{ "--brand": store.brand } as React.CSSProperties}>
      <div ref={topRef} />
      <StorefrontHeader titleAs="h1" name={store.name} status={store.status} chips={store.chips} address={store.address} />

      {emergency ? (
        <div role="alert" className="border-b border-destructive/30 bg-destructive/10">
          <div className="mx-auto flex w-full max-w-[1280px] items-start gap-3 px-4 py-4 md:px-6 lg:px-10">
            <TriangleAlertIcon className="mt-0.5 size-6 shrink-0 text-destructive" aria-hidden="true" />
            <p className="flex-1 text-base font-medium">{emergency}</p>
            <button type="button" onClick={() => setEmergency(null)} className="min-h-11 shrink-0 text-base text-muted-foreground underline-offset-4 hover:underline">
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[1280px] px-4 pt-6 pb-48 md:px-6 md:pb-40 min-[900px]:grid min-[900px]:grid-cols-12 min-[900px]:gap-10 min-[900px]:pb-16 lg:px-10">
        <main className="min-[900px]:col-span-7">
          {/* Tell us what you need (magic fill) */}
          <section aria-labelledby="magic-h" className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm md:p-5">
            <h2 id="magic-h" className="flex items-center gap-2 text-lg font-semibold">
              <PencilLineIcon className="size-5 text-[var(--brand)]" aria-hidden="true" /> Tell us what you need
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                magicFill(magic)
              }}
              className="mt-3 flex flex-col gap-2 sm:flex-row"
            >
              <label htmlFor="magic" className="sr-only">
                Tell us what you need
              </label>
              <Input id="magic" value={magic} onChange={(e) => setMagic(e.target.value)} placeholder={store.placeholder} className={cn(inputCls, "flex-1")} autoComplete="off" />
              <button type="submit" disabled={magicBusy || !magic.trim()} className={cn(brandBtn, "shrink-0")}>
                {magicBusy ? <Spinner className="size-5" /> : <WandIcon className="size-5" aria-hidden="true" />}
                Fill it for me
              </button>
            </form>
            {magicError ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {magicError}
              </p>
            ) : null}
            {notice ? (
              <p role="status" className="mt-2 text-base text-foreground/85">
                {notice}
              </p>
            ) : null}
          </section>

          {/* Phone: progress dots */}
          <div className="mt-6 flex items-center justify-between md:hidden">
            <p className="text-sm font-medium text-muted-foreground">
              Step {phoneStep + 1} of {steps.length}
            </p>
            <div className="flex gap-1.5" aria-hidden="true">
              {steps.map((k, i) => (
                <span key={k} className={cn("h-2 rounded-full transition-all", i === phoneStep ? "w-6 bg-[var(--brand)]" : i < phoneStep ? "w-2 bg-[var(--brand)]/60" : "w-2 bg-border")} />
              ))}
            </div>
          </div>

          {/* The steps: one at a time on phones; numbered sections from tablet up. */}
          <div className="mt-4 flex flex-col md:mt-8 md:gap-10">
            {steps.map((k, i) => {
              const canReach = reachable(i)
              return (
                <section
                  key={k}
                  id={`step-${k}`}
                  aria-labelledby={`step-${k}-h`}
                  className={cn(
                    "scroll-mt-4 transition-opacity",
                    i !== phoneStep && "max-md:hidden",
                    !canReach && "md:pointer-events-none md:opacity-45"
                  )}
                  aria-disabled={!canReach || undefined}
                >
                  <h2 id={`step-${k}-h`} className="mb-4 flex items-center gap-3 font-serif text-2xl">
                    <span className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] font-sans text-base font-semibold text-white md:flex">
                      {i + 1}
                    </span>
                    {STEP_TITLE[k]}
                  </h2>
                  {sections[k]}
                </section>
              )
            })}
          </div>

          {/* Tablet/laptop: Send at the end */}
          <div className="mt-10 hidden justify-end border-t border-border/70 pt-6 md:flex">
            <button type="button" onClick={submit} disabled={submitting} className={cn(brandBtn, "min-w-52")}>
              {submitting ? <Spinner className="size-5" /> : null}
              {submitting ? "Sending…" : "Send request"}
            </button>
          </div>
        </main>

        {/* ≥900: sticky receipt + Ask panel */}
        <aside className="hidden min-[900px]:col-span-5 min-[900px]:block">
          <div className="sticky top-6 flex flex-col gap-6">
            <section aria-labelledby="receipt-h" className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
              <h2 id="receipt-h" className="mb-3 text-lg font-semibold">
                Your estimate
              </h2>
              <ReceiptBody receipt={receipt} business={store.name} />
            </section>
            <section aria-labelledby="ask-h" className="border-t border-border/70 pt-5">
              <h2 id="ask-h" className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <MessageCircleQuestionIcon className="size-5" aria-hidden="true" /> Questions? Ask us
              </h2>
              <AskPanel ask={ask} business={store.name} starters={store.starters} requiresConsent={store.requiresConsent} onFillForm={magicFill} compact />
            </section>
          </div>
        </aside>
      </div>

      {/* Below 900px: Ask pill + receipt bar (+ Back / Next on phones), stuck to the bottom */}
      <div className="fixed inset-x-0 bottom-0 z-30 min-[900px]:hidden">
        <div className="mx-auto flex w-full max-w-[1280px] justify-end px-4 pb-2 md:px-6">
          <button
            type="button"
            onClick={() => setAskOpen(true)}
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border/80 bg-card px-4 text-base font-medium shadow-lg"
          >
            <MessageCircleQuestionIcon className="size-5 text-[var(--brand)]" aria-hidden="true" /> Ask us
          </button>
        </div>
        <div className="border-t border-border/80 bg-background/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-2 px-4 pt-3 md:px-6">
            {receiptBar}
            <div className="flex items-center gap-3 md:hidden">
              {phoneStep > 0 ? (
                <button type="button" onClick={() => goToStep(phoneStep - 1)} className="inline-flex min-h-12 items-center gap-1 text-base text-muted-foreground">
                  <ChevronLeftIcon className="size-5" aria-hidden="true" /> Back
                </button>
              ) : null}
              <button type="button" onClick={next} disabled={submitting} className={cn(brandBtn, "flex-1")}>
                {submitting ? <Spinner className="size-5" /> : null}
                {phoneStep < steps.length - 1 ? "Next" : submitting ? "Sending…" : "Send request"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ResponsiveSheet open={receiptOpen} onOpenChange={setReceiptOpen} title="Your estimate">
        <ReceiptBody receipt={receipt} business={store.name} />
      </ResponsiveSheet>
      <ResponsiveSheet open={askOpen} onOpenChange={setAskOpen} title="Questions? Ask us">
        <AskPanel
          ask={ask}
          business={store.name}
          starters={store.starters}
          requiresConsent={store.requiresConsent}
          onFillForm={(t) => {
            setAskOpen(false)
            magicFill(t)
          }}
        />
      </ResponsiveSheet>
    </div>
  )
}

