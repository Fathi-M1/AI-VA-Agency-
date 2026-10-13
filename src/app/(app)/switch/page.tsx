import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CheckIcon, PlusIcon } from "lucide-react"

import { GlassCard } from "@/components/workspace/surface"
import { getCurrentBusinessId, listBusinesses } from "@/server/tenant"

import { switchBusinessAndGoToday } from "../business-actions"

export const metadata: Metadata = { title: "Switch business (demo)" }

// Demo only (no logins yet): pick which business this app shows. Not access control.
export default async function SwitchPage() {
  // EMERGENCY HOTFIX: the demo business switcher is off in production (Phase 0 removes it).
  if (process.env.NODE_ENV === "production") notFound()
  const [businesses, current] = await Promise.all([listBusinesses(), getCurrentBusinessId()])
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-5 pb-10 md:pt-10">
      <h1 className="font-serif text-[2rem] leading-tight">Switch business (demo)</h1>
      <GlassCard as="div" className="p-2">
        <ul>
          {businesses.map((b) => (
            <li key={b.id}>
              <form action={switchBusinessAndGoToday.bind(null, b.id)}>
                <button
                  type="submit"
                  className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-base font-medium hover:bg-muted/60"
                  aria-current={b.id === current ? "true" : undefined}
                >
                  {b.name}
                  {b.id === current ? <CheckIcon className="size-5 text-primary" aria-label="Current business" /> : null}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </GlassCard>
      <Link href="/setup" className="inline-flex min-h-11 items-center gap-1.5 text-base font-medium text-primary underline-offset-4 hover:underline">
        <PlusIcon className="size-4" aria-hidden="true" /> Set up another business
      </Link>
    </div>
  )
}
