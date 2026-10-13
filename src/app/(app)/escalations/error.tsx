"use client"

import { RouteError } from "@/components/page-states"

export default function EscalationsError(props: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return <RouteError title="Escalations" what="your escalations" {...props} />
}
