"use client"

// Light / dark segmented control for the owner app (design-system.md). Personal to this
// device (next-themes), separate from the business settings form. The customer storefront
// has no toggle and stays light.
import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

const OPTIONS = [
  { k: "light", label: "Light", Icon: SunIcon },
  { k: "dark", label: "Dark", Icon: MoonIcon },
] as const

export function AppearanceToggle() {
  // Before mount resolvedTheme is undefined on both server and client, so both render
  // "light" first — no hydration mismatch; next-themes updates it after mount.
  const { resolvedTheme, setTheme } = useTheme()
  const current = resolvedTheme === "dark" ? "dark" : "light"

  return (
    <div role="radiogroup" aria-label="Appearance" className="inline-flex gap-1 rounded-full border border-border bg-card p-1">
      {OPTIONS.map(({ k, label, Icon }) => {
        const active = current === k
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(k)}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
