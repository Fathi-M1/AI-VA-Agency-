import { NeedsYouWorkspace } from "@/components/needs-you/needs-you-workspace"
import { listNeedsYouItems } from "@/server/db/views"
import { requireMember } from "@/server/auth"

// Real needs-you items from Supabase for the current business.
// Review switch: ?demo=error (error boundary).
export default async function NeedsYouPage({ params, searchParams }: PageProps<"/app/[businessId]/needs-you">) {
  const { demo } = await searchParams
  if (demo === "error") throw new Error("Needs you unavailable")
  const { businessId } = await params
  await requireMember(businessId)

  const items = await listNeedsYouItems(businessId)

  return (
    // Same page column as the Dashboard and Conversations.
    <div className="mx-auto w-full max-w-[1280px] px-5 pt-7 pb-16 sm:px-10 sm:pt-[34px] xl:px-14">
      <NeedsYouWorkspace items={items} />
    </div>
  )
}
