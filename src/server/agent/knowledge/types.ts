// Shape of one business's knowledge. Agents read only this; nothing business-specific
// (not even the industry) lives in agent logic, so a dental clinic, an HVAC company or
// a salon is just another config object.

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

export type Service = {
  name: string
  durationMinutes: number
  calcomEventTypeId: number
}

export type BusinessKnowledge = {
  id: string
  name: string
  /** e.g. "Dental clinic", "HVAC contractor", "Hair salon". */
  businessType: string
  /** What this business calls the people it serves (patient, client, customer). */
  customerTerm: { singular: string; plural: string }
  /** IANA timezone used to look up slots, read times back, and book. */
  timeZone: string
  /** Opening hours as "HH:MM-HH:MM" (24 h), or null when closed. */
  hours: Record<Weekday, string | null>
  /** Services that can be booked through the agents. */
  services: Service[]
  /** Owner-approved answers; the agents may state these and nothing else beyond the config. */
  faqs: { question: string; answer: string }[]
  /** Kinds of advice the agents must never give (e.g. "medical or clinical advice"). */
  restrictedAdvice: string[]
  /** Read verbatim when the safety net trips; the agents never run. */
  emergencyLine: string
  /** Words/phrases that trip the safety net (case-insensitive). */
  emergencyKeywords: string[]
}
