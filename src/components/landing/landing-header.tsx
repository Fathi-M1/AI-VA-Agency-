"use client"

// Tailark Mist "hero-section/one" header (https://github.com/tailark/blocks,
// registry/bases/radix/mist/blocks/hero-section/one/header.tsx). License: MIT (tailark/blocks,
// LICENCE.md). Structure kept: fixed nav that blurs on scroll, logo left, centred links,
// actions right, mobile menu toggle. Adapted: our wordmark, links to the page sections,
// "Sign in" + "Register your business" actions, shadcn Button.
import * as React from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Wordmark } from "@/components/brand/logo"

const menuItems = [
  { name: "Your AI team", href: "#team" },
  { name: "How it works", href: "#how" },
  { name: "Safety", href: "#safety" },
]

export function LandingHeader() {
  const [menuState, setMenuState] = React.useState(false)
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className={cn(
          "fixed z-20 w-full transition-all duration-300",
          isScrolled && "border-b border-black/5 bg-background/75 backdrop-blur-lg"
        )}
      >
        <div className="mx-auto w-full max-w-[1760px] px-6 sm:px-10 lg:px-14 xl:px-20">
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0">
            <div className="flex w-full justify-between gap-6 lg:w-auto">
              <Link href="/" aria-label="home" className="flex items-center">
                <Wordmark />
              </Link>
              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="m-auto size-6 duration-200 in-data-[state=active]:scale-0 in-data-[state=active]:rotate-180 in-data-[state=active]:opacity-0" />
                <X className="absolute inset-0 m-auto size-6 scale-0 -rotate-180 opacity-0 duration-200 in-data-[state=active]:scale-100 in-data-[state=active]:rotate-0 in-data-[state=active]:opacity-100" />
              </button>
              <div className="m-auto hidden size-fit lg:block">
                <ul className="flex gap-1">
                  {menuItems.map((item) => (
                    <li key={item.href}>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={item.href} className="text-sm">
                          {item.name}
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border bg-background p-6 shadow-2xl shadow-zinc-300/20 in-data-[state=active]:block md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none lg:in-data-[state=active]:flex">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="block text-muted-foreground duration-150 hover:text-foreground" onClick={() => setMenuState(false)}>
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/app/onboarding">Register your business</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
