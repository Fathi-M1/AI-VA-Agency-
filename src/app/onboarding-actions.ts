"use server"

// Today's getting-started checklist, stored per business in config.onboarding.
import { refresh } from "next/cache"

import { getBusinessProfile, patchConfig } from "@/server/db/business-profile"
import { getCurrentBusinessId } from "@/server/tenant"

type Mark = "shared_link_at" | "tried_as_customer_at" | "hidden_at"

export async function markOnboarding(mark: Mark, opts: { refresh?: boolean } = {}) {
  const businessId = await getCurrentBusinessId()
  const { config } = await getBusinessProfile(businessId)
  if (config.onboarding?.[mark]) return
  await patchConfig(businessId, { onboarding: { ...config.onboarding, [mark]: new Date().toISOString() } })
  if (opts.refresh) refresh()
}
