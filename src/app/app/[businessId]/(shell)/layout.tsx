import type { Metadata } from "next"

import { SidebarShell } from "@/components/sidebar-shell"
import { Toaster } from "@/components/ui/sonner"
import { myBusinesses, requireMember } from "@/server/auth"
import { getBusinessRow } from "@/server/db/business-config"
import { countOpenNeedsYou } from "@/server/db/views"

// The browser tab shows the business's own name.
export async function generateMetadata({ params }: LayoutProps<"/app/[businessId]">): Promise<Metadata> {
  const { businessId } = await params
  await requireMember(businessId)
  const { name } = await getBusinessRow(businessId)
  return { title: `${name} · AI team` }
}

// Every page of one business. The business comes from the URL and is checked against the
// signed-in user's membership here AND on every page and action (layouts don't guard
// server actions or parallel data loading on their own).
export default async function BusinessLayout({ children, params }: LayoutProps<"/app/[businessId]">) {
  const { businessId } = await params
  await requireMember(businessId)
  const [business, openNeedsYou, businesses] = await Promise.all([
    getBusinessRow(businessId),
    // The sidebar's Needs you badge shows the real open count.
    countOpenNeedsYou(businessId),
    myBusinesses(),
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
