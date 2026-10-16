import Link from "next/link"

// Shown for any page that doesn't exist, including a business the signed-in user isn't a
// member of (security test 3): the same words either way, so it never hints that a
// business exists.
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-sm">
        <p className="text-[0.71875rem] font-semibold tracking-[0.14em] text-subtle uppercase">Not found</p>
        <h1 className="mt-3 font-serif text-5xl leading-none">Nothing on this page</h1>
        <p className="mt-4 text-base text-muted-foreground">Check the link, or go back to your business.</p>
        <Link href="/app" className="mt-6 inline-flex min-h-11 items-center text-base font-medium underline underline-offset-3">
          Go to my business
        </Link>
      </div>
    </main>
  )
}
