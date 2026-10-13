"use client"

import { useEffect } from "react"
import { TriangleAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DashboardFrame } from "@/components/dashboard/dashboard-frame"

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <DashboardFrame week={<p className="text-base font-semibold">This week</p>}>
      <Alert className="max-w-xl rounded-xl border-input bg-card px-6 py-5">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertTitle className="text-lg font-semibold">
          We couldn&apos;t load this week&apos;s numbers
        </AlertTitle>
        <AlertDescription className="text-sm">
          <p>
            Your AI team is still answering calls and booking. Only this report
            is affected.
          </p>
          <Button onClick={() => retry()} className="mt-4 h-9 rounded-[9px] px-4 text-sm font-semibold">
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </DashboardFrame>
  )
}
