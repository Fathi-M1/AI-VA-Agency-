// Origin UI comp-457, "Pagination with 'Page X of Y' label"
// Source: https://coss.com/origin/r/comp-457.json (installed via shadcn CLI)
// License: MIT. Copyright (c) 2025 coss.com, originally Copyright (c) 2025 Origin UI.
// Adapted: pages → reporting weeks (real hrefs instead of #/page/n), the label is
// the week range, and the label sits after both arrows to keep the approved
// Dashboard header layout. Built on shadcn Pagination, as in the original.
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

type WeekPaginationProps = {
  label: string;
  previousHref: string | null;
  nextHref: string | null;
};

export default function WeekPagination({
  label,
  previousHref,
  nextHref,
}: WeekPaginationProps) {
  return (
    <Pagination aria-label="Reporting week" className="mx-0 w-auto justify-start">
      <PaginationContent className="gap-1">
        <PaginationItem>
          <PaginationLink
            aria-disabled={previousHref ? undefined : true}
            aria-label="Previous week"
            className="text-muted-foreground aria-disabled:pointer-events-none aria-disabled:opacity-30"
            href={previousHref ?? undefined}
            role={previousHref ? undefined : "link"}
          >
            <ChevronLeftIcon aria-hidden="true" size={16} />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            aria-disabled={nextHref ? undefined : true}
            aria-label="Next week"
            className="text-muted-foreground aria-disabled:pointer-events-none aria-disabled:opacity-30"
            href={nextHref ?? undefined}
            role={nextHref ? undefined : "link"}
          >
            <ChevronRightIcon aria-hidden="true" size={16} />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <p aria-live="polite" className="ml-2 text-base font-semibold">
            {label}
          </p>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
