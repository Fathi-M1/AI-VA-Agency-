import { DashboardFrame } from "@/components/dashboard/dashboard-frame"
import { Skeleton } from "@/components/ui/skeleton"

/* Same geometry as the real page so nothing jumps when data lands. */
export default function Loading() {
  return (
    <DashboardFrame week={<Skeleton className="h-5 w-48" />}>
      <div aria-busy="true" aria-label="Loading this week's results">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-5 h-24 w-80 max-w-full" />
        <Skeleton className="mt-6 h-5 w-96 max-w-full" />
        <Skeleton className="mt-2 mb-16 h-5 w-72 max-w-full" />
        <Skeleton className="mb-14 h-20 w-full" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </DashboardFrame>
  )
}
