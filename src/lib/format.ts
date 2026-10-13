// Display formats for owner and customer screens (Philippines): prices "₱1,600",
// times "9:00 AM", dates "Mon, Oct 12", durations "2 hr 30 min". Safe on client and server.

export function peso(n: number) {
  return `₱${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function duration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} hr ${m} min` : `${h} hr`
}

/** "14:30" or "14:30:00" -> "2:30 PM" */
export function time12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`
}

/** minutes since midnight <-> "HH:MM" */
export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}
export const fromMinutes = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
export const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const

/** "A", "A and B", "A, B, and C" */
export function listJoin(items: string[]) {
  if (items.length <= 2) return items.join(" and ")
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`
}

/** "1 appointment" / "2 appointments" */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Normalises a PH mobile (09XXXXXXXXX or +639XXXXXXXXX) to 09XXXXXXXXX, or null. */
export function normalizeMobile(raw: string): string | null {
  const s = raw.replace(/[\s-]/g, "")
  if (/^09\d{9}$/.test(s)) return s
  if (/^\+639\d{9}$/.test(s)) return `0${s.slice(3)}`
  return null
}
