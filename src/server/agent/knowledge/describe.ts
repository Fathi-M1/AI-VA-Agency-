// Plain-text views of a business's knowledge, for agent instructions.
import type { BusinessKnowledge, Weekday } from "./types"

const DAYS: [Weekday, string][] = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
]

export function hoursText(b: BusinessKnowledge) {
  return DAYS.map(([k, label]) => `- ${label}: ${b.hours[k]?.replace("-", " to ") ?? "closed"}`).join("\n")
}

export function servicesText(b: BusinessKnowledge, withIds = false) {
  return b.services
    .map((s) => `- ${s.name} (${s.durationMinutes} min)${withIds ? `, eventTypeId ${s.calcomEventTypeId}` : ""}`)
    .join("\n")
}

export function faqsText(b: BusinessKnowledge) {
  return b.faqs.length
    ? b.faqs.map((f) => `- Q: ${f.question}\n  A: ${f.answer}`).join("\n")
    : "- (none on file)"
}

/** "never give medical or clinical advice" etc., from the business's own list. */
export function restrictedAdviceRule(b: BusinessKnowledge) {
  return b.restrictedAdvice.length ? ` Never give ${b.restrictedAdvice.join(", or ")}.` : ""
}

export function todayText(b: BusinessKnowledge) {
  const today = new Intl.DateTimeFormat("en-US", {
    timeZone: b.timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date())
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: b.timeZone }).format(new Date())
  return `${today} (${ymd})`
}

export function whenText(b: BusinessKnowledge, iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: b.timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}
