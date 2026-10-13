"use client"

import { RouteError } from "@/components/page-states"

export default function ContactsError(props: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return <RouteError title="Contacts" what="your contacts" {...props} />
}
