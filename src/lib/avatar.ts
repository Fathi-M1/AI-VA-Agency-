// Initials + a restrained, low-chroma tint for shadcn Avatar fallbacks.
const AVATAR_TINTS = [
  "bg-[oklch(0.93_0.03_155)] text-[oklch(0.38_0.06_155)]",
  "bg-[oklch(0.94_0.035_75)] text-[oklch(0.45_0.08_70)]",
  "bg-[oklch(0.93_0.025_250)] text-[oklch(0.42_0.06_250)]",
  "bg-[oklch(0.93_0.03_20)] text-[oklch(0.45_0.07_20)]",
  "bg-[oklch(0.92_0.015_85)] text-[oklch(0.42_0.02_85)]",
]

export const avatarTint = (name: string) =>
  AVATAR_TINTS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_TINTS.length]

export const initials = (name: string) =>
  name.startsWith("(") ? "#" : name.split(" ").map((p) => p[0]).slice(0, 2).join("")
