// Working-hours helpers shared by server and browser: merge a team's shifts into
// opening intervals, describe them in words, and work out "Open now · closes 7:00 PM".
import { fromMinutes, listJoin, time12, toMinutes, WEEKDAY_LONG } from "./format"

export type ShiftRow = { weekday: number; start_time: string; end_time: string }

/** Per weekday (0 = Sunday): merged [start, end] intervals ("09:00", "12:00"). */
export function mergedIntervals(rows: ShiftRow[]): [string, string][][] {
  return Array.from({ length: 7 }, (_, day) => {
    const ranges = rows
      .filter((h) => h.weekday === day)
      .map((h) => [toMinutes(h.start_time), toMinutes(h.end_time)] as [number, number])
      .sort((a, b) => a[0] - b[0])
    const merged: [number, number][] = []
    for (const r of ranges) {
      const last = merged.at(-1)
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
      else merged.push([...r])
    }
    return merged.map(([s, e]) => [fromMinutes(s), fromMinutes(e)] as [string, string])
  })
}

/** "Monday to Saturday: 9:00 AM – 12:00 PM and 1:00 PM – 6:00 PM. Closed on Sunday." */
export function summarizeHours(perDay: [string, string][][]): string {
  const text = perDay.map((iv) => iv.map(([s, e]) => `${time12(s)} – ${time12(e)}`).join(" and "))
  const groups: { days: number[]; text: string }[] = []
  for (const d of [1, 2, 3, 4, 5, 6, 0]) {
    const last = groups.at(-1)
    if (last && last.text === text[d]) last.days.push(d)
    else groups.push({ days: [d], text: text[d] })
  }
  const label = (days: number[]) =>
    days.length === 1 ? WEEKDAY_LONG[days[0]] : `${WEEKDAY_LONG[days[0]]} to ${WEEKDAY_LONG[days.at(-1)!]}`
  const open = groups.filter((g) => g.text).map((g) => `${label(g.days)}: ${g.text}.`)
  const closed = groups.filter((g) => !g.text).map((g) => label(g.days))
  if (!open.length) return "Our hours aren't set yet. The team will confirm."
  return [...open, closed.length ? `Closed on ${listJoin(closed)}.` : ""].filter(Boolean).join(" ")
}

/** Live status from opening intervals and "now" in the business timezone.
 *  "Open now · closes 7:00 PM" / "Closed now · opens at 1:00 PM" /
 *  "Closed now · opens tomorrow at 10:00 AM" / "Closed today · opens Monday at 9:00 AM" */
export function openStatus(perDay: [string, string][][], now: { weekday: number; minutes: number }) {
  const today = perDay[now.weekday] ?? []
  const current = today.find(([s, e]) => now.minutes >= toMinutes(s) && now.minutes < toMinutes(e))
  if (current) return { open: true, text: `Open now · closes ${time12(current[1])}` }
  const laterToday = today.find(([s]) => toMinutes(s) > now.minutes)
  const lead = today.length ? "Closed now" : "Closed today"
  if (laterToday) return { open: false, text: `${lead} · opens at ${time12(laterToday[0])}` }
  for (let i = 1; i <= 7; i++) {
    const day = (now.weekday + i) % 7
    const first = perDay[day]?.[0]
    if (first) {
      const when = i === 1 ? "tomorrow" : WEEKDAY_LONG[day]
      return { open: false, text: `${lead} · opens ${when} at ${time12(first[0])}` }
    }
  }
  return { open: false, text: "Hours not set yet" }
}
