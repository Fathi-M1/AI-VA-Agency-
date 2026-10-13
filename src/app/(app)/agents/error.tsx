"use client"

import { RouteError } from "@/components/page-states"

export default function AgentsError(props: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return <RouteError title="Agents" what="your agents" {...props} />
}
