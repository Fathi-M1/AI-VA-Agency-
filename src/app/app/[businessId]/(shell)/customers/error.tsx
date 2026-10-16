"use client"

import { RouteError } from "@/components/page-states"

export default function CustomersError(props: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return <RouteError title="Customers" what="your customers" {...props} />
}
