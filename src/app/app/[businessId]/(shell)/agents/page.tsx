import { AgentTeam } from "@/components/agents/agent-team"
import { AgentsLiveBadge } from "@/components/agents-live-badge"
import { SiteHeader } from "@/components/site-header"
import { getAgentsView } from "@/server/db/views"
import { requireMember } from "@/server/auth"

// Real agents and their real activity (Supabase). Review switch: ?demo=error.
export default async function AgentsPage({ params, searchParams }: PageProps<"/app/[businessId]/agents">) {
  const { demo } = await searchParams
  if (demo === "error") throw new Error("Agents unavailable")
  const { businessId } = await params
  await requireMember(businessId)

  const agents = await getAgentsView(businessId)

  return (
    // Same page column as the Dashboard, Conversations and Needs you.
    <div className="mx-auto w-full max-w-[1280px] px-5 pt-7 pb-16 sm:px-10 sm:pt-[34px] xl:px-14">
      <SiteHeader
        className="mb-10"
        title={
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-semibold">Agents</h1>
            <span className="text-xs text-subtle">Your AI team</span>
          </div>
        }
        actions={<AgentsLiveBadge />}
      />
      <AgentTeam agents={agents} />
    </div>
  )
}
