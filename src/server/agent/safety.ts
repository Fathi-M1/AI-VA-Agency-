// Guardrail 1: keyword safety net. Runs on every message BEFORE any model sees it.

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'") // curly apostrophes -> '
    .replace(/\s+/g, " ")

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Returns the matched keyword, or null. A keyword matches as a whole phrase, or when
 *  every one of its words starts a word in the message, in any order ("burning scalp"
 *  matches "my scalp is burning"; "scalp burn" matches it too). Errs on the side of
 *  caution: a false alarm shows the emergency message, a miss could hurt someone. */
export function findEmergencyKeyword(message: string, keywords: string[]): string | null {
  const text = normalize(message)
  const words = text.split(/[^a-z']+/).filter(Boolean)
  for (const k of keywords) {
    const key = normalize(k)
    const re = new RegExp(`(^|[^a-z])${escape(key)}($|[^a-z])`)
    if (re.test(text)) return k
    const parts = key.split(/[^a-z']+/).filter(Boolean)
    if (parts.length > 1 && parts.every((p) => words.some((w) => w.startsWith(p)))) return k
  }
  return null
}
