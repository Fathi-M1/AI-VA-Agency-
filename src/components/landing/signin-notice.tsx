"use client"

// Blueprint F1: an owner who cancels Google sign-in comes back to the website and sees
// "Sign-in was cancelled." (/?signin=cancelled). Client-side, so the landing page stays static.
import { useSearchParams } from "next/navigation"

export function SignInNotice() {
  const params = useSearchParams()
  if (params.get("signin") !== "cancelled") return null
  return (
    <div role="status" className="mx-auto mt-3 w-full max-w-[1280px] px-4 md:px-6 lg:px-10">
      <p className="rounded-lg border border-border bg-card px-4 py-3 text-base">Sign-in was cancelled.</p>
    </div>
  )
}
