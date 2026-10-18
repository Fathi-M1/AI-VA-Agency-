"use client"

// Blueprint F1: an owner who cancels Google sign-in comes back to the website and sees
// "Sign-in was cancelled." (/?signin=cancelled). Client-side, so the landing page stays static.
import { useSearchParams } from "next/navigation"

export function SignInNotice() {
  const params = useSearchParams()
  if (params.get("signin") !== "cancelled") return null
  return (
    // Just below the fixed header (z-20), above the page, without pushing the hero down.
    <div role="status" className="pointer-events-none fixed inset-x-0 top-20 z-30 flex justify-center px-4">
      <p className="pointer-events-auto rounded-lg border border-border bg-card px-4 py-3 text-base shadow-md">Sign-in was cancelled.</p>
    </div>
  )
}
