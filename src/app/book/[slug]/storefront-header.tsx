// The business's storefront band (brand color): initial avatar, name, live open/closed
// status, up to 4 fact chips, and the address. Used by the booking page and the ticket.
import { MapPinIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function StorefrontHeader({
  name,
  status,
  chips = [],
  address,
  titleAs: Title = "p",
}: {
  titleAs?: "h1" | "p"
  name: string
  status?: { open: boolean; text: string }
  chips?: string[]
  address?: string | null
}) {
  return (
    <header className="bg-[var(--brand)] text-white">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6 lg:px-10 lg:py-8">
        <div className="flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/20 font-serif text-2xl" aria-hidden="true">
            {name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <Title className="font-serif text-[1.75rem] leading-tight md:text-4xl">{name}</Title>
            {status ? (
              <p className="mt-0.5 flex items-center gap-2 text-base text-white/90">
                <span className={cn("size-2 rounded-full", status.open ? "bg-[oklch(0.85_0.17_150)]" : "bg-white/60")} aria-hidden="true" />
                {status.text}
              </p>
            ) : null}
          </div>
        </div>
        {chips.length ? (
          <ul className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {chips.map((c) => (
              <li key={c} className="shrink-0 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm">
                {c}
              </li>
            ))}
          </ul>
        ) : null}
        {address ? (
          <p className="mt-3 flex items-start gap-2 text-base text-white/90">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {address}
          </p>
        ) : null}
      </div>
    </header>
  )
}
