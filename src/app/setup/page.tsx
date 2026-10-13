import type { Metadata } from "next"

import { PackIcon } from "@/components/pack-icon"
import { packList } from "@/server/verticals"

import { packLite } from "./pack-lite"
import { SetupFlow } from "./setup-flow"

export const metadata: Metadata = { title: "Set up your AI front desk" }

// Owner onboarding (Journey A). No app navigation on this screen. Every business type
// pack is offered (researched first, "Other service business" last); icons are
// rendered here on the server and passed down.
export default function SetupPage() {
  const packs = packList()
  return (
    <SetupFlow
      packs={packs.map(packLite)}
      icons={Object.fromEntries(packs.map((p) => [p.vertical, <PackIcon key={p.vertical} name={p.icon} className="size-6" />]))}
    />
  )
}
