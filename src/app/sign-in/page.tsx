import type { Metadata } from "next"
import Link from "next/link"

import { LogoMark } from "@/components/brand/logo"
import { signInWithGoogle } from "@/app/auth/actions"
import { safeNext } from "@/server/auth-gate"

export const metadata: Metadata = { title: "Sign in" }

// One button: "Continue with Google" (Phase 0 §4). Same page shell as not-found.tsx;
// the button is the project's shadcn Button styling (MIT) at a 48px touch height.
// The "G" mark is Google's standard sign-in logo, unmodified, per Google's branding rules.
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const sp = await searchParams
  const next = safeNext(typeof sp.next === "string" ? sp.next : null)
  const failed = sp.error === "failed"
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link href="/" aria-label="AI VA Agency home" className="inline-flex">
          <LogoMark className="h-8 w-auto" />
        </Link>
        <h1 className="mt-6 font-serif text-4xl leading-tight">Sign in</h1>
        <p className="mt-3 text-base text-muted-foreground">Use the Google account you run your business with.</p>
        {failed ? (
          <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            We couldn&apos;t sign you in. Please try again.
          </p>
        ) : null}
        <form action={signInWithGoogle} className="mt-6">
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 text-base font-medium shadow-xs transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <GoogleG />
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  )
}
