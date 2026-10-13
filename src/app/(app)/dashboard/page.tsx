import { AfterHoursShare } from "@/components/chart-radial-text"
import { RecoveredTrendChart } from "@/components/chart-area-default"
import { DashboardHero, NeedsYouCard, TeamCard } from "@/components/dashboard/workspace-dashboard"
import RecentActivity from "@/components/item-group"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usd } from "@/lib/dashboard-data"
import { getBusinessRow } from "@/server/db/business-config"
import { getDashboard } from "@/server/db/views"
import { getCurrentBusinessId } from "@/server/tenant"

// Dashboard in the workspace design language (the /register page's look): a deep green
// hero with this week's real numbers, then glass cards. Every number comes from real
// Supabase rows for the current business (this week = Mon–Sun in its timezone).
// Review switch: ?demo=error (error boundary).
export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { demo } = await searchParams
  if (demo === "error") throw new Error("Dashboard unavailable")
  const businessId = await getCurrentBusinessId()

  const [{ week, trend, recent, byAgent }, business] = await Promise.all([
    getDashboard(businessId),
    getBusinessRow(businessId),
  ])
  const slug = business.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

  // Greeting by the time of day where the business is.
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: business.config.timezone, hour: "numeric", hourCycle: "h23" }).format(new Date())
  )
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const agents = (["receptionist", "booking", "sales", "support"] as const).map((id) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    week: `${plural(byAgent[id], "conversation", "conversations")} this week`,
    status: "Live",
  }))

  const report = [
    `${business.name}: weekly results, ${week.weekLabel}`,
    "",
    `Conversations: ${week.conversations}`,
    `After hours: ${week.afterHours}`,
    `Booked: ${week.booked}`,
    `Average first reply: ${week.firstReplySeconds}s`,
    `Open escalations: ${week.needsYou.length}`,
    `Recovered: ${week.avgJobValue > 0 ? usd(week.recovered) : "$0 (no average job value set)"}`,
    "",
  ].join("\n")

  return (
    // Layout column only (width + padding); SidebarInset provides <main>.
    <div className="mx-auto w-full max-w-[1400px] px-5 pt-6 pb-16 sm:px-8 sm:pt-8 xl:px-12">
      {/* Phones: the sidebar opens as a sheet from here. */}
      <div className="mb-4 flex items-center gap-2 md:hidden">
        <SidebarTrigger className="rounded-xl border border-border/80 bg-card/80" />
        <span className="text-sm font-medium">{business.name}</span>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <DashboardHero
            greeting={greeting}
            ownerName={business.config.owner_name ?? null}
            businessName={business.name}
            week={week}
            liveAgents={4}
            report={{ text: report, fileName: `${slug}-weekly-report.txt` }}
          />
        </div>

        <div className="lg:col-span-7">
          <NeedsYouCard week={week} />
        </div>
        <div className="lg:col-span-5">
          <TeamCard agents={agents} />
        </div>

        <div className="lg:col-span-7">
          <RecoveredTrendChart
            data={trend}
            note={
              week.avgJobValue > 0
                ? "Bookings each week × your average job value."
                : "Bookings each week × your average job value, which isn't set yet, so it shows $0."
            }
          />
        </div>
        <div className="lg:col-span-5">
          <AfterHoursShare afterHours={week.afterHours} total={week.conversations} />
        </div>

        <div className="lg:col-span-12">
          <RecentActivity items={recent} />
        </div>
      </div>
    </div>
  )
}
