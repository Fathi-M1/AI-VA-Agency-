"use client"

// /setup shell (Journey A). The draft is saved to localStorage ("setup-draft") after
// every change, so a refresh never loses progress.
// Phone (<768): top bar (Back · "Step X of 4" · progress), the step, "Need help?" and a
// sticky full-width primary button. Tablet (768–1023): horizontal stepper, full-width
// form, Preview and Need help in dialogs, footer row (Back left, primary right).
// Laptop (≥1024): left rail stepper (240px) · form (max 640px) · sticky right column
// (360px) with the customer preview, the step's tip, and the setup assistant inline.
import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, ChevronLeftIcon, CircleAlertIcon, EyeIcon, SaveIcon } from "lucide-react"

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
import { Progress } from "@/components/ui/progress"
import { FlowCanvas, linkCls, PrimaryAction, quietLinkCls, StickyFooter, useMounted } from "@/components/flow/flow-ui"
import { ResponsiveSheet } from "@/components/flow/responsive-sheet"
import { DRAFT_KEY, emptyDraft, servicesFromPack, staffFromPack, stepErrors, type PackLite, type SetupDraft, type Vertical } from "@/lib/setup"
import { cn } from "@/lib/utils"

import { finishSetup } from "./actions"
import { HelpChat, HelpSheet } from "./help-sheet"
import { CustomerPreview } from "./setup-preview"
import { SafetyStep, ServicesStep, STEP_NAMES, TeamStep, TypeStep, WelcomeStep, type StepProps } from "./setup-steps"

type Step = SetupDraft["step"]

function readDraft(): SetupDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? { ...emptyDraft(), ...(JSON.parse(raw) as SetupDraft) } : null
  } catch {
    return null
  }
}

function writeDraft(d: SetupDraft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    // storage blocked (private mode): the flow still works, it just can't resume
  }
}

/** Fills services, team and emergency message from a business type pack. */
const fillFrom = (pack: PackLite): Partial<SetupDraft> => ({
  filledFor: pack.vertical,
  services: servicesFromPack(pack),
  staff: [staffFromPack(pack)],
  emergency: pack.emergency_instruction,
  areas: [],
  hmos: [],
  extras: {},
  minimum: "",
})

