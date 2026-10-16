import { Suspense } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"
import { SectionBoundary } from "@/components/flow/section-boundary"
import { HeroPanel } from "@/components/workspace/surface"
import { todayBase } from "@/server/db/today"
import { getCurrentBusinessId } from "@/server/tenant"

import {
  AppointmentsSection,
  ChecklistSection,
  HandledSection,
  NeedsYouSection,
  SectionSkeleton,
  SummarySentence,
  WeekSection,
} from "./sections"
import { SeenBeacon, TodayMenu } from "./today-client"

export const metadata: Metadata = { title: "Today" }

function Section({ children, rows = 1 }: { children: React.ReactNode; rows?: number }) {
  return (
    <SectionBoundary>
      <Suspense fallback={<SectionSkeleton rows={rows} />}>{children}</Suspense>
    </SectionBoundary>
  )
}

// The owner's daily home (Journeys D, E). Real data only; each section loads (and
// fails) on its own. Phone: one column. Tablet: 7/12 + 5/12. Laptop: 8/12 + 4/12.
export default async function TodayPage() {
  const businessId = await getCurrentBusinessId()
  const base = await todayBase(businessId)
  // A business that hasn't finished setup goes to setup first.
  if (!base.profile.setup_completed_at) redirect("/setup")

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pt-5 pb-10 md:px-6 md:pt-8 lg:px-10">
      {/* Row 1: header + summary, one surface */}
      <HeroPanel className="p-6 lg:p-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{base.profile.name}</p>
            <p className="text-base text-primary-foreground/80">{base.dateLabel}</p>
          </div>
          <TodayMenu />
        </div>
        <div className="mt-5 max-w-[70ch]">
          <SectionBoundary>
            <Suspense
              fallback={
                <div className="flex flex-col gap-2" aria-hidden="true">
                  <Skeleton className="h-8 w-48 bg-primary-foreground/20" />
                  <Skeleton className="h-5 w-full bg-primary-foreground/15" />
                  <Skeleton className="h-5 w-4/5 bg-primary-foreground/15" />
                </div>
              }
            >
              <SummarySentence businessId={businessId} />
            </Suspense>
          </SectionBoundary>
        </div>
      </HeroPanel>

      {/* Row 2. Each section renders once: on phones the two columns dissolve ("contents")
          into one list and the checklist moves first; from tablet up they are columns. */}
      <div className="mt-5 flex flex-col gap-6 md:mt-6 md:grid md:grid-cols-12">
        <div className="contents md:col-span-7 md:flex md:min-w-0 md:flex-col md:gap-6 lg:col-span-8">
          <div className="order-2 md:order-none">
            <Section rows={2}>
              <NeedsYouSection businessId={businessId} />
            </Section>
          </div>
          <div className="order-3 md:order-none">
            <Section>
              <AppointmentsSection businessId={businessId} />
            </Section>
          </div>
        </div>
        <div className="contents md:col-span-5 md:flex md:min-w-0 md:flex-col md:gap-6 lg:col-span-4">
          <div className="order-1 empty:hidden md:order-none">
            <Section>
              <ChecklistSection businessId={businessId} />
            </Section>
          </div>
          <div className="order-4 md:order-none">
            <Section>
              <WeekSection businessId={businessId} />
            </Section>
          </div>
          <div className="order-5 md:order-none">
            <Section>
              <HandledSection businessId={businessId} />
            </Section>
          </div>
        </div>
      </div>

      <SeenBeacon />
    </div>
  )
}
