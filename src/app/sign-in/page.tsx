import type { Metadata } from "next"
import Link from "next/link"
import { CheckIcon } from "lucide-react"

import { LogoMark, Wordmark } from "@/components/brand/logo"
import { signInWithGoogle } from "@/app/auth/actions"
import { safeNext } from "@/server/auth-gate"

export const metadata: Metadata = { title: "Sign in" }

// Google's standard sign-in "G", unmodified, per Google's branding rules.
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

const POINTS = ["Answers every customer the moment they message", "Turns requests into bookings you confirm in a tap", "Flags anything that needs you, under Needs you"]

// Split screen: a green brand panel (same gradient and voice as the landing hero and the
// workspace) beside the sign-in column. One Google button — no passwords here. On phones
// the panel drops away and the column centers on the paper background.
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const sp = await searchParams
  const next = safeNext(typeof sp.next === "string" ? sp.next : null)
  const failed = sp.error === "failed"

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel (laptop and up) */}
      <section className="relative hidden overflow-hidden bg-[linear-gradient(150deg,oklch(0.36_0.065_156)_0%,var(--primary)_40%,color-mix(in_oklch,var(--primary)_60%,oklch(0.92_0.03_85))_100%)] p-12 text-primary-foreground lg:flex lg:flex-col xl:p-16">
        <div aria-hidden="true" className="pointer-events-none absolute -right-28 -bottom-44 size-[34rem] rounded-full bg-[radial-gradient(circle,oklch(0.92_0.03_85/0.35)_0%,transparent_70%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-36 -left-28 size-[26rem] rounded-full bg-[radial-gradient(circle,oklch(0.75_0.1_150/0.25)_0%,transparent_70%)]" />
        <Link href="/" aria-label="AI VA Agency home" className="relative inline-flex w-fit">
          <Wordmark className="[&_span]:text-primary-foreground" onDark />
        </Link>
        <div className="relative mt-auto max-w-md">
          <h2 className="font-serif text-5xl leading-[0.95] tracking-[-0.015em] text-balance xl:text-6xl">Your front desk, ready when you sign in.</h2>
          <ul className="mt-8 flex flex-col gap-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-base text-primary-foreground/85">
                <span aria-hidden="true" className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 ring-1 ring-primary-foreground/25">
                  <CheckIcon className="size-3" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sign-in column */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" aria-label="AI VA Agency home" className="inline-flex lg:hidden">
            <LogoMark className="h-8 w-auto" />
          </Link>
          <h1 className="mt-8 font-serif text-5xl leading-tight lg:mt-0">Sign in</h1>
          <p className="mt-3 text-base text-muted-foreground">Use the Google account you run your business with.</p>

          {failed ? (
            <p role="alert" className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              We couldn&apos;t sign you in. Please try again.
            </p>
          ) : null}

          <form action={signInWithGoogle} className="mt-8">
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              className="inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 text-base font-medium shadow-sm transition-all hover:-translate-y-px hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:translate-y-0"
            >
              <GoogleG />
              Continue with Google
            </button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">We only use your name and email to sign you in — nothing else.</p>

          <p className="mt-10 text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/app/onboarding" className="font-medium text-primary underline-offset-4 hover:underline">
              Set up your business
            </Link>
          </p>
          <Link href="/" className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            ← Back to the website
          </Link>
        </div>
      </section>
    </main>
  )
}
