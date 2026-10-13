// Tailark Mist "footer/one" (https://github.com/tailark/blocks, registry/bases/radix/mist/blocks/
// footer/one.tsx), MIT (tailark/blocks). Structure kept: centred logo, a row of links, small
// copyright line. Adapted: our wordmark and real links; social icons dropped (no accounts).
import Link from "next/link"

import { Wordmark } from "@/components/brand/logo"

const links = [
  { title: "Your AI team", href: "/#team" },
  { title: "How it works", href: "/#how" },
  { title: "Safety", href: "/#safety" },
  { title: "Register", href: "/setup" },
  { title: "Demo dashboard", href: "/dashboard" },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-[color-mix(in_oklch,var(--primary)_5%,var(--background))] py-16">
      <div className="mx-auto w-full max-w-[1760px] px-6 sm:px-10 lg:px-14 xl:px-20">
        <Link href="/" aria-label="go home" className="mx-auto block size-fit">
          <Wordmark />
        </Link>
        <div className="my-8 flex flex-wrap justify-center gap-6">
          {links.map((link) => (
            <Link key={link.title} href={link.href} className="block text-sm text-muted-foreground duration-150 hover:text-primary">
              {link.title}
            </Link>
          ))}
        </div>
        <span className="block text-center text-sm text-muted-foreground">© {new Date().getFullYear()} AI VA Agency</span>
      </div>
    </footer>
  )
}
