"use client"

// "How your AI team works": the team as a relay of 5 connected nodes (horizontal from
// tablet up, vertical on phones), one description area that follows the tapped /
// hovered / focused node, and "Watch a sample request": the pack's sample_request chip
// travels node to node (~6 s). Connections: Magic UI Animated Beam (MIT,
// https://magicui.design/docs/components/animated-beam). The chip glides with Motion
// (MIT) layout animation. Reduced motion: no animation, a static numbered sequence.
import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { BotIcon, CalendarCheckIcon, MessagesSquareIcon, PhoneIncomingIcon, PlayIcon, UserRoundIcon } from "lucide-react"

import { AnimatedBeam } from "@/components/ui/animated-beam"
import { cn } from "@/lib/utils"

const STEP_MS = 1200

export function TeamRelay({ bookingExample, sampleRequest }: { bookingExample: string; sampleRequest: string }) {
  const nodes = [
    { name: "Receptionist", icon: PhoneIncomingIcon, text: "Greets every customer and figures out what they need." },
    { name: "Booking", icon: CalendarCheckIcon, text: `Asks the right questions, like ${bookingExample}, and builds a booking request.` },
    { name: "Sales/Support", icon: MessagesSquareIcon, text: "Answers questions about your services, prices, hours, and payment, using only your info." },
    { name: "Your assistant", icon: BotIcon, text: "Watches over the team and puts what needs you on your Today screen." },
    { name: "You", icon: UserRoundIcon, text: "You confirm requests with one tap and text your customer from your own phone." },
  ]
  const reduced = useReducedMotion()
  const [active, setActive] = React.useState(0)
  const [playing, setPlaying] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [showSteps, setShowSteps] = React.useState(false)
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([])
  const container = React.useRef<HTMLDivElement>(null)
  const refs = [React.useRef<HTMLDivElement>(null), React.useRef<HTMLDivElement>(null), React.useRef<HTMLDivElement>(null), React.useRef<HTMLDivElement>(null), React.useRef<HTMLDivElement>(null)]

  React.useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const play = () => {
    if (reduced) return setShowSteps(true)
    timers.current.forEach(clearTimeout)
    setPlaying(true)
    setDone(false)
    setActive(0)
    timers.current = nodes.map((_, i) => setTimeout(() => setActive(i), i * STEP_MS))
    timers.current.push(
      setTimeout(() => {
        setPlaying(false)
        setDone(true)
      }, nodes.length * STEP_MS)
    )
  }

  const focusNode = (i: number) => {
    if (playing) return
    setActive(i)
    setDone(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <div ref={container} className="relative">
        <ol className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-2">
          {nodes.map((n, i) => {
            const Icon = n.icon
            const on = i === active
            const lit = playing ? i <= active : on
            return (
              <li key={n.name} className="flex items-center gap-4 md:w-0 md:flex-1 md:flex-col md:gap-2 md:text-center">
                <button
                  type="button"
                  onClick={() => focusNode(i)}
                  onMouseEnter={() => focusNode(i)}
                  onFocus={() => focusNode(i)}
                  aria-pressed={on}
                  className="group flex items-center gap-4 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:flex-col md:gap-2"
                >
                  <span
                    ref={refs[i]}
                    className={cn(
                      "flex size-14 shrink-0 items-center justify-center rounded-full border-2 bg-card transition-colors duration-300",
                      lit ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground group-hover:border-primary/50"
                    )}
                  >
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <span className={cn("text-base leading-tight md:text-sm", on ? "font-semibold" : "text-muted-foreground")}>{n.name}</span>
                </button>
                {playing && on ? (
                  <motion.span
                    layoutId="sample-request"
                    transition={{ type: "spring", stiffness: 260, damping: 30 }}
                    className="rounded-full bg-[color-mix(in_oklch,var(--primary)_12%,var(--card))] px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/25 md:max-w-full md:truncate"
                  >
                    {sampleRequest}
                  </motion.span>
                ) : null}
              </li>
            )
          })}
        </ol>
        {/* Connections between nodes */}
        {nodes.slice(1).map((_, i) =>
          reduced ? null : (
            <AnimatedBeam
              key={i}
              containerRef={container}
              fromRef={refs[i]}
              toRef={refs[i + 1]}
              pathColor="var(--primary)"
              pathOpacity={0.25}
              pathWidth={2}
              gradientStartColor="oklch(0.6 0.12 150)"
              gradientStopColor="oklch(0.45 0.08 155)"
              duration={4}
              delay={i * 0.4}
            />
          )
        )}
      </div>

      <div aria-live="polite" className="min-h-20 border-t border-border/70 pt-4">
        <p className="text-base font-semibold">{done ? "You" : nodes[active].name}</p>
        <p className="mt-1 max-w-[70ch] text-base text-muted-foreground">{done ? "New request on your Today screen" : nodes[active].text}</p>
      </div>

      {showSteps ? (
        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="text-base font-medium">{sampleRequest}</p>
          <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-6 text-base">
            {nodes.map((n) => (
              <li key={n.name}>
                <span className="font-medium">{n.name}:</span> {n.text}
              </li>
            ))}
            <li>New request on your Today screen.</li>
          </ol>
        </div>
      ) : null}

      <button
        type="button"
        onClick={play}
        disabled={playing}
        className="inline-flex min-h-12 items-center gap-2 self-start rounded-full border border-primary/30 bg-card px-5 text-base font-medium text-primary hover:border-primary/60 disabled:opacity-60"
      >
        <PlayIcon className="size-4" aria-hidden="true" />
        Watch a sample request
      </button>
    </div>
  )
}
