"use client"

// "Your customers will see": a mini storefront header in the chosen brand color, the
// services with prices ("Price on request" when blank), the team, and the hours, all
// from the draft as the owner types. The brand color appears only here and on the
// customer pages, never elsewhere in the owner app.
import { duration, listJoin, peso } from "@/lib/format"
import { mergedIntervals, summarizeHours } from "@/lib/hours"
import { HAIR_LENGTHS, staffHours, type PackLite, type SetupDraft } from "@/lib/setup"

function priceText(s: SetupDraft["services"][number]) {
  const unit = s.pricing_type === "per_unit" ? " per unit" : ""
  if (s.variants) {
    const prices = HAIR_LENGTHS.map(({ key }) => s.variants![key].price.trim()).filter(Boolean).map(Number)
    if (!prices.length) return "Price on request"
    return `${peso(Math.min(...prices))}${prices.length > 1 ? " and up" : ""}`
  }
  return s.price.trim() ? `${peso(Number(s.price))}${unit}` : "Price on request"
}

export function CustomerPreview({ draft, pack }: { draft: SetupDraft; pack: PackLite | null }) {
  const name = draft.name.trim() || pack?.name_placeholder.replace(/^e\.g\.\s*/, "") || "Your business"
  const services = draft.services.filter((s) => s.on)
  const team = draft.staff.map((m) => m.name.trim()).filter(Boolean)
  const hours = summarizeHours(mergedIntervals(draft.staff.flatMap(staffHours)))
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/90">
      <div className="flex items-center gap-3 px-4 py-4 text-white" style={{ backgroundColor: draft.brandColor }}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 font-serif text-xl">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{name}</p>
          <p className="text-sm text-white/85">{pack?.display_name ?? "Booking page"}</p>
        </div>
      </div>
      <div className="flex flex-col divide-y divide-border/70 text-sm">
        <div className="px-4 py-3">
          <p className="mb-1.5 font-semibold">Services</p>
          {services.length ? (
            <ul className="flex flex-col gap-1">
              {services.map((s) => (
                <li key={s.key} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    {s.name}
                    <span className="text-muted-foreground"> · {duration(s.variants ? s.variants.short.duration : s.duration)}</span>
                  </span>
                  <span className="shrink-0 font-medium">{priceText(s)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Your services show here.</p>
          )}
        </div>
        <div className="px-4 py-3">
          <p className="mb-1 font-semibold">Team</p>
          <p className="text-muted-foreground">{team.length ? listJoin(team) : "Your team shows here."}</p>
        </div>
        <div className="px-4 py-3">
          <p className="mb-1 font-semibold">Hours</p>
          <p className="text-muted-foreground">{draft.staff.length ? hours : "Your hours show here."}</p>
        </div>
      </div>
    </div>
  )
}
