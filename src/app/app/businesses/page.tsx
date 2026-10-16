import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRightIcon, PlusIcon } from "lucide-react"

import { GlassCard } from "@/components/workspace/surface"
import { appPath } from "@/lib/app-path"
import { myBusinesses, requireUser } from "@/server/auth"
import { ownerPage } from "@/server/auth-gate"

export const metadata: Metadata = { title: "Your businesses" }

// The simple business picker (Phase 0 §5) for someone who belongs to several businesses.
// Lists only their own memberships; each business re-checks membership on every page.
// Same list style as the old demo switcher (GlassCard + 56px rows).
export default async function BusinessesPage({ searchParams }: PageProps<"/app/businesses">) {
  await requireUser("/app/businesses")
  const { to } = await searchParams
  const page = ownerPage(typeof to === "string" ? to : null) ?? "today"
  const businesses = await myBusinesses()
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[480px] flex-col gap-4 bg-background px-4 pt-8 pb-10 md:pt-14">
      <h1 className="font-serif text-[2rem] leading-tight">Your businesses</h1>
      {businesses.length ? (
        <GlassCard as="div" className="p-2">
          <ul>
            {businesses.map((b) => (
              <li key={b.id}>
                <Link
                  href={appPath(b.id, `/${page}`)}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-xl px-4 text-base font-medium hover:bg-muted/60"
                >
                  <span className="truncate">{b.name}</span>
                  <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </GlassCard>
      ) : (
        <p className="text-base text-muted-foreground">You don&apos;t belong to a business yet.</p>
      )}
      <Link href="/app/onboarding" className="inline-flex min-h-11 items-center gap-1.5 text-base font-medium text-primary underline-offset-4 hover:underline">
        <PlusIcon className="size-4" aria-hidden="true" /> Set up a business
      </Link>
    </main>
  )
}
