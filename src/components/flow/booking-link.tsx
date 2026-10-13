"use client"

// The owner's booking link: read-only field + "Copy link" (→ "Copied!" for 2s) and,
// where the device can share, "Share". Used on /setup/live and Today's checklist.
import * as React from "react"
import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { inputCls } from "@/components/flow/flow-ui"
import { markOnboarding } from "@/app/onboarding-actions"
import { cn } from "@/lib/utils"

export function useCopy() {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Older browsers: select-and-copy fallback.
      const el = document.createElement("textarea")
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      el.remove()
    }
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }
  return { copied, copy }
}

export const secondaryBtnCls =
  "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-primary/25 bg-card px-5 text-base font-medium text-foreground transition hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"

export function BookingLink({ url, showField = true, onCopied }: { url: string; showField?: boolean; onCopied?: () => void }) {
  const { copied, copy } = useCopy()
  const canShare = React.useSyncExternalStore(
    () => () => {},
    () => "share" in navigator,
    () => false
  )

  return (
    <div className="flex flex-col gap-3">
      {showField ? (
        <Input
          readOnly
          value={url}
          aria-label="Your booking link"
          onFocus={(e) => e.currentTarget.select()}
          className={cn(inputCls, "bg-background/70 font-medium")}
        />
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          className={cn(secondaryBtnCls, copied && "border-primary text-primary")}
          onClick={async () => {
            await copy(url)
            markOnboarding("shared_link_at").catch(() => {})
            onCopied?.()
          }}
        >
          {copied ? <CheckIcon className="size-5" aria-hidden="true" /> : <CopyIcon className="size-5" aria-hidden="true" />}
          <span aria-live="polite">{copied ? "Copied!" : "Copy link"}</span>
        </button>
        {canShare ? (
          <button
            type="button"
            className={secondaryBtnCls}
            onClick={() => {
              navigator.share({ url }).then(
                () => markOnboarding("shared_link_at").catch(() => {}),
                () => {}
              )
            }}
          >
            <Share2Icon className="size-5" aria-hidden="true" />
            Share
          </button>
        ) : null}
      </div>
    </div>
  )
}
