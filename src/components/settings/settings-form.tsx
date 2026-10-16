"use client"

// Settings, built on shadcn Field (https://ui.shadcn.com/docs/components/field, MIT):
// "field-responsive" layout (label + description left, control right), FieldSet /
// FieldLegend from "field-fieldset", switch rows from "field-switch".
// Controls: shadcn Input, Textarea, Switch, Checkbox, Badge, Button (MIT). Lists: shadcn
// Item (MIT). Status badges: Origin UI comp-420 (https://coss.com/origin, MIT).
// Data: the business's real config (Supabase). Save writes it back via a Server Action;
// the agents read the same config, so changes apply to the next conversation.
import { useEffect, useState, useTransition } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { saveSettings, type SettingsInput } from "@/app/app/[businessId]/(shell)/settings/actions"
import StatusDotBadge from "@/components/comp-420"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { primaryBtn, secondaryBtn } from "@/lib/styles"
import type { Weekday } from "@/server/agent/knowledge/types"

const TABS = {
  business: "Business & hours",
  knowledge: "FAQs",
  safety: "Safety",
  accounts: "Connected accounts",
  plan: "Plan",
} as const
export type SettingsTab = keyof typeof TABS

const DAYS: [Weekday, string][] = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
]

const field = "h-10 rounded-[9px] border-input bg-card text-sm"
// The right-hand column of a responsive Field: fixed share of the width, so the
// label column and the controls line up across every group.
const control = "w-full @md/field-group:w-[min(34rem,56%)]! @md/field-group:shrink-0"
const listBox = "rounded-xl border border-border bg-card"

/** One entry per line, for list fields edited as text. */
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean)

