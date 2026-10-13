// Calendar colours per service. Services come from the business's own config (any
// industry), so colours are assigned by position from a small restrained palette;
// green stays reserved for the AI marker.
const PALETTE = ["var(--service-1)", "var(--service-2)", "var(--service-3)", "var(--service-4)", "var(--service-5)"]

export type ServiceLegendItem = { name: string; color: string }

/** One legend entry per configured service, plus any booked service no longer configured. */
export function serviceLegend(configured: string[], booked: string[]): ServiceLegendItem[] {
  const names = [...configured, ...booked.filter((b) => !configured.includes(b))]
  return [...new Set(names)].map((name, i) => ({ name, color: PALETTE[i % PALETTE.length] }))
}
