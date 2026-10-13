"use client"

import { RouteError } from "@/components/page-states"

export default function ConversationsError(props: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return <RouteError title="Conversations" what="your conversations" {...props} />
}
