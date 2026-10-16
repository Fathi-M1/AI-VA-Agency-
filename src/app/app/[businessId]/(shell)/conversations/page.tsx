import { ConversationsDataTable } from "@/components/conversations/conversations-data-table"
import { FirstRunEmpty } from "@/components/first-run-empty"
import { SiteHeader } from "@/components/site-header"
import { listConversations } from "@/server/db/views"
import { requireMember } from "@/server/auth"

// Real conversations from Supabase for the current business.
// Review switch: ?demo=error (error boundary).
export default async function ConversationsPage({ params, searchParams }: PageProps<"/app/[businessId]/conversations">) {
  const { demo, open } = await searchParams
  if (demo === "error") throw new Error("Conversation log unavailable")
  const { businessId } = await params
  await requireMember(businessId)

  const items = await listConversations(businessId)

  return (
    // Same page column as the Dashboard (centred, full width up to 1280px).
    <div className="mx-auto w-full max-w-[1280px] px-5 pt-7 pb-16 sm:px-10 sm:pt-[34px] xl:px-14">
      {items.length === 0 ? (
        <>
          <SiteHeader className="mb-10" title={<h1 className="text-base font-semibold">Conversations</h1>} />
          <FirstRunEmpty
            title="No conversations yet"
            body="Every chat shows up here the moment it starts, with the full transcript."
          />
        </>
      ) : (
        <ConversationsDataTable items={items} initialOpen={typeof open === "string" ? open : undefined} />
      )}
    </div>
  )
}
