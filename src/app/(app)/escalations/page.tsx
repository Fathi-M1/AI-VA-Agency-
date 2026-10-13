import { EscalationWorkspace } from "@/components/escalations/escalation-workspace"
import { listEscalations } from "@/server/db/views"
import { getCurrentBusinessId } from "@/server/tenant"

// Real escalations from Supabase for the current business.
// Review switch: ?demo=error (error boundary).
export default async function EscalationsPage({ searchParams }: PageProps<"/escalations">) {
  const { demo } = await searchParams
  if (demo === "error") throw new Error("Escalations unavailable")
  const businessId = await getCurrentBusinessId()

  const items = await listEscalations(businessId)

  return (
    // Same page column as the Dashboard and Conversations.
    <div className="mx-auto w-full max-w-[1280px] px-5 pt-7 pb-16 sm:px-10 sm:pt-[34px] xl:px-14">
      <EscalationWorkspace items={items} />
    </div>
  )
}
