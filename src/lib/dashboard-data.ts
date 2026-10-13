// Shapes the Dashboard components render. The values are built from real Supabase
// rows in server/db/views.ts (getWeekSummary); there is no demo data here any more.

export type NeedsYouItem = {
  id: string
  who: string
  action: string
  why: string
  due: string
}

export type WeekSummary = {
  weekLabel: string
  previousWeekHref: string | null
  nextWeekHref: string | null
  /** bookings this week × average job value (0 until a job value is set) */
  recovered: number
  recoveredDelta: number
  avgJobValue: number
  booked: number
  afterHoursBooked: number
  conversations: number
  afterHours: number
  firstReplySeconds: number
  needsYou: NeedsYouItem[]
  autoResolved: number
}

export const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)

export type TrendPoint = { week: string; recovered: number; demo: boolean }