export function SettingsForm({
  businessId,
  initialTab = "business",
  initial,
  services,
  calendarConnected,
}: {
  businessId: string
  initialTab?: SettingsTab
  initial: SettingsInput
  services: { name: string; durationMinutes: number; calcomEventTypeId: number }[]
  calendarConnected: boolean
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  const [v, setV] = useState<SettingsInput>(initial)
  const [dirty, setDirty] = useState(false)
  const [pending, startTransition] = useTransition()
  // List fields edited as one-per-line text.
  const [keywordsText, setKeywordsText] = useState(initial.emergencyKeywords.join("\n"))
  const [adviceText, setAdviceText] = useState(initial.restrictedAdvice.join("\n"))

  const set = <K extends keyof SettingsInput>(k: K, value: SettingsInput[K]) => {
    setV((prev) => ({ ...prev, [k]: value }))
    setDirty(true)
  }

  // Leave-guard: unsaved changes should never vanish silently.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  function save() {
    const input: SettingsInput = { ...v, emergencyKeywords: lines(keywordsText), restrictedAdvice: lines(adviceText) }
    startTransition(async () => {
      const res = await saveSettings(businessId, input)
      if (res.ok) {
        setDirty(false)
        toast.success("Saved.", { description: "Your AI team uses the new settings from the next conversation." })
      } else {
        toast.error("Not saved", { description: res.error })
      }
    })
  }

  function discard() {
    setV(initial)
    setKeywordsText(initial.emergencyKeywords.join("\n"))
    setAdviceText(initial.restrictedAdvice.join("\n"))
    setDirty(false)
  }

  return (
    <Tabs value={tab} onValueChange={(t) => setTab(t as SettingsTab)}>
      <TabsList
        variant="line"
        className="mb-10 h-auto! w-full flex-wrap justify-start gap-x-7 gap-y-2 border-b border-border p-0"
      >
        {Object.entries(TABS).map(([k, label]) => (
          <TabsTrigger key={k} value={k} className="flex-none px-0 pb-3 text-sm">
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        className="pb-28"
      >
        {/* ---------------- Business & hours ---------------- */}
        <TabsContent value="business" forceMount className="data-[state=inactive]:hidden">
          <FieldSet>
            <Legend title="Business & hours" body="What your AI team knows and tells people about the business." />
            <FieldGroup>
              <Row label="Business name" htmlFor="name">
                <Input id="name" value={v.name} onChange={(e) => set("name", e.target.value)} className={`${field} ${control}`} />
              </Row>
              <FieldSeparator />
              <Row label="Type of business" htmlFor="btype" hint="For example: dental clinic, HVAC contractor, hair salon.">
                <Input id="btype" value={v.businessType} onChange={(e) => set("businessType", e.target.value)} className={`${field} ${control}`} />
              </Row>
              <FieldSeparator />
              <Row label="What you call your customers" hint="The AI uses these words: patient, client, customer…">
                <div className={`grid grid-cols-2 gap-2 ${control}`}>
                  <Input aria-label="One customer" placeholder="customer" value={v.customerSingular} onChange={(e) => set("customerSingular", e.target.value)} className={field} />
                  <Input aria-label="Many customers" placeholder="customers" value={v.customerPlural} onChange={(e) => set("customerPlural", e.target.value)} className={field} />
                </div>
              </Row>
              <FieldSeparator />
              <Row label="Owner" htmlFor="owner">
                <Input id="owner" value={v.ownerName} onChange={(e) => set("ownerName", e.target.value)} className={`${field} ${control}`} />
              </Row>
              <FieldSeparator />
              <Row label="Address" htmlFor="addr">
                <Input id="addr" value={v.address} placeholder="Not set" onChange={(e) => set("address", e.target.value)} className={`${field} ${control}`} />
              </Row>
              <FieldSeparator />
              <Row label="Timezone" htmlFor="tz" hint="Bookings and opening hours use this.">
                <Input id="tz" value={v.timezone} onChange={(e) => set("timezone", e.target.value)} className={`${field} ${control}`} />
              </Row>
              <FieldSeparator />
              <Row label="Opening hours" hint="The AI still answers outside these.">
                <div className={`grid gap-2 ${control}`}>
                  {DAYS.map(([d, label]) => {
                    const h = v.hours[d]
                    return (
                      <div key={d} className="grid grid-cols-[96px_1fr] items-center gap-3">
                        <FieldLabel htmlFor={`open-${d}`} className="font-normal text-muted-foreground">
                          {label}
                        </FieldLabel>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            aria-label={`${label} open`}
                            checked={!!h}
                            onCheckedChange={(on) => set("hours", { ...v.hours, [d]: on ? { open: "09:00", close: "17:00" } : null })}
                          />
                          {h ? (
                            <>
                              <Input id={`open-${d}`} type="time" value={h.open} onChange={(e) => set("hours", { ...v.hours, [d]: { ...h, open: e.target.value } })} className={`${field} w-32`} />
                              <span className="text-xs text-subtle">to</span>
                              <Input aria-label={`${label} closes`} type="time" value={h.close} onChange={(e) => set("hours", { ...v.hours, [d]: { ...h, close: e.target.value } })} className={`${field} w-32`} />
                            </>
                          ) : (
                            <span id={`open-${d}`} className="text-sm text-subtle">Closed</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Row>
              <FieldSeparator />
              <Row label="Average job value" htmlFor="ajv" hint="Used for “recovered” revenue on your Dashboard. Leave empty if unknown.">
                <div className={control}>
                  <Input id="ajv" inputMode="decimal" placeholder="Not set" value={v.avgJobValue} onChange={(e) => set("avgJobValue", e.target.value)} className={`${field} max-w-40`} />
                </div>
              </Row>
              <FieldSeparator />
              <Row label="Services" hint="What the AI can book. Each is linked to a calendar event type.">
                <ItemGroup className={`${listBox} ${control}`}>
                  {services.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">No services yet.</p>
                  ) : (
                    services.map((s, i) => (
                      <div key={s.calcomEventTypeId}>
                        <Item size="sm" className="px-4">
                          <ItemContent>
                            <ItemTitle className="text-sm font-medium">{s.name}</ItemTitle>
                            <ItemDescription className="text-xs">
                              {s.durationMinutes} min · calendar event type {s.calcomEventTypeId}
                            </ItemDescription>
                          </ItemContent>
                        </Item>
                        {i < services.length - 1 ? <ItemSeparator className="my-0" /> : null}
                      </div>
                    ))
                  )}
                </ItemGroup>
              </Row>
            </FieldGroup>
          </FieldSet>
        </TabsContent>

        {/* ---------------- FAQs ---------------- */}
        <TabsContent value="knowledge" forceMount className="data-[state=inactive]:hidden">
          <FieldSet>
            <Legend title="FAQs" body="The AI only answers from these and your business details. Anything else becomes a follow-up." />
            <FieldGroup>
              {v.faqs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No FAQs yet. Add the questions people ask most.</p>
              ) : null}
              {v.faqs.map((f, i) => (
                <div key={i} className={`${listBox} flex flex-col gap-2 p-4`}>
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={`Question ${i + 1}`}
                      placeholder="Question"
                      value={f.question}
                      onChange={(e) => set("faqs", v.faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))}
                      className={field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove question ${i + 1}`}
                      onClick={() => set("faqs", v.faqs.filter((_, j) => j !== i))}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  <Textarea
                    aria-label={`Answer ${i + 1}`}
                    placeholder="Answer"
                    value={f.answer}
                    onChange={(e) => set("faqs", v.faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
                    className="min-h-16 resize-none rounded-[9px] border-input bg-background text-sm"
                  />
                </div>
              ))}
              <div>
                <Button type="button" variant="outline" className={`${secondaryBtn} h-9 gap-2`} onClick={() => set("faqs", [...v.faqs, { question: "", answer: "" }])}>
                  <PlusIcon aria-hidden="true" /> Add FAQ
                </Button>
              </div>
            </FieldGroup>
          </FieldSet>
        </TabsContent>

        {/* ---------------- Safety ---------------- */}
        <TabsContent value="safety" forceMount className="data-[state=inactive]:hidden">
          <FieldSet>
            <Legend title="Safety" body="When the AI stops and hands over to you. It never improvises on these." />
            <FieldGroup>
              <Row label="Emergency instruction" htmlFor="emerg" hint="Read word for word when an emergency word is heard.">
                <Textarea id="emerg" value={v.emergencyLine} onChange={(e) => set("emergencyLine", e.target.value)} className={`min-h-24 resize-none rounded-[9px] border-input bg-card text-sm ${control}`} />
              </Row>
              <FieldSeparator />
              <Row label="Emergency words" htmlFor="kw" hint="One per line. Any of these stops the AI and reads the instruction.">
                <Textarea
                  id="kw"
                  value={keywordsText}
                  onChange={(e) => {
                    setKeywordsText(e.target.value)
                    setDirty(true)
                  }}
                  className={`min-h-28 resize-none rounded-[9px] border-input bg-card text-sm ${control}`}
                />
              </Row>
              <FieldSeparator />
              <Row label="Advice the AI never gives" htmlFor="advice" hint="One per line, e.g. “medical advice”, “legal advice”, “gas-leak diagnosis”.">
                <Textarea
                  id="advice"
                  value={adviceText}
                  onChange={(e) => {
                    setAdviceText(e.target.value)
                    setDirty(true)
                  }}
                  className={`min-h-20 resize-none rounded-[9px] border-input bg-card text-sm ${control}`}
                />
              </Row>
              <FieldSeparator />
              <Row label="On call" hint="Saved now; used once on-call alerts are added.">
                <div className={`grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.3fr] ${control}`}>
                  <Input aria-label="On call from" type="time" value={v.onCall.from} onChange={(e) => set("onCall", { ...v.onCall, from: e.target.value })} className={field} />
                  <Input aria-label="On call until" type="time" value={v.onCall.until} onChange={(e) => set("onCall", { ...v.onCall, until: e.target.value })} className={field} />
                  <Input aria-label="On-call number" placeholder="Phone number" value={v.onCall.number} onChange={(e) => set("onCall", { ...v.onCall, number: e.target.value })} className={`${field} col-span-2 sm:col-span-1`} />
                </div>
              </Row>
              <FieldSeparator />
              <Row label="Refunds need you over" htmlFor="limit" hint="Saved now. The AI can't issue refunds at all today; every refund request comes to you.">
                <div className={control}>
                  <Input id="limit" inputMode="decimal" placeholder="Not set" value={v.refundOver} onChange={(e) => set("refundOver", e.target.value)} className={`${field} max-w-40`} />
                </div>
              </Row>
              <FieldSeparator />
              <Row label="Always need you" hint="Locked on. The AI has no way to do these.">
                <div className={`flex flex-col gap-4 ${control}`}>
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="lock-price" className="font-normal">Any price change</FieldLabel>
                    <Switch id="lock-price" checked disabled />
                  </Field>
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="lock-delete" className="font-normal">Deleting a {v.customerSingular || "customer"} record</FieldLabel>
                    <Switch id="lock-delete" checked disabled />
                  </Field>
                </div>
              </Row>
            </FieldGroup>
          </FieldSet>
        </TabsContent>

        {/* ---------------- Connected accounts ---------------- */}
        <TabsContent value="accounts" forceMount className="data-[state=inactive]:hidden">
          <FieldSet>
            <Legend title="Connected accounts" body="Where your AI team books, answers and texts from." />
            <ItemGroup className={listBox}>
              <Item className="flex-wrap px-6 py-5">
                <ItemContent className="min-w-0">
                  <ItemTitle className="text-sm font-medium">Calendar (Cal.com)</ItemTitle>
                  <ItemDescription className="text-xs">
                    {calendarConnected ? "Connected with an API key on the server" : "Not connected"}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <StatusDotBadge tone={calendarConnected ? "ink" : "hollow"} status={false}>
                    {calendarConnected ? "Connected" : "Not connected"}
                  </StatusDotBadge>
                </ItemActions>
              </Item>
              <ItemSeparator className="my-0" />
              <Item className="flex-wrap px-6 py-5">
                <ItemContent className="min-w-0">
                  <ItemTitle className="text-sm font-medium">Phone number</ItemTitle>
                  <ItemDescription className="text-xs">Not set up yet. Calls aren&apos;t answered by the AI until it is.</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <StatusDotBadge tone="hollow" status={false}>Not set up</StatusDotBadge>
                </ItemActions>
              </Item>
              <ItemSeparator className="my-0" />
              <Item className="flex-wrap px-6 py-5">
                <ItemContent className="min-w-0">
                  <ItemTitle className="text-sm font-medium">Text messaging</ItemTitle>
                  <ItemDescription className="text-xs">Not set up yet.</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <StatusDotBadge tone="hollow" status={false}>Not set up</StatusDotBadge>
                </ItemActions>
              </Item>
            </ItemGroup>
          </FieldSet>
        </TabsContent>

        {/* ---------------- Plan ---------------- */}
        <TabsContent value="plan" forceMount className="data-[state=inactive]:hidden">
          <FieldSet>
            <Legend title="Plan" body="What you pay for, and what's coming." />
            <FieldGroup>
              <Row label="Your plan" hint="Billing isn't set up yet.">
                <p className={`text-sm text-muted-foreground ${control}`}>No plan or usage to show yet.</p>
              </Row>
              <FieldSeparator />
              <Field orientation="responsive">
                <FieldContent>
                  <FieldTitle className="flex flex-wrap items-center gap-2">
                    Human backup desk
                    <Badge variant="outline" className="h-5 border-input px-2 text-xs font-normal text-muted-foreground">
                      Planned add-on
                    </Badge>
                  </FieldTitle>
                  <FieldDescription>
                    A paid option: trained people cover nights and weekends for anything that needs you when you&apos;re not on call.
                  </FieldDescription>
                </FieldContent>
                <div className={`rounded-xl border border-dashed border-input px-5 py-4 ${control}`}>
                  <ol className="flex flex-col gap-2 text-sm">
                    <li className="flex gap-3">
                      <span className="w-14 shrink-0 text-xs text-subtle">Phase 1</span>
                      <span>Generalist on-call staff</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-14 shrink-0 text-xs text-subtle">Later</span>
                      <span className="text-muted-foreground">People matched to your specialty</span>
                    </li>
                  </ol>
                </div>
              </Field>
            </FieldGroup>
          </FieldSet>
        </TabsContent>

        {/* Save bar: appears only when something changed. */}
        {dirty ? (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-input bg-background/95 md:left-(--sidebar-width-icon)">
            <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-5 py-4 sm:px-10 xl:px-14">
              <p className="flex-1 text-sm">
                <span className="font-medium">Unsaved changes</span>
                <span className="text-muted-foreground"> · the AI keeps using the old settings until you save</span>
              </p>
              <Button type="button" variant="ghost" className="h-10 rounded-[9px] px-3 text-sm text-muted-foreground" onClick={discard}>
                Discard
              </Button>
              <Button type="submit" className={primaryBtn} disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        ) : null}
      </form>
    </Tabs>
  )
}

function Legend({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-2">
      <FieldLegend className="mb-1 text-lg! font-semibold">{title}</FieldLegend>
      <FieldDescription>{body}</FieldDescription>
    </div>
  )
}

/* One responsive Field row: label + hint left, control right (field-responsive). */
function Row({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <Field orientation="responsive">
      <FieldContent>
        {htmlFor ? <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel> : <FieldTitle>{label}</FieldTitle>}
        {hint ? <FieldDescription>{hint}</FieldDescription> : null}
      </FieldContent>
      {children}
    </Field>
  )
}
