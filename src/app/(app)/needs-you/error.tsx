"use client"

import { RouteError } from "@/components/page-states"

export default function NeedsYouError(props: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return <RouteError title="Needs you" what="what needs you" {...props} />
}
