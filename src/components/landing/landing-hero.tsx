// Hero: Tailark Mist "hero-section/one" (https://github.com/tailark/blocks,
// registry/bases/radix/mist/blocks/hero-section/one/hero-section.tsx), MIT (tailark/blocks).
// Structure kept: two columns, headline + copy + two CTAs on the left, the product shown
// on a skewed, layered frame on the right (inside the grid column, bleeding off the edge). Adapted: green-to-beige brand gradient, our
// copy (from the PRD), a real screenshot of the app, and Magic UI accents (MIT,
// https://magicui.design): Animated Gradient Text (the pill), Shimmer Button (primary
// CTA), Border Beam (the product frame). Colours passed as props: brand green + beige.
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import { ShimmerButton } from "@/components/ui/shimmer-button"

// Brand colours (globals.css): accent green oklch(0.405 0.07 155) on the beige base.
export const GREEN = "oklch(0.405 0.07 155)"
export const GREEN_LIGHT = "oklch(0.72 0.09 150)"
export const BEIGE = "oklch(0.92 0.03 85)"

export function LandingHero() {
  return (
    // Clean beige base with a gentle green tint fading down from the top: text always sits
    // on near-solid beige (high contrast); the stronger green glow is only behind the product.
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,color-mix(in_oklch,var(--primary)_12%,var(--background))_0%,var(--background)_55%)]">
      <div className="mx-auto grid w-full max-w-[1760px] items-center gap-14 px-6 sm:px-10 lg:px-14 xl:px-20 pt-24 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-12 lg:pt-24 lg:pb-20">
        <div className="relative z-10">
          {/* Green glassmorphism pill: frosted glass over a slowly shifting green gradient. */}
          <div className="relative mb-7 inline-flex overflow-hidden rounded-full p-px shadow-[0_8px_30px_-10px_color-mix(in_oklch,var(--primary)_55%,transparent)]">
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-gradient bg-[linear-gradient(110deg,oklch(0.72_0.12_150),oklch(0.45_0.08_155),oklch(0.82_0.09_135),oklch(0.55_0.1_165),oklch(0.72_0.12_150))] bg-size-[300%_100%] [--bg-size:300%]"
            />
            <span className="relative inline-flex items-center gap-2 rounded-full bg-[color-mix(in_oklch,var(--background)_62%,transparent)] px-4 py-1.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] backdrop-blur-xl">
              <span className="absolute inset-0 animate-gradient rounded-full bg-[linear-gradient(110deg,oklch(0.72_0.12_150/0.18),oklch(0.45_0.08_155/0.06),oklch(0.82_0.09_135/0.2),oklch(0.72_0.12_150/0.18))] bg-size-[300%_100%] [--bg-size:300%]" aria-hidden="true" />
              <AnimatedGradientText
                colorFrom="oklch(0.33 0.07 155)"
                colorTo="oklch(0.42 0.08 165)"
                className="relative text-sm font-semibold"
              >
                An AI front desk for any small business
              </AnimatedGradientText>
            </span>
          </div>
          <h1 className="max-w-2xl font-serif text-6xl leading-[0.92] tracking-[-0.015em] text-balance text-foreground sm:text-7xl xl:text-8xl">
            Never miss another customer.
          </h1>
          <p className="mt-7 mb-9 max-w-lg text-lg text-pretty text-foreground/75 sm:text-xl">
            A team of AI agents answers every conversation, books real appointments into your calendar, and hands you
            anything that needs a human. Set up in about 15 minutes.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/setup">
              <ShimmerButton
                background={GREEN}
                shimmerColor={BEIGE}
                className="h-11 gap-2 px-6 text-sm font-medium text-primary-foreground"
              >
                Register your business
                <ArrowRight className="size-4" aria-hidden="true" />
              </ShimmerButton>
            </Link>
            <Button asChild size="lg" variant="outline" className="h-11 rounded-full border-foreground/15 bg-background px-6">
              <Link href="/playground">Talk to a demo business</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-foreground/65">Dental clinics, home services, salons, law firms, auto repair: same platform.</p>
        </div>

        {/* Product, in its own column (Tailark's layered frame), with the green glow behind it. */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-10 rounded-[3rem] bg-[radial-gradient(60%_60%_at_60%_45%,color-mix(in_oklch,var(--primary)_30%,transparent)_0%,transparent_75%)] blur-2xl"
          />
          <div className="perspective-near lg:-mr-14 xl:-mr-20">
          <div className="relative before:absolute before:-inset-x-4 before:top-0 before:bottom-7 before:skew-x-6 before:rounded-[calc(var(--radius)+1rem)] before:border before:border-primary/20 before:bg-primary/5">
            <div className="relative -translate-y-4 skew-x-6 overflow-hidden rounded-(--radius) border border-foreground/10 bg-background shadow-2xl ring-1 shadow-primary/20 ring-foreground/5">
              <Image
                src="/landing/app-conversations-v3.webp"
                alt="The owner app: every conversation your AI team handled, with who it was and what happened"
                width={2420}
                height={1480}
                priority
                className="h-auto w-full"
              />
              <BorderBeam size={260} duration={9} colorFrom={GREEN_LIGHT} colorTo={GREEN} />
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  )
}
