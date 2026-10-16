import { redirect } from "next/navigation"

import { appPath } from "@/lib/app-path"

// A business's Home is Today (its own page checks membership).
export default async function BusinessHome({ params }: PageProps<"/app/[businessId]">) {
  const { businessId } = await params
  redirect(appPath(businessId, "/today"))
}
