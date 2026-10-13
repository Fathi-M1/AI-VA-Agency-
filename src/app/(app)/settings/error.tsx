"use client"

import { RouteError } from "@/components/page-states"

export default function SettingsError(props: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return <RouteError title="Settings" what="your settings" {...props} />
}
