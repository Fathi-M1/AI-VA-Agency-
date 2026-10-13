"use client"

// Per-section error state for Today: one failing section doesn't take the screen down.
// (React error boundaries must be class components: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
import * as React from "react"
import { useRouter } from "next/navigation"
import { RotateCwIcon } from "lucide-react"

class Boundary extends React.Component<
  { children: React.ReactNode; onRetry: () => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <button
        type="button"
        onClick={() => {
          this.setState({ failed: false })
          this.props.onRetry()
        }}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-destructive/40 bg-card/70 px-4 text-base text-destructive"
      >
        <RotateCwIcon className="size-4" aria-hidden="true" />
        Couldn&apos;t load this. Tap to try again.
      </button>
    )
  }
}

export function SectionBoundary({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  return <Boundary onRetry={() => router.refresh()}>{children}</Boundary>
}
