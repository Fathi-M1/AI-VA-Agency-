"use server"

// Today's getting-started checklist, stored per business in config.onboarding.
import { refresh } from "next/cache"

import { requireMember } from "@/server/auth"
import { getBusinessProfile, patchConfig } from "@/server/db/business-profile"

type Mark = "shared_link_at" | "tried_as_customer_at" | "hidden_at"

export async function markOnboarding(businessId: string, mark: Mark, opts: { refresh?: boolean } = {}) {
  await requireMember(businessId)
  const { config } = await getBusinessProfile(businessId)
  if (config.onboarding?.[mark]) return
  await patchConfig(businessId, { onboarding: { ...config.onboarding, [mark]: new Date().toISOString() } })
  if (opts.refresh) refresh()
}
