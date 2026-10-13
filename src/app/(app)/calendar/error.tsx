"use client"

import { RouteError } from "@/components/page-states"

export default function CalendarError(props: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return <RouteError title="Calendar" what="this week's schedule" {...props} />
}
