import Link from "next/link"

/* Review build: only the Dashboard exists yet, so every other nav target lands here. */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-sm">
        <p className="text-[0.71875rem] font-semibold tracking-[0.14em] text-subtle uppercase">
          Not here yet
        </p>
        <h1 className="mt-3 font-serif text-5xl leading-none">Nothing on this page</h1>
        <p className="mt-4 text-base text-muted-foreground">
          This page hasn&apos;t been built yet. Everything in the sidebar works.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium underline underline-offset-3">
          Back to the Dashboard
        </Link>
      </div>
    </main>
  )
}
