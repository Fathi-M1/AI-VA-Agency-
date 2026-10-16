import type { Metadata } from "next"

import { SidebarShell } from "@/components/sidebar-shell"
import { Toaster } from "@/components/ui/sonner"
import { getBusinessRow } from "@/server/db/business-config"
import { countOpenNeedsYou } from "@/server/db/views"
import { getCurrentBusinessId, listBusinesses } from "@/server/tenant"

// The browser tab shows the business's own name.
export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getBusinessRow(await getCurrentBusinessId())
  return { title: `${name} · AI team` }
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const businessId = await getCurrentBusinessId()
  const [business, openNeedsYou, businesses] = await Promise.all([
    getBusinessRow(businessId),
    // The sidebar's Needs you badge shows the real open count.
    countOpenNeedsYou(businessId),
    listBusinesses(),
  ])
  return (
    <>
      <SidebarShell
        openNeedsYou={openNeedsYou}
        business={{ id: business.id, name: business.name, ownerName: business.config.owner_name ?? null }}
        businesses={businesses}
      >
        {children}
      </SidebarShell>
      {/* Confirmations (saved, refund approved) live in the flow, not on the canvas. */}
      <Toaster theme="light" position="bottom-right" />
    </>
  )
}
