// AI VA Agency mark: a "V" stroke flowing into an "A" peak (the owner's logo design),
// redrawn as vector paths and filled with the brand green gradient
// (leaf green -> brand green oklch(0.405 0.07 155) -> deep forest).
import { useId } from "react"

export function LogoMark({
  className = "size-8",
  title,
  onDark = false,
}: {
  className?: string
  title?: string
  /** Light gradient (beige -> pale green) for dark green backgrounds. */
  onDark?: boolean
}) {
  const id = useId().replace(/:/g, "")
  return (
    <svg
      viewBox="0 0 320 210"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={onDark ? "oklch(0.97 0.02 85)" : "oklch(0.78 0.11 145)"} />
          <stop offset="52%" stopColor={onDark ? "oklch(0.88 0.07 140)" : "oklch(0.5 0.09 152)"} />
          <stop offset="100%" stopColor={onDark ? "oklch(0.78 0.11 145)" : "oklch(0.32 0.06 158)"} />
        </linearGradient>
      </defs>
      {/* V: the left stroke, hooking up into the A */}
      <path
        fill={`url(#g-${id})`}
        d="M18 28H76L132 122C138 132 150 130 156 118L160 111L124 172C118 182 108 182 103 172Z"
      />
      {/* A: the peak and its wide right leg */}
      <path
        fill={`url(#g-${id})`}
        d="M168 98L196 42C200 32 210 32 215 42L304 180H244L190 97C184 89 174 90 168 98Z"
      />
    </svg>
  )
}

export function Wordmark({ className = "", onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <LogoMark className="h-7 w-auto" onDark={onDark} />
      <span className="text-base font-semibold tracking-tight">AI VA Agency</span>
    </span>
  )
}
