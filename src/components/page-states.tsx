"use client"

import { useEffect } from "react"
import { TriangleAlertIcon } from "lucide-react"

import { PageFrame, PageTitle } from "@/components/page-frame"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { primaryBtn } from "@/lib/styles"

/* Generic list-screen skeleton: same frame, same rhythm as the real screens. */
export function ListSkeleton({ title, rows = 6 }: { title: string; rows?: number }) {
  return (
    <PageFrame lead={<PageTitle title={title} />} width="wide">
      <div aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`}>
        <Skeleton className="mb-8 h-10 w-full max-w-md" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="mb-3 h-12 w-full" />
        ))}
      </div>
    </PageFrame>
  )
}

/* Generic error boundary body. Reassures that the AI team keeps working. */
export function RouteError({
  title,
  what,
  error,
  retry,
}: {
  title: string
  what: string
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <PageFrame lead={<PageTitle title={title} />}>
      <Alert className="max-w-xl rounded-xl border-input bg-card px-6 py-5">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertTitle className="text-lg font-semibold">We couldn&apos;t load {what}</AlertTitle>
        <AlertDescription className="text-sm">
          <p>Your AI team is still answering calls and booking. Only this page is affected.</p>
          <Button onClick={() => retry()} className={`mt-4 ${primaryBtn} h-9 px-4`}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </PageFrame>
  )
}
