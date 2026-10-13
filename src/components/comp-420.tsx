// Origin UI comp-420, "Badge with status dot"
// Source: https://coss.com/origin/r/comp-420.json (installed via shadcn CLI)
// License: MIT. Copyright (c) 2025 coss.com, originally Copyright (c) 2025 Origin UI.
// Adapted: dot colour from the product's tokens. Origin ships the same badge in
// emerald / amber / red as comp-420 / comp-421 / comp-422
// (https://coss.com/origin/r/comp-421.json, https://coss.com/origin/r/comp-422.json).
// Here: accent (green) for live/booked/handled, warning (comp-421's amber) for
// escalate-now, danger (comp-422's red) for safe redirects, ink, hollow for
// captured/callback, quiet for answered. Label via children, the
// Dashboard's type/spacing. Structure unchanged.
import { Badge } from "@/components/ui/badge";

const dot = {
  accent: "bg-primary",
  warning: "bg-warning",
  danger: "bg-destructive",
  ink: "bg-foreground",
  hollow: "border border-foreground/60 bg-transparent",
  quiet: "bg-subtle/60",
} as const;

export default function StatusDotBadge({
  children,
  tone = "accent",
  status = true,
}: {
  children: React.ReactNode;
  tone?: keyof typeof dot;
  status?: boolean;
}) {
  return (
    <Badge
      className="h-6 gap-1.5 border-border bg-card px-2.5 text-xs font-medium text-foreground"
      variant="outline"
      role={status ? "status" : undefined}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${dot[tone]}`}
      />
      {children}
    </Badge>
  );
}
