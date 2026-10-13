import { CalendarWorkspace } from "@/components/calendar/calendar-workspace"
import WeekPagination from "@/components/comp-457"
import { SiteHeader } from "@/components/site-header"
import { getCalendarWeek } from "@/server/db/views"
import { getCurrentBusinessId } from "@/server/tenant"

// Real bookings for the current week (Mon–Sun, business timezone) from Supabase.
// An empty week still shows the grid, with 0 visits.
// Review switch: ?demo=error (error boundary).
export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const { demo } = await searchParams
  if (demo === "error") throw new Error("Calendar unavailable")
  const businessId = await getCurrentBusinessId()

  const cal = await getCalendarWeek(businessId)

  return (
    // Same page column as the other screens.
    <div className="mx-auto w-full max-w-[1280px] px-5 pt-7 pb-16 sm:px-10 sm:pt-[34px] xl:px-14">
      <h1 className="sr-only">Calendar</h1>
      <SiteHeader
        className="mb-8"
        title={<WeekPagination label={cal.weekLabel} previousHref={null} nextHref={null} />}
      />
      <CalendarWorkspace
        appointments={cal.appointments}
        days={cal.days}
        weekStart={cal.weekStart}
        today={cal.today}
        todayLabel={cal.todayLabel}
        startHour={cal.startHour}
        endHour={cal.endHour}
        services={cal.services}
      />
    </div>
  )
}
