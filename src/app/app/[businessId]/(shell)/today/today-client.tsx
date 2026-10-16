"use client"

// Small client pieces of Today: the "seen" beacon, the header menu, and the
// getting-started checklist.
import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { BuildingIcon, CheckIcon, EllipsisVerticalIcon, ExternalLinkIcon, LogOutIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCopy } from "@/components/flow/booking-link"
import { signOut } from "@/app/auth/actions"
import { markOnboarding } from "@/app/app/[businessId]/onboarding-actions"
import { cn } from "@/lib/utils"

/** Marks Today as seen when the owner leaves it (tab hidden, closed, or navigated away). */
export function SeenBeacon({ businessId }: { businessId: string }) {
  React.useEffect(() => {
    let sent = false
    const url = `/app/${businessId}/today/seen`
    const send = () => {
      if (sent) return
      sent = true
      if (!navigator.sendBeacon?.(url)) fetch(url, { method: "POST", keepalive: true })
    }
    const onHide = () => document.visibilityState === "hidden" && send()
    window.addEventListener("pagehide", send)
    document.addEventListener("visibilitychange", onHide)
    return () => {
      window.removeEventListener("pagehide", send)
      document.removeEventListener("visibilitychange", onHide)
      send()
    }
  }, [businessId])
  return null
}

/** Today's header menu (phones; desktop has the same in the sidebar's account menu). */
export function TodayMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground backdrop-blur-xl md:hidden"
        aria-label="Menu"
      >
        <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem asChild className="min-h-11 text-base">
          <Link href="/app/businesses">
            <BuildingIcon aria-hidden="true" /> Your businesses
          </Link>
        </DropdownMenuItem>
        <form action={signOut}>
          <DropdownMenuItem asChild className="min-h-11 w-full text-base">
            <button type="submit">
              <LogOutIcon aria-hidden="true" /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type Item = { key: string; label: string; done: boolean }

export function Checklist({
  url,
  slug,
  shared,
  tried,
  confirmed,
}: {
  url: string
  slug: string | null
  shared: boolean
  tried: boolean
  confirmed: boolean
}) {
  const router = useRouter()
  const { businessId } = useParams<{ businessId: string }>()
  const { copied, copy } = useCopy()
  const [hiding, setHiding] = React.useState(false)
  const items: Item[] = [
    { key: "share", label: "Share your booking link", done: shared },
    { key: "try", label: "Try it as a customer", done: tried },
    { key: "confirm", label: "Confirm your first booking request", done: confirmed },
  ]
  const left = items.filter((i) => !i.done).length

  return (
    <div className={cn(hiding && "opacity-50")}>
      <ol className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.key} className="flex min-h-12 items-center gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border",
                item.done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
              )}
            >
              {item.done ? <CheckIcon className="size-4" /> : null}
            </span>
            <span className={cn("flex-1 text-base", item.done && "text-muted-foreground line-through")}>
              {item.label}
              <span className="sr-only">{item.done ? " (done)" : ""}</span>
            </span>
            {item.key === "share" && slug ? (
              <button
                type="button"
                onClick={async () => {
                  await copy(url)
                  await markOnboarding(businessId, "shared_link_at", { refresh: true }).catch(() => {})
                }}
                className="min-h-11 shrink-0 rounded-full border border-primary/30 bg-card px-4 text-base font-medium text-primary hover:border-primary/60"
              >
                <span aria-live="polite">{copied ? "Copied!" : "Copy link"}</span>
              </button>
            ) : null}
            {item.key === "try" && slug ? (
              <a
                href={`/book/${slug}`}
                target="_blank"
                rel="noopener"
                onClick={() => markOnboarding(businessId, "tried_as_customer_at", { refresh: true }).catch(() => {})}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-card px-4 text-base font-medium text-primary hover:border-primary/60"
              >
                Open <ExternalLinkIcon className="size-4" aria-hidden="true" />
              </a>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="sr-only">{left} left</p>
      <button
        type="button"
        disabled={hiding}
        onClick={async () => {
          setHiding(true)
          await markOnboarding(businessId, "hidden_at").catch(() => {})
          router.refresh()
        }}
        className="mt-2 min-h-11 text-base text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Hide this
      </button>
    </div>
  )
}
