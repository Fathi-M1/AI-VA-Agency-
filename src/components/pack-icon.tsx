// Renders a business type's icon by its Lucide name (from the pack). Server-only use:
// it imports the full Lucide set, so it must not be pulled into client bundles —
// server components render it and pass the element down.
import * as Lucide from "lucide-react"

export function PackIcon({ name, className }: { name: string | undefined; className?: string }) {
  const Icon = (name && (Lucide as unknown as Record<string, Lucide.LucideIcon>)[name]) || Lucide.CircleIcon
  return <Icon className={className} aria-hidden="true" />
}