export function SetupFlow({ packs, icons }: { packs: PackLite[]; icons: Record<string, React.ReactNode> }) {
  const router = useRouter()
  // The draft is read from localStorage on the client; nothing renders until mounted,
  // so the server and the first client render agree.
  const ready = useMounted()
  const [draft, setDraft] = React.useState<SetupDraft>(() => (typeof window === "undefined" ? null : readDraft()) ?? emptyDraft())
  const [resumed, setResumed] = React.useState(() => typeof window !== "undefined" && readDraft() !== null)
  const [touched, setTouched] = React.useState<Set<string>>(new Set())
  const [revealAll, setRevealAll] = React.useState(false)
  const [confirmStartOver, setConfirmStartOver] = React.useState(false)
  const [pendingType, setPendingType] = React.useState<Vertical | null>(null)
  const [helpOpen, setHelpOpen] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [saving, startSaving] = React.useTransition()
  const [saveFailed, setSaveFailed] = React.useState(false)
  const topRef = React.useRef<HTMLDivElement>(null)

  const update: StepProps["update"] = React.useCallback((patch) => {
    setDraft((d) => {
      const next = { ...d, ...(typeof patch === "function" ? patch(d) : patch) }
      writeDraft(next)
      return next
    })
  }, [])

  const byType = React.useMemo(() => Object.fromEntries(packs.map((p) => [p.vertical, p])), [packs])
  const pack = draft.vertical ? (byType[draft.vertical] ?? null) : null
  const errors = stepErrors(draft.step, draft, pack)
  const blocked = Object.keys(errors).length > 0
  const err = (key: string) => (errors[key] && (revealAll || touched.has(key)) ? errors[key] : null)
  const touch = React.useCallback((key: string) => setTouched((t) => (t.has(key) ? t : new Set(t).add(key))), [])
  const reached = Math.max(draft.reached ?? 0, draft.step)
  const stepDone = (s: number) => s < reached && Object.keys(stepErrors(s as Step, draft, pack)).length === 0

  const goTo = (step: Step) => {
    update((d) => ({ step, reached: Math.max(d.reached ?? 0, step) }))
    setRevealAll(false)
    setSaveFailed(false)
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 })
      topRef.current?.focus({ preventScroll: true })
    })
  }

  const pickType = (v: Vertical) => {
    if (v === draft.vertical) return
    if (draft.filledFor && draft.filledFor !== v) return setPendingType(v)
    update({ vertical: v })
  }

  const save = () =>
    startSaving(async () => {
      setSaveFailed(false)
      try {
        const res = await finishSetup(draft)
        if (!res.ok) return setSaveFailed(true)
        writeDraft(null)
        router.push("/setup/live")
      } catch {
        setSaveFailed(true)
      }
    })

  const next = () => {
    if (blocked) {
      setRevealAll(true)
      return
    }
    if (draft.step === 0) return goTo(1)
    if (draft.step === 1) {
      if (draft.filledFor !== draft.vertical && pack) update(fillFrom(pack))
      return goTo(2)
    }
    if (draft.step === 2) return goTo(3)
    if (draft.step === 3) return goTo(4)
    save()
  }

  const startOver = () => {
    writeDraft(null)
    setDraft(emptyDraft())
    setTouched(new Set())
    setResumed(false)
    setSaveFailed(false)
  }

  if (!ready) return <FlowCanvas>{null}</FlowCanvas>

  const stepProps: StepProps = { draft, update, pack, packs, icons, errors, err, touch }
  const label = ["Get started", "Continue", "Continue", "Continue", saveFailed ? "Try again" : "Finish setup"][draft.step]
  const tip = draft.step > 0 ? (pack ?? packs[0]).setup_tips[`step${draft.step}` as "step1"] : ""
  const primary = (
    <PrimaryAction blocked={blocked} loading={saving} loadingText="Saving…" onClick={next} className="md:w-auto md:min-w-48 md:px-8">
      {label}
    </PrimaryAction>
  )
  const back =
    draft.step >= 2 ? (
      <button type="button" className={quietLinkCls} onClick={() => goTo((draft.step - 1) as Step)}>
        <ChevronLeftIcon className="size-5" aria-hidden="true" /> Back
      </button>
    ) : null

  const banners = (
    <>
      {resumed ? (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-x-3 rounded-2xl border border-primary/20 bg-[color-mix(in_oklch,var(--primary)_8%,var(--card))] py-1 pr-2 pl-4 text-base">
          <SaveIcon className="size-4 text-primary" aria-hidden="true" />
          <span className="flex-1">We saved your progress.</span>
          <button type="button" className={linkCls} onClick={() => setConfirmStartOver(true)}>
            Start over
          </button>
        </div>
      ) : null}
      {saveFailed ? (
        <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-base text-destructive">
          <CircleAlertIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          We couldn&apos;t save. Check your connection and tap Try again.
        </div>
      ) : null}
    </>
  )

  const stepBody = (
    <div
      ref={topRef}
      tabIndex={-1}
      key={draft.step}
      className="pt-7 pb-6 outline-none animate-in fade-in-0 slide-in-from-right-6 duration-200 motion-reduce:animate-none md:pt-8"
    >
      {draft.step === 0 && <WelcomeStep />}
      {draft.step === 1 && <TypeStep {...stepProps} onPick={pickType} />}
      {draft.step === 2 && <ServicesStep {...stepProps} />}
      {draft.step === 3 && <TeamStep {...stepProps} />}
      {draft.step === 4 && <SafetyStep {...stepProps} />}
    </div>
  )

  return (
    <FlowCanvas>
      <div className="mx-auto flex min-h-svh w-full max-w-[1280px] flex-col px-4 md:px-6 lg:px-10">
        {draft.step === 0 ? (
          // Welcome: phone column; two columns on laptop.
          <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pt-4 md:max-w-none md:pt-12 lg:pt-20">
            {banners}
            {stepBody}
            <StickyFooter className="md:flex-row md:justify-start">{primary}</StickyFooter>
          </div>
        ) : (
          <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[240px_minmax(0,640px)_360px] lg:justify-center lg:gap-10">
            {/* Laptop: left rail stepper */}
            <aside className="hidden lg:block">
              <nav aria-label="Setup steps" className="sticky top-10 pt-10">
                <ol className="flex flex-col gap-1">
                  {STEP_NAMES.map((name, i) => {
                    const s = (i + 1) as Step
                    const current = draft.step === s
                    const done = stepDone(s)
                    return (
                      <li key={name}>
                        <button
                          type="button"
                          disabled={!done && !current}
                          onClick={() => !current && goTo(s)}
                          aria-current={current ? "step" : undefined}
                          className={cn(
                            "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base transition",
                            current ? "bg-card font-semibold shadow-sm ring-1 ring-primary/20" : done ? "hover:bg-card/70" : "text-muted-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm",
                              done ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary text-primary" : "border-border"
                            )}
                          >
                            {done ? <CheckIcon className="size-4" aria-hidden="true" /> : s}
                          </span>
                          {name}
                          {done ? <span className="sr-only"> (done)</span> : null}
                        </button>
                      </li>
                    )
                  })}
                </ol>
                {draft.name.trim() ? <p className="mt-6 border-t border-border/70 px-3 pt-4 text-sm text-muted-foreground">{draft.name.trim()}</p> : null}
              </nav>
            </aside>

            <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pt-4 md:max-w-none md:pt-8 lg:pt-10">
              {/* Phone: Back · Step X of 4 · progress */}
              <div className="md:hidden">
                <div className="flex min-h-11 items-center justify-between gap-3">
                  {back ?? <span />}
                  <p className="text-sm font-medium text-muted-foreground">Step {draft.step} of 4</p>
                </div>
                <Progress
                  value={draft.step * 25}
                  aria-label={`Step ${draft.step} of 4`}
                  className="mt-2 h-1.5 bg-primary/10 [&_[data-slot=progress-indicator]]:bg-primary [&_[data-slot=progress-indicator]]:duration-200 motion-reduce:[&_[data-slot=progress-indicator]]:transition-none"
                />
              </div>
              {/* Tablet: horizontal stepper + Preview */}
              <div className="hidden items-center gap-4 md:flex lg:hidden">
                <ol className="flex flex-1 items-center gap-2" aria-label="Setup steps">
                  {STEP_NAMES.map((name, i) => {
                    const s = i + 1
                    const current = draft.step === s
                    const done = stepDone(s)
                    return (
                      <li key={name} className="flex min-w-0 flex-1 items-center gap-2" aria-current={current ? "step" : undefined}>
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm",
                            done
                              ? "border-primary bg-primary text-primary-foreground"
                              : current
                                ? "border-primary font-semibold text-primary"
                                : "border-border text-muted-foreground"
                          )}
                        >
                          {done ? <CheckIcon className="size-4" aria-hidden="true" /> : s}
                        </span>
                        <span className={cn("truncate text-sm", current ? "font-semibold" : "text-muted-foreground")}>{name}</span>
                      </li>
                    )
                  })}
                </ol>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-primary/25 bg-card px-4 text-base font-medium hover:border-primary/50"
                >
                  <EyeIcon className="size-4" aria-hidden="true" /> Preview
                </button>
              </div>

              {banners}
              {stepBody}

              {/* Phone: sticky. Tablet/laptop: footer row (Back left, primary right). */}
              <StickyFooter className="md:mt-auto md:flex-row md:items-center md:justify-between md:border-t md:border-border/70 md:py-6">
                <span className="hidden md:inline-flex">{back}</span>
                <button type="button" className={cn(linkCls, "self-center md:mr-4 md:ml-auto lg:hidden")} onClick={() => setHelpOpen(true)}>
                  Need help?
                </button>
                {primary}
              </StickyFooter>
            </main>

            {/* Laptop: live preview, tip, and the setup assistant */}
            <aside className="hidden lg:block">
              <div className="sticky top-10 flex flex-col gap-6 pt-10">
                <section aria-labelledby="preview-h">
                  <h2 id="preview-h" className="mb-3 text-base font-semibold">
                    Your customers will see
                  </h2>
                  <CustomerPreview draft={draft} pack={pack} />
                </section>
                <section aria-labelledby="tip-h" className="border-t border-border/70 pt-5">
                  <h2 id="tip-h" className="text-base font-semibold">
                    Tip
                  </h2>
                  <p className="mt-1 text-base text-muted-foreground">{tip}</p>
                  <div className="mt-4">
                    <HelpChat step={draft.step} businessType={pack?.display_name ?? null} compact />
                  </div>
                </section>
              </div>
            </aside>
          </div>
        )}
      </div>

      <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} step={draft.step} tip={tip} businessType={pack?.display_name ?? null} />
      <ResponsiveSheet open={previewOpen} onOpenChange={setPreviewOpen} title="Your customers will see">
        <CustomerPreview draft={draft} pack={pack} />
        <PrimaryAction onClick={() => setPreviewOpen(false)}>Done</PrimaryAction>
      </ResponsiveSheet>

      <AlertDialog open={confirmStartOver} onOpenChange={setConfirmStartOver}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start over? Your saved answers will be cleared.</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">This clears every answer on this device.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Keep my progress</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={startOver}>
              Start over
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingType} onOpenChange={(o) => !o && setPendingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to {pendingType ? byType[pendingType]?.display_name : ""}? Your services and team will be reset.</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">Changing business type refills your services and team.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11"
              onClick={() => {
                if (pendingType && byType[pendingType]) update({ vertical: pendingType, ...fillFrom(byType[pendingType]) })
                setPendingType(null)
              }}
            >
              Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FlowCanvas>
  )
}
