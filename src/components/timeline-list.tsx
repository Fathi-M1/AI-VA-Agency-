import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
} from "@/components/ui/timeline"
import { cn } from "@/lib/utils"

/* Origin UI Timeline, styled once to the product's quiet ink treatment and reused
   for "What the AI did", needs-you activity and customer history. */
export function TimelineList({
  items,
}: {
  items: { at: string; text: string; strong?: boolean }[]
}) {
  return (
    <Timeline value={items.length} className="ml-1">
      {items.map((s, i) => (
        <TimelineItem key={i} step={i + 1} className="ms-7 not-last:pb-5!">
          <TimelineHeader>
            <TimelineSeparator className="-left-5 translate-y-4 bg-border!" />
            <TimelineDate className="mb-0.5 text-xs font-normal text-subtle tabular-nums">
              {s.at}
            </TimelineDate>
            <TimelineIndicator
              className={cn(
                "-left-5 top-1 size-2.5 border-0 group-data-completed/timeline-item:border-0",
                s.strong ? "bg-foreground" : "bg-foreground/35"
              )}
            />
          </TimelineHeader>
          <TimelineContent className="text-sm text-foreground">{s.text}</TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  )
}
