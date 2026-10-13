// Landing sections. Pulled parts (all MIT):
// - Industries strip: Magic UI Marquee (https://magicui.design/docs/components/marquee).
// - Problem stats: Tailark Mist "stats" pattern (https://github.com/tailark/blocks), a grid of
//   value + label cells split by hairlines (same block the Dashboard's week tiles use).
// - Team / How it works / Safety: Tailark Mist "features/two" (registry/bases/radix/mist/
//   blocks/features/two.tsx): heading + lead, then cards (a soft visual tile + title + copy).
// - Call to action: Tailark Mist "call-to-action/one" (centred heading + two buttons), on a
//   green brand gradient.
// Copy comes from the PRD. The three statistics are the PRD's cited figures, with sources.
import Link from "next/link"
import {
  BriefcaseIcon,
  CalendarCheckIcon,
  LifeBuoyIcon,
  PhoneIncomingIcon,
  ShieldCheckIcon,
  SirenIcon,
  UserRoundCheckIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Marquee } from "@/components/ui/marquee"

const INDUSTRIES = [
  "Dental clinics",
  "Med spas",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Cleaning",
  "Pest control",
  "Solar",
  "Law firms",
  "Accounting",
  "Salons & spas",
  "Auto repair",
]

export function IndustriesStrip() {
  return (
    <section aria-label="Works for any service business" className="border-y border-border/70 bg-background py-8">
      <p className="mb-5 text-center text-sm text-muted-foreground">One platform for every appointment-driven business</p>
      <div className="relative">
        <Marquee pauseOnHover className="[--duration:38s] [--gap:0.75rem]">
          {INDUSTRIES.map((name) => (
            <span
              key={name}
              className="rounded-full border border-primary/15 bg-[color-mix(in_oklch,var(--primary)_6%,var(--background))] px-4 py-1.5 text-sm font-medium text-foreground/80"
            >
              {name}
            </span>
          ))}
        </Marquee>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-linear-to-r from-background" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-linear-to-l from-background" />
      </div>
    </section>
  )
}

const STATS = [
  { value: "~38%", label: "of calls to small businesses are answered live", source: "411 Locals, 85-business study" },
  { value: "100×", label: "more likely to reach a lead if you reply within 5 minutes, not 30", source: "speed-to-lead data, 2026" },
  { value: "~$1,200", label: "the average missed home-services call is worth", source: "missed-call cost analysis, 2026" },
]

