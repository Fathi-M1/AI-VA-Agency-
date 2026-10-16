import { Suspense } from "react"
import type { Metadata } from "next"

import { LandingFooter } from "@/components/landing/landing-footer"
import { LandingHeader } from "@/components/landing/landing-header"
import { LandingHero } from "@/components/landing/landing-hero"
import {
  FinalCta,
  HowItWorks,
  IndustriesStrip,
  ProblemStats,
  SafetySection,
  TeamSection,
} from "@/components/landing/landing-sections"
import { SignInNotice } from "@/components/landing/signin-notice"

export const metadata: Metadata = {
  title: "AI VA Agency · An AI front desk for any small business",
  description:
    "A team of AI agents that answers your customers, turns their requests into booking requests you confirm in a tap, and hands you anything that needs a human.",
}

// The public landing page for the platform (the owner app lives under /app).
export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <Suspense fallback={null}>
        <SignInNotice />
      </Suspense>
      <main>
        <LandingHero />
        <IndustriesStrip />
        <ProblemStats />
        <TeamSection />
        <HowItWorks />
        <SafetySection />
        <FinalCta />
      </main>
      <LandingFooter />
    </>
  )
}
