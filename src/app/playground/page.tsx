import type { Metadata } from "next"

import { DEFAULT_BUSINESS_ID, listBusinesses } from "@/server/tenant"

import { PlaygroundChat } from "./playground-chat"

export const metadata: Metadata = { title: "Agent playground" }

export default async function PlaygroundPage() {
  // Business dropdown (default Cruz Family Dental): chat as a customer of any business.
  const businesses = await listBusinesses()
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-5 py-8">
      <h1 className="text-base font-semibold">Agent playground</h1>
      <p className="mb-6 text-xs text-subtle">
        Receptionist → Booking · live Groq + Cal.com · in memory, refresh to start over
      </p>
      <PlaygroundChat businesses={businesses} defaultBusinessId={DEFAULT_BUSINESS_ID} />
    </main>
  )
}