export function ProblemStats() {
  return (
    <section aria-labelledby="problem-h" className="bg-background py-24">
      <div className="mx-auto w-full max-w-[1760px] px-6 sm:px-10 lg:px-14 xl:px-20">
        <h2 id="problem-h" className="max-w-2xl font-serif text-5xl leading-[1] tracking-[-0.01em] text-balance">
          Every missed call is a customer who books somewhere else.
        </h2>
        <div className="mt-12 grid border-y border-border *:py-8 sm:grid-cols-3 sm:divide-x sm:divide-border sm:*:not-first:pl-8">
          {STATS.map((s) => (
            <div key={s.value}>
              <p className="font-serif text-6xl leading-none text-primary">{s.value}</p>
              <p className="mt-3 max-w-[28ch] text-base text-foreground">{s.label}</p>
              <p className="mt-2 text-xs text-subtle">Source: {s.source}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const TEAM = [
  { icon: PhoneIncomingIcon, name: "Receptionist", copy: "Answers every conversation first, finds out what the person needs, and routes it." },
  { icon: CalendarCheckIcon, name: "Booking", copy: "Finds real open times in your calendar and books them while the customer is still there." },
  { icon: BriefcaseIcon, name: "Sales", copy: "Answers new customers from your details, captures the lead, and hands them to Booking." },
  { icon: LifeBuoyIcon, name: "Support", copy: "Answers existing customers from your details and their own record; logs the rest for you." },
  { icon: SlidersHorizontalIcon, name: "Setup", copy: "Your own agent. Interviews you, links your services to your calendar, and switches the team on." },
]

function Tile({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex aspect-[5/3] items-center justify-center rounded-2xl border border-primary/10 bg-linear-to-br from-[color-mix(in_oklch,var(--primary)_14%,var(--background))] to-background">
      {children}
    </div>
  )
}

export function TeamSection() {
  return (
    <section id="team" aria-labelledby="team-h" className="scroll-mt-20 bg-[color-mix(in_oklch,var(--primary)_4%,var(--background))] py-24">
      <div className="mx-auto w-full max-w-[1760px] px-6 sm:px-10 lg:px-14 xl:px-20">
        <h2 id="team-h" className="text-4xl font-semibold tracking-tight">Meet your AI team</h2>
        <p className="mt-4 mb-12 max-w-2xl text-lg text-balance text-muted-foreground">
          Not one chatbot: a team of specialists that hand off to each other, each allowed to do only its own job.
        </p>
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          {TEAM.map(({ icon: Icon, name, copy }) => (
            <div key={name} className="space-y-4">
              <Tile>
                <span className="flex size-12 items-center justify-center rounded-xl bg-background text-primary shadow-sm ring-1 ring-primary/15">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
              </Tile>
              <div>
                <h3 className="text-lg font-semibold">{name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const STEPS = [
  { n: "1", title: "Register your business", copy: "Tell us your name and what kind of business you run. No forms to fight with." },
  { n: "2", title: "Chat with your Setup agent", copy: "It asks about your services, hours and safety rules, and links each service to your calendar." },
  { n: "3", title: "Your AI team goes live", copy: "Customers get answers and real bookings; you get a dashboard of everything that happened." },
]

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-h" className="scroll-mt-20 bg-background py-24">
      <div className="mx-auto w-full max-w-[1760px] px-6 sm:px-10 lg:px-14 xl:px-20">
        <h2 id="how-h" className="text-4xl font-semibold tracking-tight">Set up in about 15 minutes</h2>
        <p className="mt-4 mb-12 max-w-2xl text-lg text-balance text-muted-foreground">
          Adding a business means a conversation, not new software.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="space-y-4">
              <Tile>
                <span className="font-serif text-7xl leading-none text-primary">{s.n}</span>
              </Tile>
              <div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const SAFETY = [
  { icon: SirenIcon, title: "Emergencies come first", copy: "Your emergency words stop the AI before it answers, and your exact emergency instruction is read." },
  { icon: CalendarCheckIcon, title: "Only real times", copy: "Bookings use your live calendar. The AI can't offer a time it didn't find there." },
  { icon: ShieldCheckIcon, title: "No invented answers", copy: "Prices, policies and advice come from you, or a team member follows up." },
  { icon: UserRoundCheckIcon, title: "You stay in charge", copy: "Refunds, disputes and anything risky become escalations on your dashboard." },
]

export function SafetySection() {
  return (
    <section id="safety" aria-labelledby="safety-h" className="scroll-mt-20 bg-[color-mix(in_oklch,var(--primary)_4%,var(--background))] py-24">
      <div className="mx-auto w-full max-w-[1760px] px-6 sm:px-10 lg:px-14 xl:px-20">
        <h2 id="safety-h" className="text-4xl font-semibold tracking-tight">Safe by design</h2>
        <p className="mt-4 mb-12 max-w-2xl text-lg text-balance text-muted-foreground">
          Every agent can only do its own job. The guardrails are built in, not bolted on.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SAFETY.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="rounded-2xl border border-border bg-background p-6">
              <Icon className="size-6 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section className="bg-background px-6 sm:px-10 lg:px-14 xl:px-20 pb-24">
      <div className="relative mx-auto max-w-[1600px] overflow-hidden rounded-3xl bg-[linear-gradient(135deg,var(--primary)_0%,color-mix(in_oklch,var(--primary)_70%,oklch(0.92_0.03_85))_100%)] px-6 py-20 text-primary-foreground">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-[radial-gradient(circle,oklch(0.92_0.03_85/0.35)_0%,transparent_70%)]"
        />
        <div className="relative space-y-6 text-center">
          <h2 className="font-serif text-5xl leading-[1] text-balance">Give your business a front desk that never sleeps.</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-11 rounded-full bg-background px-6 text-foreground hover:bg-background/90">
              <Link href="/setup">Register your business</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 rounded-full border-primary-foreground/40 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link href="/dashboard">Open the demo dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
