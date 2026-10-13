import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination"

// Adapted from Origin UI comp-457 ("Page X of Y" prev/next pagination), MIT.
// Changes: pages → reporting weeks; label is the week range; left-aligned.
export function WeekStepper({
  label,
  previousHref,
  nextHref,
}: {
  label: string
  previousHref: string
  nextHref: string | null
}) {
  return (
    <Pagination aria-label="Reporting week" className="mx-0 w-auto justify-start">
      <PaginationContent className="gap-1">
        <PaginationItem>
          <PaginationLink href={previousHref} aria-label="Previous week" className="text-muted-foreground">
            <ChevronLeftIcon aria-hidden="true" />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            aria-label="Next week"
            aria-disabled={nextHref ? undefined : true}
            href={nextHref ?? undefined}
            role={nextHref ? undefined : "link"}
            className="text-muted-foreground aria-disabled:pointer-events-none aria-disabled:opacity-30"
          >
            <ChevronRightIcon aria-hidden="true" />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <p aria-live="polite" className="ml-2 text-base font-semibold">
            {label}
          </p>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
