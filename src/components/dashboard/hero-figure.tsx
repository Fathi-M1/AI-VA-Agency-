"use client"

import { useEffect, useState } from "react"
import NumberFlow, { NumberFlowGroup } from "@number-flow/react"

import { usd } from "@/lib/dashboard-data"

// NumberFlow (@number-flow/react), MIT. The Dashboard's one motion: the figure moves
// once from last week's total to this week's, so the motion itself shows the change.
const timing = { duration: 900, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
const currency = { style: "currency", currency: "USD", maximumFractionDigits: 0 } as const
// NumberFlow's element sets line-height: 1 and pads itself by its fade-mask height
// (0.25em top and bottom, measured). Undo both, inline so it beats the element's own
// styles, so the approved hero layout doesn't move by a pixel. The clip keeps rolling
// digits inside the line (+0.05em for the serif's ascenders and the comma's
// descender) so they never drift over the label above or the sentence below.
const keepLayout: React.CSSProperties = {
  lineHeight: "inherit",
  marginBlock: "-0.25em",
  clipPath: "inset(0.2em 0)",
}

export function HeroFigure({ current, previous }: { current: number; previous: number }) {
  const [shown, setShown] = useState(previous)

  useEffect(() => {
    // Start after first paint so the transition is visible. With reduced motion
    // NumberFlow snaps straight to the value instead (respectMotionPreference).
    const id = setTimeout(() => setShown(current), 150)
    return () => clearTimeout(id)
  }, [current])

  const shared = {
    locales: "en-US",
    format: currency,
    transformTiming: timing,
    spinTiming: timing,
    opacityTiming: { duration: 350, easing: "ease-out" },
    trend: 0, // shortest path per digit: no wheel-spin through the numbers
    respectMotionPreference: true,
  }

  return (
    <>
      {/* Screen readers get the final figures once, not the animation. */}
      <span className="sr-only">
        {usd(current)}, up {usd(current - previous)} from last week
      </span>
      <NumberFlowGroup>
        <span aria-hidden="true" className="tabular-nums">
          <NumberFlow value={shown} {...shared} style={keepLayout} />
        </span>
        <span
          aria-hidden="true"
          className="font-sans text-base font-semibold tracking-normal opacity-70 tabular-nums"
        >
          <NumberFlow value={shown - previous} prefix="+" {...shared} style={keepLayout} /> vs last week
        </span>
      </NumberFlowGroup>
    </>
  )
}
