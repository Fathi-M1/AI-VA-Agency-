"use client"

// Ticket page client bits: re-check the status every 20 seconds while waiting (and
// when the tab comes back into focus), and "Copy ticket link".
import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, LinkIcon } from "lucide-react"

import { useCopy } from "@/components/flow/booking-link"

export function TicketRefresher({ waiting }: { waiting: boolean }) {
  const router = useRouter()
  React.useEffect(() => {
    if (!waiting) return
    const id = setInterval(() => router.refresh(), 20_000)
    const onFocus = () => document.visibilityState === "visible" && router.refresh()
    document.addEventListener("visibilitychange", onFocus)
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", onFocus)
      window.removeEventListener("focus", onFocus)
    }
  }, [waiting, router])
  return null
}

export function CopyTicketLink({ className }: { className?: string }) {
  const { copied, copy } = useCopy()
  return (
    <button type="button" onClick={() => copy(window.location.href.split("?")[0])} className={className}>
      {copied ? <CheckIcon className="size-5" aria-hidden="true" /> : <LinkIcon className="size-5" aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied!" : "Copy ticket link"}</span>
    </button>
  )
}
