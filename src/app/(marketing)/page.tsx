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

export const metadata: Metadata = {
  title: "AI VA Agency · An AI front desk for any small business",
  description:
    "A team of AI agents that answers every conversation, books real appointments into your calendar, and hands you anything that needs a human.",
}

// The public landing page for the platform (the owner app lives under /dashboard).
export default function LandingPage() {
  return (
    <>
      <LandingHeader />
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
