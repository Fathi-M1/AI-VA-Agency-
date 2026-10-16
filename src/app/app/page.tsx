import { redirect } from "next/navigation"

import { myBusinesses, requireUser } from "@/server/auth"
import { entryTarget, ownerPage } from "@/server/auth-gate"

// After sign-in (Phase 0 §5): no business → onboarding; one → its Today; several → the
// picker. Old owner links arrive as /app?to=<page> (next.config.ts) and keep their page.
export default async function AppEntry({ searchParams }: PageProps<"/app">) {
  await requireUser("/app")
  const { to } = await searchParams
  redirect(entryTarget(await myBusinesses(), ownerPage(typeof to === "string" ? to : null)))
}
