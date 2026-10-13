import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Adapted from Origin UI comp-420 (outline badge with status dot), MIT.
// Tones use the product's tokens only: the green accent is reserved for the
// states that matter most (live, booked); everything else is ink or quiet.
const dot = {
  accent: "bg-primary",
  ink: "bg-foreground",
  quiet: "bg-subtle/60",
  hollow: "border border-foreground/60 bg-transparent",
} as const

export function StatusBadge({
  tone = "ink",
  children,
  className,
  ...props
}: React.ComponentProps<typeof Badge> & { tone?: keyof typeof dot }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1.5 border-border bg-card px-2.5 text-xs font-medium text-foreground",
        className
      )}
      {...props}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", dot[tone])} />
      {children}
    </Badge>
  )
}
