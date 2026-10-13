import { SettingsForm, type SettingsTab } from "@/components/settings/settings-form"
import { SiteHeader } from "@/components/site-header"
import type { Weekday } from "@/server/agent/knowledge/types"
import { customerTermOf, getBusinessRow } from "@/server/db/business-config"
import { getCurrentBusinessId } from "@/server/tenant"

import type { SettingsInput } from "./actions"

const TABS: SettingsTab[] = ["business", "knowledge", "safety", "accounts", "plan"]
const DAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

// The business's real config (Supabase). ?tab=<group> deep-links a group.
// Review switch: ?demo=error.
export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { tab, demo } = await searchParams
  if (demo === "error") throw new Error("Settings unavailable")
  const businessId = await getCurrentBusinessId()

  const { name, config: c } = await getBusinessRow(businessId)
  const term = customerTermOf(c)
  const initial: SettingsInput = {
    name,
    businessType: c.business_type ?? "",
    customerSingular: term.singular,
    customerPlural: term.plural,
    ownerName: c.owner_name ?? "",
    address: c.address ?? "",
    timezone: c.timezone,
    hours: Object.fromEntries(
      DAYS.map((d) => {
        const r = c.hours[d]
        if (!r) return [d, null]
        const [open, close] = r.split("-")
        return [d, { open, close }]
      })
    ) as SettingsInput["hours"],
    avgJobValue: c.avg_job_value !== undefined ? String(c.avg_job_value) : "",
    faqs: c.faqs ?? [],
    restrictedAdvice: c.restricted_advice ?? [],
    emergencyLine: c.emergency_line,
    emergencyKeywords: c.rules?.emergency_keywords ?? [],
    onCall: { from: c.on_call?.from ?? "", until: c.on_call?.until ?? "", number: c.on_call?.number ?? "" },
    refundOver: c.approval_limits?.refund_over !== undefined ? String(c.approval_limits.refund_over) : "",
  }

  return (
    // Same page column as the other screens.
    <div className="mx-auto w-full max-w-[1280px] px-5 pt-7 pb-16 sm:px-10 sm:pt-[34px] xl:px-14">
      <SiteHeader
        className="mb-8"
        title={
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-semibold">Settings</h1>
            <span className="text-xs text-subtle">{name}</span>
          </div>
        }
      />
      <SettingsForm
        initialTab={TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : "business"}
        initial={initial}
        services={c.services.map((s) => ({
          name: s.name,
          durationMinutes: s.duration_minutes,
          calcomEventTypeId: s.calcom_event_type_id,
        }))}
        calendarConnected={!!process.env.CALCOM_API_KEY}
      />
    </div>
  )
}
