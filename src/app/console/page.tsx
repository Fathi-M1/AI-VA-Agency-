import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { isBuilder, myBusinesses, requireUser } from "@/server/auth"

import { PlaygroundChat } from "./playground-chat"

export const metadata: Metadata = { title: "Builder console" }

// The builder console (Phase 0 §6): chat with a business's agents as a customer would.
// Only for accounts with the builder flag (users.is_builder); everyone else gets "not
// found". Lists only businesses the builder is a member of.
export default async function ConsolePage() {
  await requireUser("/console")
  if (!(await isBuilder())) notFound()
  const businesses = await myBusinesses()
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-5 py-8">
      <h1 className="text-base font-semibold">Builder console</h1>
      <p className="mb-6 text-xs text-subtle">
        Receptionist → Booking · live Groq + Cal.com · in memory, refresh to start over
      </p>
      {businesses.length ? (
        <PlaygroundChat businesses={businesses} defaultBusinessId={businesses[0].id} />
      ) : (
        <p className="text-sm text-muted-foreground">You aren&apos;t a member of any business yet.</p>
      )}
    </main>
  )
}
